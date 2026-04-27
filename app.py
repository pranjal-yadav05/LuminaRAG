import streamlit as st
import pdfplumber
from openai import OpenAI
import os    
from dotenv import load_dotenv
import numpy as np

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=api_key
)

st.title("RAG PDF")
st.subheader("Upload a PDF file and ask questions about its content")

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

pdf_file = st.file_uploader("Upload a PDF file", type=["pdf"])

@st.cache_data
def create_embeddings(chunks, api_key):
    chunk_embeddings = []
    for chunk in chunks:
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=chunk
        )
        chunk_embeddings.append({
            "text": chunk,
            "embedding": response.data[0].embedding
        })
    
    return chunk_embeddings

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

if pdf_file is not None:
    st.success("PDF file uploaded successfully! Heres the extracted text:")
    
    with pdfplumber.open(pdf_file) as pdf:
        text = ""
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    
    chunk_size = 500
    overlap = 100

    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunks.append(text[i:i+chunk_size])

    chunk_embeddings = create_embeddings(chunks, api_key)
    query = st.chat_input("Ask a question about the PDF")

    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.write(msg["content"])

    if query:
        st.session_state.chat_history.append({"role": "user", "content": query})
        with st.chat_message("user"):
            st.write(query)
        
        # --- Embedding and Retrieval ---
        response = client.embeddings.create(
            model = "text-embedding-3-small",
            input = query
        )
        query_embedding = response.data[0].embedding
        
        scores = []

        for item in chunk_embeddings:
            score = cosine_similarity(query_embedding, item["embedding"])
            scores.append((score, item["text"]))
        
        scores.sort(reverse=True)
        top_chunks = scores[:3]
        context = "\n\n".join([chunk for _, chunk in top_chunks])
        
        # --- Message Memory and LLM ---
        messages = [
            {
                "role": "system", 
                "content": "You are a helpful assistant that answers questions ONLY based on the provided context. If the answer is not in the context, say you don't know."
            },
        ]

        messages.extend(st.session_state.chat_history[-6:])  # Keep last 3 interactions (user + assistant)

        messages.append({"role": "user", "content": f"Context: {context}\n\nQuestion: {query}"})

        response = client.chat.completions.create(
            model = "openai/gpt-4o-mini",
            messages = messages
        )
        
        answer = response.choices[0].message.content
    
        st.session_state.chat_history.append({"role": "assistant", "content": answer})

        with st.chat_message("assistant"):
            st.write(answer)



