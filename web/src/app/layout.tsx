import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUCA Mod Library",
  description: "Upload and share custom nodes for LUCA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white min-h-screen`}
      >
        {/* Navigation */}
        <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <Link href="/" className="flex items-center">
                  <span className="text-2xl font-bold text-blue-500">LUCA</span>
                  <span className="ml-2 text-gray-300">Mod Library</span>
                </Link>
                <div className="hidden md:block ml-10">
                  <div className="flex items-baseline space-x-4">
                    <Link
                      href="/mods"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Browse Mods
                    </Link>
                    <Link
                      href="/mods/upload"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Upload
                    </Link>
                    <Link
                      href="/docs"
                      className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Documentation
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href="/mods/upload"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Upload Mod
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="bg-gray-800 border-t border-gray-700 mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="text-gray-400 text-sm">
                © 2024 LUCA Project. Open source under MIT License.
              </div>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="https://github.com/CROUDZ/LUCA" className="text-gray-400 hover:text-white">
                  GitHub
                </a>
                <Link href="/docs" className="text-gray-400 hover:text-white">
                  Docs
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
