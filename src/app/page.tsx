// ==================================================
// app/page.tsx  (Dashboard principale + LearningPath)
// ==================================================
'use client';

import Goban from '@/components/goban/goban';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AfterPlayCtx, Setup } from '@/hooks/use-goban-state';
import SgfUploader from '@/lib/parser-sgf-meta';
import { Flame, Star, CalendarCheck } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

// ⚠️ Da sostituire con dati reali via API o context una volta disponibile il backend
const mockData = {
  xp: 320,
  nextLevelXP: 500,
  streak: 7,
  dailyGoalCurrent: 3,
  dailyGoalTarget: 5,
};

export default function Dashboard() {
  const progress = Math.min(100, (mockData.xp / mockData.nextLevelXP) * 100);

  // Placeholder percorso (6 lezioni + riepilogo)
  const pathLevels = useMemo(
    () => [
      { id: 1, name: 'Cattura base' },
      { id: 2, name: 'Salvataggio gruppi' },
      { id: 3, name: 'Libertà & Atari' },
      { id: 4, name: 'Ko e regole speciali' },
      { id: 5, name: 'Shape fondamentali' },
      { id: 6, name: 'Tesuji introduttivi' },
      { id: 7, name: 'Riepilogo modulo', isReview: true },
    ],
    [],
  );

  const captureSetup: Setup = useMemo(
    () => ({
      size: 9,
      stones: [
        { r: 4, c: 4, color: 2 }, // bianca centro
        { r: 3, c: 4, color: 1 }, // nere adiacenti
        { r: 4, c: 3, color: 1 },
        { r: 5, c: 4, color: 1 },
      ],
      toPlay: 1, // muove Nero
    }),
    [],
  );

  const [capStatus, setCapStatus] = useState<'idle' | 'ok' | 'err'>('idle');
  const [capRev, setCapRev] = useState(0);
  const onAfterPlay = ({ board, lastMove }: AfterPlayCtx) => {
    if (!lastMove) return;
    if (board[4][4] === 0 && lastMove.player === 1) setCapStatus('ok');
    else setCapStatus('err');
  };
  const resetCap = () => {
    setCapStatus('idle');
    setCapRev((v) => v + 1);
  };

  return (
    <div className="flex flex-col items-center px-6 py-8 bg-[url('/kuro.svg')] bg-no-repeat bg-[length:180px] bg-[top_1rem_left_1rem] min-h-screen">
      {/* Header */}
      <header className="mb-8 flex w-full max-w-4xl items-center justify-between">
        <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
          Benvenuto su GoLingo!
        </h1>
        <Link
          href="/profile"
          className="rounded-2xl border border-stone-200 bg-white/50 px-4 py-2 text-sm shadow-sm backdrop-blur transition hover:shadow-md"
        >
          Profilo
        </Link>
      </header>

      {/* Stat Grid */}
      <main className="grid w-full max-w-4xl grid-cols-1 sm:grid-cols-3 gap-6">
        {/* XP Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Star className="size-5" /> XP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">{mockData.xp}</p>
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <span
                style={{ width: `${progress}%` }}
                className="absolute left-0 top-0 h-full rounded-full bg-amber-400 transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Mancano {mockData.nextLevelXP - mockData.xp} XP al prossimo
              livello
            </p>
          </CardContent>
        </Card>

        {/* Streak Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Flame className="size-5" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">{mockData.streak} 🔥</p>
            <p className="text-sm text-stone-600">
              Continua a studiare per mantenere la serie!
            </p>
          </CardContent>
        </Card>

        {/* Daily Goal Card */}
        <Card className="rounded-2xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <CalendarCheck className="size-5" /> Obiettivo Giornaliero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-3xl font-bold">
              {mockData.dailyGoalCurrent}/{mockData.dailyGoalTarget}
            </p>
            <p className="text-sm text-stone-600">
              Completa {mockData.dailyGoalTarget - mockData.dailyGoalCurrent}{' '}
              lezioni per oggi
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Learning Path Placeholder */}
      <section className="mt-16 w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Percorso</h2>
          <Link
            href="/module/theory"
            className="rounded-xl border border-stone-200 bg-white/50 px-3 py-1.5 text-sm shadow-sm backdrop-blur transition hover:shadow-md"
          >
            Teoria ↗
          </Link>
        </header>

        <ol className="relative flex flex-col gap-10 pl-6 before:absolute before:left-[14px] before:top-1 before:h-[95%] before:w-[2px] before:bg-amber-300 dark:before:bg-amber-500">
          {pathLevels.map((level) => (
            <li key={level.id} className="relative flex items-center gap-4">
              {/* Nodo cerchio */}
              <span
                className={`absolute -left-6 top-1/2 -translate-y-1/2 inline-flex size-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                  level.isReview ? 'bg-cyan-500' : 'bg-amber-400'
                }`}
              >
                {level.id}
              </span>

              {/* Titolo */}
              <span
                className={`text-lg font-medium mx-6 ${
                  level.isReview
                    ? 'italic text-cyan-600 dark:text-cyan-400'
                    : ''
                }`}
              >
                {level.name}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <SgfUploader />
      <Goban sgfMoves=";B[qd];W[dp];B[pq];W[cc];B[fq];W[po];B[nq];W[od];B[qf];W[qq];B[qp];W[pp];B[rq];W[qr];B[op];W[pr];B[oq];W[rp];B[qo];W[ro];B[qn];W[rn];B[qm];W[ld];B[oc];W[nc];B[pc];W[hq];B[hp];W[ip];B[gp];W[jq];B[dq];W[cq];B[cp];W[bq];B[bp];W[do];B[br];W[eq];B[dr];W[er];B[cr];W[fr];B[ep];W[gq];B[eo];W[dn];B[en];W[dm];B[rm];W[rr];B[em];W[dl];B[el];W[dk];B[io];W[jo];B[jn];W[kn];B[in];W[ko];B[nn];W[ek];B[gl];W[fd];B[de];W[dd];B[fe];W[ee];B[ef];W[ed];B[ce];W[ff];B[eg];W[ge];B[di];W[gk];B[hk];W[gj];B[cj];W[hj];B[ij];W[ii];B[ik];W[ji];B[nb];W[mc];B[mb];W[lb];B[ne];W[mf];B[nf];W[mg];B[nh];W[ng];B[og];W[ni];B[mh];W[oh];B[oi];W[ph];B[pi];W[qh];B[qi];W[ri];B[rj];W[rh];B[mi];W[nj];B[mj];W[qj];B[pj];W[qk];B[pk];W[rk];B[sj];W[pl];B[nk];W[ql];B[rf];W[nl];B[ml];W[nm];B[mm];W[sm];B[sl];W[sn];B[pm];W[rl];B[ol];W[lk];B[km];W[lh];B[bl];W[no];B[oo];W[mn];B[om];W[of];B[pg];W[oe];B[pd];W[bm];B[bn];W[bk];B[cm];W[bj];B[bi];W[ck];B[bd];W[ch];B[ci];W[cg];B[fi];W[bc];B[bf];W[gh];B[fg];W[gg];B[ac];W[ab];B[ad];W[bo];B[ao];W[co];B[aq];W[bb];B[bh];W[ma];B[ob];W[lq];B[pf];W[nd];B[kj];W[jj];B[ki];W[kh];B[jk];W[kk];B[mk];W[hl];B[hm];W[fp];B[fk];W[fj];B[fl];W[ei];B[eh];W[ej];B[fo];W[fh];B[lp];W[mp];B[ln];W[lo];B[lr];W[kr];B[mq];W[kp];B[ms];W[lm];B[ll];W[kl];B[jm];W[pe];B[qe];W[or];B[nr];W[ks];B[ln];W[mo];B[na];W[la];B[am];W[cn];B[cl];W[ai];B[ah];W[ak];B[al];W[os];B[ns];W[ls];B[li];W[fq];B[es];W[fs];B[ds];W[cd];B[df];W[aj];B[mr];W[np];B[on];W[lm];B[dh];W[ln];B[dj];W[gi];B[jl])" />

      {/* esempio cattura */}
      {/* Esercizio: Cattura base */}
      <div className="mt-10 w-full max-w-2xl">
        <div className="mb-2 flex items-center gap-3">
          <span
            className={
              capStatus === 'ok'
                ? 'text-green-600'
                : capStatus === 'err'
                  ? 'text-red-600'
                  : 'text-stone-600'
            }
          >
            {capStatus === 'ok'
              ? 'Corretto: cattura eseguita.'
              : capStatus === 'err'
                ? 'Errore: devi catturare la pietra centrale.'
                : 'Esercizio: cattura la pietra bianca al centro.'}
          </span>
          <button
            onClick={resetCap}
            className="rounded border px-3 py-1 text-sm hover:bg-stone-50"
          >
            Reset
          </button>
        </div>

        <Goban
          key={capRev}
          sgfMoves=""
          BOARD_SIZE={9}
          showMoveTree={false}
          exerciseOptions={{ setup: captureSetup, onAfterPlay }}
        />
      </div>

      {/* Footer */}
      <footer className="mt-auto flex w-full max-w-4xl items-center justify-between py-6 text-xs text-stone-500">
        <span>
          &copy; {new Date().getFullYear()} GoLingo • Tutti i diritti riservati
        </span>

        <a
          href="https://golingo.dev/feedback"
          className="hover:underline hover:underline-offset-4"
        >
          Feedback
        </a>
      </footer>
    </div>
  );
}
