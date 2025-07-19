/**
 * Toolbar con:
 *   • info turno & prigionieri
 *   • toggle Libertà / Coordinate
 *   • comandi di navigazione (<<  <  >  >>)
 *
 * Nessuna logica di gioco vive qui: tutto viene passato via props.
 */

'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';

interface ToolbarProps {
  prisoners: { black: number; white: number };
  playerTurn: string; // 'Bianco' o 'Nero'

  /* toggle state */
  showLiberties: boolean;
  setShowLiberties: (v: boolean) => void;
  showCoordinates: boolean;
  setShowCoordinates: (v: boolean) => void;

  /* navigation callbacks */
  toStart: () => void;
  back: () => void;
  forward: () => void;
  toEnd: () => void;

  /* disabled flags (calcolati dal contenitore) */
  disableBack: boolean;
  disableForward: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  prisoners,
  playerTurn,
  showLiberties,
  setShowLiberties,
  showCoordinates,
  setShowCoordinates,
  toStart,
  back,
  forward,
  toEnd,
  disableBack,
  disableForward,
}) => {
  return (
    <Card className="w-fit p-4 mb-4 shadow-lg">
      <CardContent className="flex flex-col gap-4 p-0">
        {/* turno + prigionieri ------------------------------------------------- */}
        <div className="text-sm">
          <span className="font-semibold">Turno:&nbsp;{playerTurn}</span>
          &nbsp;•&nbsp;Prigionieri&nbsp;→&nbsp;
          <span>N&nbsp;{prisoners.black}</span>
          &nbsp;/&nbsp;
          <span>B&nbsp;{prisoners.white}</span>
        </div>

        {/* toggle ------------------------------------------------------------- */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Switch
              checked={showLiberties}
              onCheckedChange={setShowLiberties}
              id="toggle-liberties"
            />
            Libertà
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Switch
              checked={showCoordinates}
              onCheckedChange={setShowCoordinates}
              id="toggle-coordinates"
            />
            Coordinate
          </label>
        </div>

        {/* nav --------------------------------------------------------------- */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={toStart}
            disabled={disableBack}
            aria-label="Vai all'inizio"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={back}
            disabled={disableBack}
            aria-label="Mossa precedente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={forward}
            disabled={disableForward}
            aria-label="Mossa successiva"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            onClick={toEnd}
            disabled={disableForward}
            aria-label="Vai alla fine"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Toolbar;
