import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { auth } from '@/auth';
import { SessionProvider } from '@/components/SessionProvider';
import { SiteHeader } from '@/components/SiteHeader';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LUCA Mod Library',
  description: 'Upload and share custom nodes for LUCA',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white min-h-screen`}
      >
        <SessionProvider session={session}>
          <SiteHeader />

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
                  <a
                    href="https://github.com/CROUDZ/LUCA"
                    className="text-gray-400 hover:text-white"
                  >
                    GitHub
                  </a>
                  <Link href="/docs" className="text-gray-400 hover:text-white">
                    Docs
                  </Link>
                </div>
              </div>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
