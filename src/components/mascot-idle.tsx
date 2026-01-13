'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

type MascotIdleProps = {
  className?: string;
  speechId?: number;
  speechText?: string | null;
};

const MIN_SPEAK_MS = 2000;
const MAX_SPEAK_MS = 6000;
const MS_PER_CHAR = 80;

export default function MascotIdle({
  className = '',
  speechId,
  speechText,
}: MascotIdleProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!speechText) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    setBubbleText(speechText);
    setIsSpeaking(true);

    const durationMs = Math.min(
      MAX_SPEAK_MS,
      Math.max(MIN_SPEAK_MS, speechText.length * MS_PER_CHAR),
    );

    timerRef.current = window.setTimeout(() => {
      setIsSpeaking(false);
      setBubbleText(null);
    }, durationMs);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [speechId, speechText]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return (
    <div className={`flex justify-center ${className}`.trim()}>
      <div className="relative flex items-center">
        <div className="flex items-center justify-center bg-white/90 px-5 py-3">
          <Image
            src={isSpeaking ? '/Speaking.gif' : '/Idle.gif'}
            alt="Mascotte GoLingo"
            width={96}
            height={96}
            sizes="96px"
            className="h-24 w-24 object-contain"
          />
        </div>
        {bubbleText ? (
          <div className="absolute left-full top-[45%] ml-3 -translate-y-1/2">
            <div className="relative max-w-[220px] rounded-2xl border border-stone-900 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm shadow-emerald-100">
              <span className="absolute -left-1 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-l border-stone-900 bg-white" />
              {bubbleText}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
