'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useMemo, useState } from 'react';

function buildInitials(name?: string | null, fallback?: string | null) {
  const base = name?.trim() || fallback || '?';
  const parts = base.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const userLabel = session?.user?.name || session?.user?.email || 'Utilisateur';
  const initials = useMemo(
    () => buildInitials(session?.user?.name, session?.user?.email),
    [session?.user?.name, session?.user?.email]
  );

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut({ callbackUrl: '/' });
    } finally {
      setSigningOut(false);
    }
  };

  return (
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
          <div className="flex items-center gap-4">
            <Link
              href="/mods/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Upload Mod
            </Link>
            {status === 'loading' ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-700 animate-pulse" aria-hidden />
                <div className="h-10 w-32 rounded-md bg-gray-700 animate-pulse" aria-hidden />
              </div>
            ) : session ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-md border border-gray-700 hover:border-gray-500 hover:bg-gray-700 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                    {initials}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white truncate max-w-40">
                      {userLabel}
                    </div>
                    <div
                      className={`text-xs ${session.user.verified ? 'text-green-400' : 'text-yellow-300'}`}
                    >
                      {session.user.verified ? 'Email vérifié' : 'Vérification requise'}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm px-3 py-2 rounded-md border border-gray-600 hover:border-gray-400 hover:text-white transition-colors disabled:opacity-60"
                >
                  {signingOut ? 'Déconnexion...' : 'Déconnexion'}
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm px-3 py-2 rounded-md border border-gray-600 hover:border-gray-400 hover:text-white transition-colors"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
