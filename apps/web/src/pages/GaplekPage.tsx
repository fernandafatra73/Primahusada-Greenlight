import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyMove,
  applyPass,
  canPlay,
  dealRound,
  handPips,
  legalMoves,
  openEnds,
  roundResult,
  tileKey,
  type GameState,
  type Move,
  type PlacedTile,
  type RoundResult,
  type Tile,
} from '../lib/gaplek.ts';
import { analysePosition, boardInsight, chooseMove } from '../lib/gaplekAi.ts';
import '../components/ui/ui.css';

const HUMAN = 0;
const PLAYER_NAMES = ['Anda', 'Komputer 1', 'Komputer 2', 'Komputer 3'] as const;
const COMPUTER_DELAY_MS = 700;

/** Titik domino merah, seperti set gaplek yang biasa dipakai. */
const PIP_COLOR = '#c81e1e';
const FELT = '#0f5132';
const TABLE_EDGE = '#6b4a2b';

/** Pola titik domino untuk angka 0–6, disusun di kisi 3×3. */
const PIP_LAYOUT: Record<number, readonly number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function GaplekPage() {
  const [game, setGame] = useState<GameState>(() => dealRound());
  const [scores, setScores] = useState<readonly number[]>([0, 0, 0, 0]);
  const [result, setResult] = useState<RoundResult | null>(null);
  const [log, setLog] = useState<readonly string[]>([]);
  const [showAnalysis, setShowAnalysis] = useState(true);

  const ends = openEnds(game);
  const myMoves = useMemo(() => (game.turn === HUMAN ? legalMoves(game) : []), [game]);
  const analysis = useMemo(
    () => (game.turn === HUMAN && !result ? analysePosition(game) : null),
    [game, result],
  );
  const insight = useMemo(() => boardInsight(game, HUMAN), [game]);
  const best = analysis?.ranked[0] ?? null;

  const addLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 40));
  }, []);

  const finishRound = useCallback(
    (state: GameState) => {
      const outcome = roundResult(state);
      if (!outcome) return false;
      setResult(outcome);
      setScores((prev) => prev.map((s, i) => (i === outcome.winner ? s + outcome.points : s)));
      addLog(
        outcome.ending === 'habis'
          ? `${PLAYER_NAMES[outcome.winner]} kartunya habis dan dapat ${outcome.points} poin.`
          : `Buntu. ${PLAYER_NAMES[outcome.winner]} sisa matanya paling kecil, dapat ${outcome.points} poin.`,
      );
      return true;
    },
    [addLog],
  );

  /** Giliran komputer dijalankan lewat timer supaya terlihat seperti berpikir
   * sebentar, bukan langsung melompat. */
  useEffect(() => {
    if (result || game.turn === HUMAN) return;

    // Langkah dihitung di dalam timer, bukan di dalam updater setState:
    // updater bisa dijalankan dua kali oleh React dan pencatatan log ikut
    // ganda kalau ditaruh di sana.
    const timer = setTimeout(() => {
      const move = chooseMove(game);
      const name = PLAYER_NAMES[game.turn];

      if (!move) {
        const passed = applyPass(game);
        addLog(`${name} pas.`);
        setGame(passed);
        finishRound(passed);
        return;
      }

      const tile = game.hands[game.turn]?.[move.tileIndex] as Tile;
      const next = applyMove(game, move);
      addLog(`${name} pasang ${tile.a}|${tile.b} di ${move.side}.`);
      setGame(next);
      finishRound(next);
    }, COMPUTER_DELAY_MS);

    return () => clearTimeout(timer);
  }, [game, result, addLog, finishRound]);

  function play(move: Move) {
    if (game.turn !== HUMAN || result) return;
    const tile = game.hands[HUMAN]?.[move.tileIndex] as Tile;
    addLog(`Anda pasang ${tile.a}|${tile.b} di ${move.side}.`);
    const next = applyMove(game, move);
    setGame(next);
    finishRound(next);
  }

  function pass() {
    if (game.turn !== HUMAN || result || canPlay(game)) return;
    addLog('Anda pas.');
    const next = applyPass(game);
    setGame(next);
    finishRound(next);
  }

  function newRound() {
    setGame(dealRound());
    setResult(null);
    setLog([]);
  }

  function resetAll() {
    setScores([0, 0, 0, 0]);
    newRound();
  }

  const myHand = game.hands[HUMAN] ?? [];
  const myTurn = game.turn === HUMAN && !result;
  const mustPass = myTurn && myMoves.length === 0;

  return (
    <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 32rem', minWidth: '20rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button type="button" className="btn btn--sm btn--primary" onClick={newRound}>
            🀄 Ronde Baru
          </button>
          <button type="button" className="btn btn--sm btn--secondary" onClick={resetAll}>
            ♻️ Ulang Skor
          </button>
          <button
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => setShowAnalysis((v) => !v)}
          >
            {showAnalysis ? '🙈 Sembunyikan Analisa' : '🔍 Tampilkan Analisa'}
          </button>
        </div>

        <div
          style={{
            background: FELT,
            backgroundImage: 'radial-gradient(circle at 50% 45%, #14683f 0%, #0b3d26 100%)',
            border: `10px solid ${TABLE_EDGE}`,
            borderRadius: '18px',
            padding: '0.9rem',
            marginBottom: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gridTemplateRows: 'auto 1fr auto',
            gridTemplateAreas: '"tl atas tr" "kiri tengah kanan" "bl bawah br"',
            gap: '0.6rem',
            minHeight: '22rem',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ gridArea: 'atas', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <Seat player={2} scores={scores} hands={game.hands} turn={game.turn} result={result} />
            <FaceDownRow count={game.hands[2]?.length ?? 0} vertical={false} />
          </div>

          <div style={{ gridArea: 'kiri', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Seat player={1} scores={scores} hands={game.hands} turn={game.turn} result={result} />
            <FaceDownRow count={game.hands[1]?.length ?? 0} vertical />
          </div>

          <div style={{ gridArea: 'tengah', display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto' }}>
            {game.placed.length === 0 ? (
              <p style={{ color: '#bbf7d0', margin: 0, textAlign: 'center' }}>
                Papan masih kosong — pemegang balak 6|6 yang jalan pertama.
              </p>
            ) : (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                {game.placed.map((placed, i) => (
                  <DominoChain key={`${placed[0]}-${placed[1]}-${i}`} placed={placed} />
                ))}
              </div>
            )}
          </div>

          <div style={{ gridArea: 'kanan', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FaceDownRow count={game.hands[3]?.length ?? 0} vertical />
            <Seat player={3} scores={scores} hands={game.hands} turn={game.turn} result={result} />
          </div>

          <div style={{ gridArea: 'bawah', display: 'flex', justifyContent: 'center' }}>
            <Seat player={HUMAN} scores={scores} hands={game.hands} turn={game.turn} result={result} />
          </div>
        </div>

        {ends.length === 2 && (
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#475569' }}>
            Ujung terbuka: <strong>{ends[0]}</strong> (kiri) dan <strong>{ends[1]}</strong> (kanan)
            · sisa mata kartu Anda <strong>{handPips(myHand)}</strong>
          </p>
        )}

        <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>
          Kartu Anda ({myHand.length})
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {myHand.map((tile, tileIndex) => (
            <HandTile
              key={`${tileKey(tile)}-${tileIndex}`}
              tile={tile}
              moves={myMoves.filter((m) => m.tileIndex === tileIndex)}
              recommended={best?.move.tileIndex === tileIndex}
              disabled={!myTurn}
              onPlay={play}
            />
          ))}
          {myHand.length === 0 && <span style={{ color: '#64748b' }}>Kartu habis.</span>}
        </div>

        {mustPass && (
          <button type="button" className="btn btn--danger" onClick={pass}>
            Tidak ada yang cocok — Pas
          </button>
        )}

        {result && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: result.winner === HUMAN ? '#dcfce7' : '#fee2e2',
              border: `1px solid ${result.winner === HUMAN ? '#86efac' : '#fca5a5'}`,
              marginTop: '0.75rem',
            }}
          >
            <strong>
              {result.ending === 'buntu' ? 'Buntu — ' : ''}
              {PLAYER_NAMES[result.winner]} menang ronde ini, +{result.points} poin.
            </strong>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: '#334155' }}>
              Sisa mata:{' '}
              {result.remainingPips.map((p, i) => `${PLAYER_NAMES[i]} ${p}`).join(' · ')}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: '1 1 19rem', minWidth: '17rem' }}>
        {showAnalysis && (
          <AnalysisPanel analysis={analysis} insight={insight} myTurn={myTurn} />
        )}

        <h3 style={{ margin: '1rem 0 0.4rem', fontSize: '0.95rem' }}>Jalannya Permainan</h3>
        <div
          style={{
            maxHeight: '14rem',
            overflowY: 'auto',
            fontSize: '0.85rem',
            lineHeight: 1.7,
            color: '#334155',
          }}
        >
          {log.length === 0 ? (
            <p style={{ margin: 0, color: '#64748b' }}>Belum ada langkah.</p>
          ) : (
            log.map((line, i) => <div key={`${i}-${line}`}>• {line}</div>)
          )}
        </div>
      </div>
    </div>
  );
}

/** Satu dudukan pemain di tepi meja. */
function Seat({
  player,
  scores,
  hands,
  turn,
  result,
}: {
  readonly player: number;
  readonly scores: readonly number[];
  readonly hands: readonly (readonly Tile[])[];
  readonly turn: number;
  readonly result: RoundResult | null;
}) {
  const active = turn === player && !result;
  return (
    <div
      style={{
        padding: '0.3rem 0.55rem',
        borderRadius: '8px',
        background: active ? '#fef3c7' : 'rgba(255,255,255,0.9)',
        border: `2px solid ${active ? '#f2c14e' : 'rgba(0,0,0,0.25)'}`,
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{PLAYER_NAMES[player]}</div>
      <div style={{ fontSize: '0.72rem', color: '#475569' }}>
        Skor <strong>{scores[player]}</strong> · {hands[player]?.length ?? 0} kartu
      </div>
    </div>
  );
}

/** Kartu lawan ditampilkan tertutup — hanya jumlahnya yang terlihat. */
function FaceDownRow({ count, vertical }: { readonly count: number; readonly vertical: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: '3px',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{
            width: vertical ? '30px' : '17px',
            height: vertical ? '17px' : '30px',
            borderRadius: '3px',
            background: 'linear-gradient(145deg, #7f1d1d, #b91c1c)',
            border: '1px solid #450a0a',
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}

function AnalysisPanel({
  analysis,
  insight,
  myTurn,
}: {
  readonly analysis: ReturnType<typeof analysePosition> | null;
  readonly insight: ReturnType<typeof boardInsight>;
  readonly myTurn: boolean;
}) {
  return (
    <div
      style={{
        padding: '0.75rem 0.9rem',
        borderRadius: '10px',
        background: '#f8fafc',
        border: '1px solid var(--color-border)',
      }}
    >
      <h3 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>🔍 Analisa Sebelum Jalan</h3>

      {!myTurn && <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Menunggu giliran Anda.</p>}

      {myTurn && analysis && !analysis.available && (
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>{analysis.note}</p>
      )}

      {myTurn && analysis?.available && (
        <>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
            Ujung papan <strong>{insight.ends.join(' dan ')}</strong> · {insight.unseenCount} kartu
            belum kelihatan · sisa mata Anda <strong>{insight.myPips}</strong>
          </p>

          {analysis.ranked.slice(0, 3).map((entry, i) => (
            <div
              key={`${entry.move.tileIndex}-${entry.move.side}`}
              style={{
                padding: '0.5rem 0.6rem',
                marginBottom: '0.4rem',
                borderRadius: '8px',
                background: i === 0 ? '#ecfdf5' : '#fff',
                border: `1px solid ${i === 0 ? '#6ee7b7' : 'var(--color-border)'}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                {i === 0 ? '✅ Disarankan: ' : `${i + 1}. `}
                {entry.tile.a}|{entry.tile.b} di {entry.move.side}
              </div>
              <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#334155' }}>
                {entry.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function HandTile({
  tile,
  moves,
  recommended,
  disabled,
  onPlay,
}: {
  readonly tile: Tile;
  readonly moves: readonly Move[];
  readonly recommended: boolean;
  readonly disabled: boolean;
  readonly onPlay: (move: Move) => void;
}) {
  const playable = moves.length > 0 && !disabled;

  return (
    <div style={{ textAlign: 'center' }}>
      <Domino a={tile.a} b={tile.b} dimmed={!playable} highlighted={recommended && playable} />
      <div style={{ display: 'flex', gap: '0.2rem', justifyContent: 'center', marginTop: '0.25rem' }}>
        {moves.map((move) => (
          <button
            key={move.side}
            type="button"
            className="btn btn--sm btn--secondary"
            onClick={() => onPlay(move)}
            disabled={disabled}
            style={{ padding: '0.1rem 0.4rem', fontSize: '0.72rem' }}
          >
            {move.side}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Satu kartu domino berdiri, dipakai untuk kartu di tangan. */
function Domino({
  a,
  b,
  dimmed = false,
  highlighted = false,
}: {
  readonly a: number;
  readonly b: number;
  readonly dimmed?: boolean;
  readonly highlighted?: boolean;
}) {
  return (
    <div
      style={{
        width: '46px',
        background: '#fffdf5',
        border: `2px solid ${highlighted ? '#059669' : '#334155'}`,
        borderRadius: '6px',
        opacity: dimmed ? 0.45 : 1,
        boxShadow: highlighted ? '0 0 0 3px rgba(5,150,105,0.25)' : '0 1px 3px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}
    >
      <PipFace value={a} />
      <div style={{ height: '2px', background: '#334155' }} />
      <PipFace value={b} />
    </div>
  );
}

/** Kartu yang sudah terpasang digambar mendatar mengikuti arah rantai. */
function DominoChain({ placed }: { readonly placed: PlacedTile }) {
  return (
    <div
      style={{
        display: 'flex',
        background: '#fffdf5',
        border: '2px solid #334155',
        borderRadius: '5px',
        overflow: 'hidden',
      }}
    >
      <PipFace value={placed[0]} size={30} />
      <div style={{ width: '2px', background: '#334155' }} />
      <PipFace value={placed[1]} size={30} />
    </div>
  );
}

function PipFace({ value, size = 42 }: { readonly value: number; readonly size?: number }) {
  const filled = new Set(PIP_LAYOUT[value] ?? []);
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        padding: '3px',
        boxSizing: 'border-box',
      }}
      aria-label={String(value)}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {filled.has(i) && (
            <span
              style={{
                width: `${Math.max(4, size * 0.18)}px`,
                height: `${Math.max(4, size * 0.18)}px`,
                borderRadius: '50%',
                background: PIP_COLOR,
                display: 'block',
              }}
            />
          )}
        </span>
      ))}
    </div>
  );
}
