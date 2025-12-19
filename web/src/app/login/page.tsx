'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/mods';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationLink, setVerificationLink] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setVerificationLink(null);

    try {
      if (mode === 'login') {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError(result.error);
        } else if (result?.ok) {
          router.push(callbackUrl);
        } else {
          setError('Connexion impossible');
        }
      } else {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Impossible de créer le compte');
        }

        setMessage(data.message || 'Compte créé. Vérifiez vos emails.');
        if (data.verificationUrl) {
          setVerificationLink(data.verificationUrl as string);
        }
        setMode('login');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setVerificationLink(null);
    try {
      const response = await fetch('/api/auth/request-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Impossible d'envoyer l'email");
      }
      setMessage(data.message || 'Email envoyé. Consultez votre boîte');
      if (data.verificationUrl) {
        setVerificationLink(data.verificationUrl as string);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-sky-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-50" aria-hidden>
        <div className="absolute -left-40 top-10 w-96 h-96 bg-sky-500 blur-3xl" />
        <div className="absolute right-0 bottom-0 w-120 h-120 bg-cyan-400 blur-[140px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div className="text-white space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-sky-200 hover:text-white"
          >
            <span aria-hidden>←</span> Retour au site
          </Link>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80 mb-3">
              Accès sécurisé
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              Connecte-toi à la librairie de mods LUCA
            </h1>
          </div>
          <p className="text-lg text-slate-200/80 max-w-xl">
            Authentification email + mot de passe, sessions sécurisées et vérification d&apos;email
            pour protéger vos créations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['Sessions sécurisées', 'Email vérifié', 'Accès upload', 'Dashboard clair'].map(
              (item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3 backdrop-blur"
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/20 text-sky-200">
                    ✓
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center">
              <span className="text-sky-200 font-semibold">LU</span>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-200/70">Espace membre</p>
              <p className="text-lg font-semibold text-white">Authentification</p>
            </div>
          </div>

          <div className="flex rounded-lg bg-slate-900/70 p-1 border border-white/5 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-white/10 text-white' : 'text-slate-300'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'register' ? 'bg-white/10 text-white' : 'text-slate-300'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-400/50 bg-red-500/10 px-4 py-3 text-red-100 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-emerald-100 text-sm">
              {message}
              {verificationLink && (
                <div className="mt-2 text-xs text-emerald-200 break-all">
                  Lien de test :{' '}
                  <a className="underline" href={verificationLink}>
                    {verificationLink}
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-sm text-slate-200" htmlFor="name">
                  Nom complet
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm text-slate-200" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <label htmlFor="password">Mot de passe</label>
                <span className="text-slate-400">8 caractères minimum</span>
              </div>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-sky-500 to-cyan-400 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Patientez...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 text-sm text-slate-300 space-y-2">
              <p className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-sky-400" />
                Besoin d&apos;un lien de vérification ?
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || !email}
                className="text-sky-200 hover:text-white underline disabled:opacity-60"
              >
                Renvoyer le lien à {email || 'votre email'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
