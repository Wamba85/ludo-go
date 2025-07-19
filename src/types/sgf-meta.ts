export interface SgfMeta {
  /* ---- root ---- */
  fileFormat?: number; // FF
  gameId?: number; // GM
  charset?: string; // CA
  application?: string; // AP
  style?: number; // ST
  boardSize?: number; // SZ

  /* ---- game-info ---- */
  annotation?: string; // AN
  blackRank?: string; // BR
  blackTeam?: string; // BT
  copyright?: string; // CP
  date?: string; // DT
  event?: string; // EV
  gameName?: string; // GN
  gameComment?: string; // GC
  opening?: string; // ON
  overtime?: string; // OT
  blackPlayer?: string; // PB
  place?: string; // PC
  whitePlayer?: string; // PW
  result?: string; // RE
  round?: string; // RO
  rules?: string; // RU
  source?: string; // SO
  timeLimit?: number; // TM  (seconds)
  user?: string; // US
  whiteRank?: string; // WR
  whiteTeam?: string; // WT

  /* ---- timing (prima occorrenza) ---- */
  blackTimeLeft?: number; // BL
  whiteTimeLeft?: number; // WL
  blackOtStones?: number; // OB
  whiteOtStones?: number; // OW
}

/* l’intero record ------------------------------------------------------- */
export interface SgfRecord {
  meta: SgfMeta; // metadati “human friendly”
  sgf: string; // contenuto completo della partita
}
