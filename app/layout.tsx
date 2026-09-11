import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import ThemeToggle from "@/components/ThemeToggle";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "Rubics — Meet Upadhyay",
    template: "%s — Rubics",
  },
  description:
    "An interactive 3D Rubik's cube and a lab of liquid-glass UI components, built by Meet Upadhyay.",
  authors: [{ name: "Meet Upadhyay" }],
};

export const viewport: Viewport = {
  themeColor: "#a855f7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <ThemeProvider>
          <Nav />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="container" style={{ padding: "2rem 0 3rem" }}>
            <p className="text-link" style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              © {new Date().getFullYear()} Meet Upadhyay · Built with Next.js &amp; Three.js
            </p>
          </footer>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
