'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/components/auth/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  BookText,
  Check,
  Lock,
  Home,
  UserRound,
  MoreHorizontal,
  Crown,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

type StepStatus = 'done' | 'active' | 'locked';
type Step = {
  id: number;
  title: string;
  status: StepStatus;
  href?: string;
};

export default function Dashboard() {
  const { logout } = useAuth();

  const steps = useMemo(
    () =>
      [
        {
          id: 1,
          title: 'Libertà',
          status: 'done' as StepStatus,
          href: '/module/rules/exercises',
        },
        {
          id: 2,
          title: 'Cattura 1',
          status: 'done' as StepStatus,
          href: '/module/capture/exercises',
        },
        {
          id: 3,
          title: 'Salvataggio 1',
          status: 'done' as StepStatus,
          href: '/module/salvataggio-1/exercises',
        },
        {
          id: 4,
          title: 'Cattura 2',
          status: 'active' as StepStatus,
          href: '/module/capture-2/exercises',
        },
        { id: 5, title: 'Finale semplice', status: 'locked' as StepStatus },
        { id: 6, title: 'Counting', status: 'locked' as StepStatus },
      ] satisfies Step[],
    [],
  );

  const unitTitle = 'Sezione 1 · Unità 1';
  const lessonTitle = 'Le basi';

  const nav = [
    { label: 'Learn', icon: Home, href: '/dashboard', active: true },
    { label: 'Profile', icon: UserRound, href: '/profile' },
    { label: 'More', icon: MoreHorizontal, href: '/more' },
  ];

  return (
    <RequireAuth
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">
          Caricamento dashboard...
        </div>
      }
    >
      <div className="min-h-screen bg-[#f7fbff]">
        <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6 lg:px-8">
          {/* Sidebar */}
          <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-56 flex-shrink-0 flex-col rounded-3xl bg-white/90 p-4 shadow-lg shadow-emerald-100 lg:flex">
            <div className="mb-6 flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-[#78d64b] text-white font-bold shadow-md">
                Go
              </div>
              <span className="text-lg font-semibold text-stone-800">
                Lingo
              </span>
            </div>
            <nav className="flex flex-col gap-2">
              {nav.map((item) => {
                const Icon = item.icon;
                const activeCls = item.active
                  ? 'bg-[#e3f7d7] text-[#2f8d0c] shadow-inner shadow-emerald-100'
                  : 'text-stone-600 hover:bg-stone-50';
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-2 font-medium transition ${activeCls}`}
                  >
                    <Icon className="size-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto space-y-2 text-sm text-stone-500">
              <button
                onClick={logout}
                className="w-full rounded-2xl border border-stone-200 px-3 py-2 text-left font-medium text-stone-700 transition hover:bg-stone-50"
              >
                Esci
              </button>
              <div className="rounded-2xl border border-stone-100 bg-stone-50 px-3 py-2">
                Sincronizzato con Firebase Auth
              </div>
            </div>
          </aside>

          {/* Main column */}
          <main className="flex-1">
            {/* Unit header */}
            <div className="mb-6 flex items-center justify-between rounded-3xl bg-[#7adf36] px-4 py-3 text-white shadow-lg shadow-emerald-200">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 rounded-2xl bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  <ArrowLeft className="size-4" />
                  {unitTitle}
                </span>
                <div className="text-lg font-semibold leading-tight">
                  {lessonTitle}
                </div>
              </div>
              <Link
                href="/module/theory"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#2e7c0a] shadow-md shadow-emerald-200 transition hover:translate-y-[1px]"
              >
                <BookText className="size-4" />
                Regole
              </Link>
            </div>

            {/* Path */}
            <section className="relative flex flex-col items-center gap-7 rounded-3xl bg-white/90 px-6 py-10 shadow-lg shadow-emerald-100">
              <div className="pointer-events-none absolute left-1/2 top-8 h-[85%] w-1 -translate-x-1/2 bg-gradient-to-b from-[#d4f0b2] via-[#b5e489] to-transparent" />
              {steps.map((step, idx) => {
                const isLast = idx === steps.length - 1;
                const color =
                  step.status === 'done'
                    ? 'bg-emerald-500 shadow-emerald-200'
                    : step.status === 'active'
                      ? 'bg-sky-500 shadow-sky-200'
                      : 'bg-stone-300 text-stone-600 shadow-stone-200';
                const Icon = step.status === 'locked' ? Lock : Check;
                const content = (
                  <>
                    <div
                      className={`flex size-14 items-center justify-center rounded-full text-white shadow-lg ${color}`}
                    >
                      <Icon className="size-6" />
                    </div>
                    <div className="text-center text-sm font-semibold text-stone-700">
                      {step.title}
                    </div>
                    {!isLast && (
                      <div className="h-6 w-1 rounded-full bg-[#d4f0b2]" />
                    )}
                  </>
                );

                if (step.href && step.status !== 'locked') {
                  return (
                    <Link
                      key={step.id}
                      href={step.href}
                      aria-label={`Apri esercizi ${step.title}`}
                      className="relative z-10 flex w-full max-w-sm flex-col items-center gap-2 transition hover:-translate-y-0.5"
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <div
                    key={step.id}
                    className="relative z-10 flex w-full max-w-sm flex-col items-center gap-2"
                  >
                    {content}
                  </div>
                );
              })}
            </section>
          </main>

          {/* Right rail */}
          <aside className="hidden w-[320px] flex-shrink-0 flex-col gap-4 lg:flex">
            <Card className="rounded-3xl shadow-md shadow-emerald-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm uppercase text-emerald-700">
                  Super GoLingo
                </CardTitle>
                <p className="text-sm text-stone-600">
                  Fase di test, pratica personalizzata, leghe leggendarie.
                </p>
              </CardHeader>
              <CardContent>
                <p>In costruzione...</p>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-md shadow-emerald-100">
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>Lega Smeraldo</span>
                  <span className="text-xs font-semibold text-sky-600">
                    Vedi classifica
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-700">
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                  <Crown className="size-5 text-amber-500" />
                  Sei 7º con 554 XP questa settimana.
                </div>
                <div className="text-xs text-stone-500">
                  Placeholder lega — sincronizza quando avremo i dati reali.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl shadow-md shadow-emerald-100">
              <CardHeader className="pb-1">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span>Placeholder Missioni giornaliere</span>
                  <span className="text-xs font-semibold text-amber-600">
                    Vedi tutto
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: 'Guadagna 50 XP', value: 50, total: 50 },
                  { label: 'Completa 2 lezioni perfette', value: 1, total: 2 },
                  { label: 'Fai 20 combo bonus', value: 0, total: 20 },
                ].map((q) => (
                  <div key={q.label} className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-700">{q.label}</span>
                      <span className="text-xs text-stone-500">
                        {q.value}/{q.total}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{
                          width: `${Math.min(100, (q.value / q.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </RequireAuth>
  );
}
