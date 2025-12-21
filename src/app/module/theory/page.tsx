'use client';

import { RequireAuth } from '@/components/auth/require-auth';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function TheoryPage() {
  const rules = [
    {
      id: 1,
      title: 'Obiettivo del Gioco',
      description:
        'Conquistare più territorio possibile posizionando le tue pietre sul goban.',
      img: '/theory/goal.svg',
    },
    {
      id: 2,
      title: 'Libertà (Dame)',
      description:
        'Ogni pietra ha libertà pari agli spazi vuoti ortogonali ad essa. Le catene condividono le libertà.',
      img: '/theory/liberties.svg',
    },
    {
      id: 3,
      title: 'Cattura',
      description:
        'Quando tutte le libertà di una catena avversaria vengono occupate, le pietre vengono rimosse dal goban.',
      img: '/theory/capture.svg',
    },
    {
      id: 4,
      title: 'Regola del Ko',
      description:
        'È vietato ripetere la stessa posizione immediatamente. Bisogna giocare altrove prima di riprendere il ko.',
      img: '/theory/ko.svg',
    },
    {
      id: 5,
      title: 'Fine Partita',
      description:
        'La partita termina quando entrambi i giocatori passano consecutivamente. Si conta territorio + prigionieri.',
      img: '/theory/end.svg',
    },
  ];

  return (
    <RequireAuth
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-stone-500">
          Caricamento...
        </div>
      }
    >
      <div className="flex flex-col items-center px-6 py-8 bg-stone-50 min-h-screen">
        {/* Header */}
        <header className="mb-10 flex w-full max-w-4xl items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 rounded-xl border border-stone-200 bg-white/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur hover:shadow-md"
          >
            <ArrowLeft className="size-4" />
            Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Regole Base del Go
          </h1>
          <div />
        </header>

        {/* Rules */}
        <main className="grid w-full max-w-4xl grid-cols-1 gap-8">
          {rules.map((rule) => (
            <article
              key={rule.id}
              className="relative overflow-hidden rounded-3xl bg-white shadow-md ring-1 ring-stone-100 backdrop-blur"
            >
              <div className="flex flex-col sm:flex-row items-center">
                <div className="relative w-full sm:w-1/2 aspect-video">
                  <Image
                    src={rule.img}
                    alt={rule.title}
                    layout="fill"
                    className="object-contain p-4"
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <h2 className="mb-2 text-2xl font-semibold">{rule.title}</h2>
                  <p className="text-stone-700">{rule.description}</p>
                </div>
              </div>
            </article>
          ))}
        </main>

        {/* CTA */}
        <footer className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/lesson/1"
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-lg font-semibold text-white shadow-md transition hover:scale-105 hover:shadow-lg"
          >
            <PlayCircle className="size-5" />
            Inizia gli esercizi
          </Link>
          <span className="text-xs text-stone-500">
            Suggerimento: puoi tornare a questa pagina in qualsiasi momento dal
            menu.
          </span>
        </footer>
      </div>
    </RequireAuth>
  );
}
