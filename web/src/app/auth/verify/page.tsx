'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification en cours...');

  useEffect(() => {
    const verify = async () => {
      if (!token || !email) {
        setStatus('error');
        setMessage('Lien incomplet : token ou email manquant');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Lien invalide');
        }
        setStatus('success');
        setMessage('Email vérifié ! Vous pouvez vous connecter.');
        setTimeout(() => router.push('/login'), 1400);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : "Impossible de vérifier l'email");
      }
    };

    void verify();
  }, [token, email, router]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-sky-900 text-white flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur shadow-2xl text-center space-y-4">
        <div
          className={`mx-auto h-14 w-14 rounded-full flex items-center justify-center ${
            status === 'loading'
              ? 'bg-sky-500/20'
              : status === 'success'
                ? 'bg-emerald-500/20'
                : 'bg-red-500/20'
          }`}
        >
          {status === 'loading' && (
            <div
              className="h-6 w-6 border-2 border-white/30 border-t-white rounded-full animate-spin"
              aria-label="Chargement"
            />
          )}
          {status === 'success' && <span className="text-2xl">✓</span>}
          {status === 'error' && <span className="text-2xl">!</span>}
        </div>
        <h1 className="text-2xl font-semibold">Validation de l&apos;email</h1>
        <p className="text-slate-200/80">{message}</p>
        {status === 'error' && (
          <div className="space-y-2 text-sm text-slate-300">
            <p>Vérifiez que le lien est correct ou demandez un nouveau mail de vérification.</p>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent('/mods')}`}
              className="text-sky-200 underline"
            >
              Revenir à la connexion
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
