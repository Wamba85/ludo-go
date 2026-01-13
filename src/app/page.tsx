'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { Chrome, Lock, Mail, MoveRight, Sparkles } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { user, initializing, login, signup, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tips = useMemo(
    () => [
      'Accedi per salvare i tuoi progressi e riprendere dal punto in cui sei rimasto.',
      'Puoi usare sia Google che email/password: scegli quello che preferisci.',
      'Tutti gli esercizi e le board restano sincronizzate sul tuo account.',
    ],
    [],
  );

  useEffect(() => {
    if (!initializing && user) {
      router.replace('/dashboard');
    }
  }, [initializing, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await signup(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Impossibile completare la richiesta. Riprova.',
      );
    } finally {
      setPending(false);
    }
  };

  const handleGoogle = async () => {
    setPending(true);
    setError(null);
    try {
      await loginWithGoogle();
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Accesso Google non riuscito. Riprova.',
      );
    } finally {
      setPending(false);
    }
  };

  const readyToRender = !initializing || Boolean(user);
  if (!readyToRender) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">
        Preparazione login...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f7fbff]">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-10 h-64 w-64 rounded-full bg-[#d4f0b2] blur-3xl" />
        <div className="absolute bottom-20 right-0 h-72 w-72 rounded-full bg-[#cfe4ff] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-10">
        <header className="mb-10 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[#78d64b] text-white shadow-lg shadow-emerald-200">
            <Sparkles className="size-6" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-stone-500">
              GoLingo
            </p>
            <h1 className="text-3xl font-semibold text-stone-900">
              Accedi per iniziare a giocare
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-3xl border border-emerald-100 bg-white/90 shadow-xl shadow-emerald-200 backdrop-blur">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-semibold text-stone-900">
                  {mode === 'login'
                    ? 'Bentornato! Effettua l’accesso'
                    : 'Crea il tuo account'}
                </CardTitle>
                <span className="rounded-full bg-[#e3f7d7] px-3 py-1 text-xs font-semibold text-[#2f8d0c]">
                  Firebase Auth
                </span>
              </div>
              <p className="text-sm text-stone-600">
                Usa email e password oppure entra con Google.
              </p>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <label className="block space-y-1 text-sm font-medium text-stone-700">
                  <span className="flex items-center gap-2">
                    <Mail className="size-4 text-[#2f8d0c]" />
                    Email
                  </span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white/70 px-3 py-2 text-sm shadow-inner shadow-emerald-100 outline-none transition focus:border-[#7adf36] focus:ring-2 focus:ring-[#b5e489]"
                    placeholder="tu@email.com"
                    autoComplete="email"
                  />
                </label>

                <label className="block space-y-1 text-sm font-medium text-stone-700">
                  <span className="flex items-center gap-2">
                    <Lock className="size-4 text-[#2f8d0c]" />
                    Password
                  </span>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 bg-white/70 px-3 py-2 text-sm shadow-inner shadow-emerald-100 outline-none transition focus:border-[#7adf36] focus:ring-2 focus:ring-[#b5e489]"
                    placeholder="••••••••"
                    autoComplete={
                      mode === 'login' ? 'current-password' : 'new-password'
                    }
                  />
                </label>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2 rounded-full bg-[#e3f7d7] p-1 text-xs font-semibold text-[#2f8d0c]">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className={`rounded-full px-3 py-1 transition ${
                        mode === 'login' ? 'bg-white shadow-sm' : ''
                      }`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className={`rounded-full px-3 py-1 transition ${
                        mode === 'signup' ? 'bg-white shadow-sm' : ''
                      }`}
                    >
                      Registrati
                    </button>
                  </div>

                  <button
                    type="button"
                    className="text-xs font-medium text-[#2f8d0c] underline underline-offset-4"
                    onClick={() =>
                      setMode((m) => (m === 'login' ? 'signup' : 'login'))
                    }
                  >
                    {mode === 'login'
                      ? 'Nuovo? Crea un account'
                      : 'Hai già un account? Accedi'}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={pending}
                  className="w-full rounded-xl bg-[#7adf36] text-white shadow-md shadow-emerald-200 transition hover:bg-[#6ccf2f]"
                >
                  {pending
                    ? 'Attendi...'
                    : mode === 'login'
                      ? 'Accedi'
                      : 'Crea account'}
                  <MoveRight className="ml-2 size-4" />
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-dashed border-stone-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase text-stone-400">
                    <span className="bg-white px-2">oppure</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={handleGoogle}
                  className="w-full rounded-xl border-stone-200 bg-white text-stone-800 hover:bg-stone-50"
                >
                  <Chrome className="mr-2 size-4" />
                  Continua con Google
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-emerald-100 bg-white/90 shadow-xl shadow-emerald-200 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-stone-900">
                Perché accedere?
              </CardTitle>
              <p className="text-sm text-stone-600">
                Un unico account per tutte le lezioni, esercizi interattivi e
                board salvate.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-3 text-sm text-stone-700 shadow-inner shadow-emerald-100"
                >
                  <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full bg-[#e3f7d7] text-[11px] font-semibold text-[#2f8d0c]">
                    {idx + 1}
                  </span>
                  <p>{tip}</p>
                </div>
              ))}
              <div className="rounded-2xl border border-stone-200 bg-white/70 p-4 text-xs text-stone-500">
                Puoi cambiare metodo di accesso in qualsiasi momento: Firebase
                gestisce in modo sicuro autenticazione e sessione.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
