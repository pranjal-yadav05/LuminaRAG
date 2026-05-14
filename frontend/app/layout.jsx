
import { Geist, Geist_Mono } from "next/font/google";
import { Playfair_Display } from "next/font/google";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata = {
  title: "Lumina RAG",
  description: "Extract insights from your PDFs with AI",
  generator: "v0.app",
  icons: {
    icon: "/lumina-favicon.png",
    apple: "/lumina-favicon.png",
  },
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" className={`bg-background ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var stored = localStorage.getItem('lumina-dark-mode');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var dark = stored !== null ? stored === 'true' : prefersDark;
              if (dark) document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
