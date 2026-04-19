import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CarDealr",
  description: "Find the best car deals",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 min-h-screen text-white`}>
        <Providers>
          <header className="border-b border-zinc-800 sticky top-0 z-50 bg-zinc-950/90 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-bold text-xl tracking-tight">
                Car<span className="text-emerald-400">Dealr</span>
              </Link>
              <nav className="flex gap-6 text-sm">
                <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
                  Search
                </Link>
                <Link href="/compare" className="text-zinc-400 hover:text-white transition-colors">
                  Compare
                </Link>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
