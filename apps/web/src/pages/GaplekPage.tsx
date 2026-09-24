import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LOSING_SCORE,
  applyMove,
  applyPass,
  applyRoundScores,
  canPlay,
  dealRound,
  handPips,
  legalMoves,
  matchStanding,
  openEnds,
  roundResult,
  tileKey,
  type GameState,
  type Move,
  type PlacedTile,
  type RoundResult,
  type Side,
  type Tile,
} from '../lib/gaplek.ts';
import { analysePosition, boardInsight, chooseMove } from '../lib/gaplekAi.ts';
import {
  ROW_H,
  ROW_W,
  chainWidths,
  isDoubleTile,
  layoutSnake,
  rowCount,
} from '../lib/gaplekLayout.ts';
import '../components/ui/ui.css';

const HUMAN = 0;
const DEFAULT_NAMES = ['Anda', 'Komputer 1', 'Komputer 2', 'Komputer 3'] as const;
const COMPUTER_DELAY_MS = 700;

/** Titik domino merah, seperti set gaplek yang biasa dipakai. */
const PIP_COLOR = '#b00000';
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
  const [names, setNames] = useState<readonly string[]>([...DEFAULT_NAMES]);
  /** Kartu yang sedang ditarik atau dipilih untuk dijatuhkan ke meja. */
  const [heldIndex, setHeldIndex] = useState<number | null>(null);

  const ends = openEnds(game);
  const myMoves = useMemo(() => (game.turn === HUMAN ? legalMoves(game) : []), [game]);
  const analysis = useMemo(
    () => (game.turn === HUMAN && !result ? analysePosition(game) : null),
    [game, result],
  );
  const insight = useMemo(() => boardInsight(game, HUMAN), [game]);
  const best = analysis?.ranked[0] ?? null;

  const nameOf = useCallback(
    (player: number) => names[player]?.trim() || (DEFAULT_NAMES[player] as string),
    [names],
  );

  const addLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 40));
  }, []);

  const finishRound = useCallback(
    (state: GameState) => {
      const outcome = roundResult(state);
      if (!outcome) return false;
      setResult(outcome);
      setScores((prev) => applyRoundScores(prev, outcome));
      addLog(
        outcome.ending === 'habis'
          ? `${nameOf(outcome.winner)} kartunya habis — pemain lain menambah sisa matanya.`
          : `Buntu. Sisa mata ${nameOf(outcome.winner)} paling kecil, jadi dia bebas nilai.`,
      );
      return true;
    },
    [addLog, nameOf],
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
      const name = nameOf(game.turn);

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
  }, [game, result, addLog, finishRound, nameOf]);

  function play(move: Move) {
    if (game.turn !== HUMAN || result) return;
    setHeldIndex(null);
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
    setHeldIndex(null);
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

  /** Langkah untuk kartu yang sedang dipegang ke sisi tertentu, bila sah. */
  function heldMoveFor(side: Side): Move | null {
    if (heldIndex === null) return null;
    return myMoves.find((m) => m.tileIndex === heldIndex && m.side === side) ?? null;
  }

  function dropAt(side: Side) {
    const move = heldMoveFor(side);
    if (move) play(move);
  }

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
            <Seat player={2} name={nameOf(2)} scores={scores} hands={game.hands} turn={game.turn} result={result} />
            <FaceDownRow count={game.hands[2]?.length ?? 0} vertical={false} />
          </div>

          <div style={{ gridArea: 'kiri', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Seat player={1} name={nameOf(1)} scores={scores} hands={game.hands} turn={game.turn} result={result} />
            <FaceDownRow count={game.hands[1]?.length ?? 0} vertical />
          </div>

          <div style={{ gridArea: 'tengah', position: 'relative', minHeight: '19rem' }}>
            <ChainSnake
              placed={game.placed}
              leftLabel={ends.length === 2 ? String(ends[0]) : '6|6'}
              rightLabel={ends.length === 2 ? String(ends[1]) : '6|6'}
              acceptsLeft={heldMoveFor('kiri') !== null}
              acceptsRight={heldMoveFor('kanan') !== null}
              onDropLeft={() => dropAt('kiri')}
              onDropRight={() => dropAt('kanan')}
            />
          </div>

          <div style={{ gridArea: 'kanan', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FaceDownRow count={game.hands[3]?.length ?? 0} vertical />
            <Seat player={3} name={nameOf(3)} scores={scores} hands={game.hands} turn={game.turn} result={result} />
          </div>

          <div style={{ gridArea: 'bawah', display: 'flex', justifyContent: 'center' }}>
            <Seat player={HUMAN} name={nameOf(HUMAN)} scores={scores} hands={game.hands} turn={game.turn} result={result} />
          </div>
        </div>

        {ends.length === 2 && (
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.85rem', color: '#475569' }}>
            Ujung terbuka: <strong>{ends[0]}</strong> (kiri) dan <strong>{ends[1]}</strong> (kanan)
            · sisa mata kartu Anda <strong>{handPips(myHand)}</strong>
          </p>
        )}

        <h3 style={{ margin: '0 0 0.2rem', fontSize: '0.95rem' }}>
          Kartu Anda ({myHand.length})
        </h3>
        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
          Tarik kartu ke ujung meja yang angkanya cocok — atau klik kartunya dulu, lalu klik
          ujung yang dituju.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {myHand.map((tile, tileIndex) => (
            <HandTile
              key={`${tileKey(tile)}-${tileIndex}`}
              tile={tile}
              playable={myTurn && myMoves.some((m) => m.tileIndex === tileIndex)}
              held={heldIndex === tileIndex}
              recommended={best?.move.tileIndex === tileIndex}
              onPick={() => setHeldIndex(tileIndex)}
              onToggle={() => setHeldIndex(heldIndex === tileIndex ? null : tileIndex)}
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
              {nameOf(result.winner)} menang ronde ini dan bebas nilai.
            </strong>
            <div style={{ fontSize: '0.85rem', marginTop: '0.3rem', color: '#334155' }}>
              Sisa mata ronde ini:{' '}
              {result.remainingPips.map((p, i) => `${nameOf(i)} ${p}`).join(' · ')}
            </div>
          </div>
        )}

        {result && (
          <RevealedHands hands={game.hands} nameOf={nameOf} winner={result.winner} />
        )}
      </div>

      <div style={{ flex: '1 1 19rem', minWidth: '17rem' }}>
        <ScoreTable
          scores={scores}
          names={names}
          onRename={(player, value) =>
            setNames((prev) => prev.map((n, i) => (i === player ? value : n)))
          }
          nameOf={nameOf}
          lastResult={result}
        />

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

/** Daftar nilai keempat peserta. Nama bisa diubah langsung di tabel.
 *
 * Nilai adalah beban: pemenang ronde tidak menambah apa pun, yang lain
 * menambah sisa mata kartunya. Melewati ambang berarti kalah, dan yang
 * nilainya paling kecil jadi juara. */
function ScoreTable({
  scores,
  names,
  onRename,
  nameOf,
  lastResult,
}: {
  readonly scores: readonly number[];
  readonly names: readonly string[];
  readonly onRename: (player: number, value: string) => void;
  readonly nameOf: (player: number) => string;
  readonly lastResult: RoundResult | null;
}) {
  const standing = matchStanding(scores);

  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>
        Nilai Peserta <span style={{ fontWeight: 400, color: '#64748b' }}>(lewat {LOSING_SCORE} kalah)</span>
      </h3>
      <table className="table table--compact" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Nama</th>
            <th style={{ width: '4.5rem', textAlign: 'right' }}>Nilai</th>
            <th style={{ width: '6rem' }}>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((score, player) => {
            const out = score > LOSING_SCORE;
            const champion = standing.finished && standing.champion === player;
            return (
              <tr key={player} style={{ background: champion ? '#dcfce7' : out ? '#fee2e2' : undefined }}>
                <td>
                  <input
                    value={names[player] ?? ''}
                    onChange={(e) => onRename(player, e.target.value)}
                    aria-label={`Nama pemain ${player + 1}`}
                    placeholder={nameOf(player)}
                    style={{
                      width: '100%',
                      border: '1px solid var(--color-border)',
                      borderRadius: '5px',
                      padding: '0.15rem 0.35rem',
                      font: 'inherit',
                    }}
                  />
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{score}</td>
                <td style={{ fontSize: '0.78rem' }}>
                  {champion ? '🏆 Juara' : out ? 'Kalah' : lastResult?.winner === player ? 'Menang ronde' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {standing.finished && (
        <p style={{ margin: '0.4rem 0 0', fontWeight: 700, color: '#166534' }}>
          Permainan selesai — {nameOf(standing.champion)} juara dengan nilai terkecil (
          {scores[standing.champion]}).
        </p>
      )}
    </div>
  );
}

/** Kartu semua pemain dibuka saat ronde selesai, supaya sisa mata masing-masing
 * bisa diperiksa. */
function RevealedHands({
  hands,
  nameOf,
  winner,
}: {
  readonly hands: readonly (readonly Tile[])[];
  readonly nameOf: (player: number) => string;
  readonly winner: number;
}) {
  return (
    <div style={{ marginTop: '0.75rem' }}>
      <h3 style={{ margin: '0 0 0.4rem', fontSize: '0.95rem' }}>Kartu Dibuka</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.9rem' }}>
        {hands.map((hand, player) => (
          <div key={player}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              {nameOf(player)}
              {player === winner && ' 🏅'}
              <span style={{ fontWeight: 400, color: '#64748b' }}>
                {' '}· sisa {handPips(hand)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {hand.length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>habis</span>
              ) : (
                hand.map((tile, i) => (
                  <Domino key={`${tileKey(tile)}-${i}`} a={tile.a} b={tile.b} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Satu dudukan pemain di tepi meja. */
function Seat({
  player,
  name,
  scores,
  hands,
  turn,
  result,
}: {
  readonly player: number;
  readonly name: string;
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
      <div style={{ fontWeight: 700, fontSize: '0.82rem' }}>{name}</div>
      <div style={{ fontSize: '0.72rem', color: '#475569' }}>
        Nilai <strong>{scores[player]}</strong> · {hands[player]?.length ?? 0} kartu
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

/** Rantai digambar berbaris seperti ular: berjalan mendatar, lalu berbalik
 * arah di baris berikutnya ketika sudah mentok — sebagaimana kartu gaplek
 * disusun di atas meja saat rantainya kepanjangan.
 *
 * Kartu balak (angka kembar) dipasang melintang, tegak lurus arah rantai,
 * sesuai aturan gaplek. Karena melintang, balak hanya memakan ruang selebar
 * kartu sehingga barisan tetap rapat. */
function ChainSnake({
  placed,
  leftLabel,
  rightLabel,
  acceptsLeft,
  acceptsRight,
  onDropLeft,
  onDropRight,
}: {
  readonly placed: readonly PlacedTile[];
  readonly leftLabel: string;
  readonly rightLabel: string;
  readonly acceptsLeft: boolean;
  readonly acceptsRight: boolean;
  readonly onDropLeft: () => void;
  readonly onDropRight: () => void;
}) {
  if (placed.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.6rem' }}>
        <p style={{ color: '#bbf7d0', margin: 0, textAlign: 'center' }}>
          Papan masih kosong — pemegang balak 6|6 yang jalan pertama.
        </p>
        <DropZone label="6|6" title="Taruh balak 6|6 di sini" accepts={acceptsRight} onDrop={onDropRight} />
      </div>
    );
  }

  // Zona kiri dan kanan ikut menempati jalur yang sama dengan kartu, jadi
  // keduanya selalu muncul persis di tempat kartu berikutnya akan jatuh.
  const slots = layoutSnake(chainWidths(placed));
  const rows = rowCount(slots);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: `${ROW_W}px`, height: `${rows * ROW_H}px` }}>
        {slots.map((slot, i) => {
          const tile = placed[i - 1];
          return (
            <div
              key={i === 0 ? 'kiri' : i === slots.length - 1 ? 'kanan' : `${tile?.[0]}-${tile?.[1]}-${i}`}
              style={{
                position: 'absolute',
                left: `${slot.x}px`,
                top: `${slot.y}px`,
                width: `${slot.width}px`,
                height: `${ROW_H}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {i === 0 && (
                <DropZone label={leftLabel} title={`Sambung di ujung ${leftLabel}`} accepts={acceptsLeft} onDrop={onDropLeft} />
              )}
              {i === slots.length - 1 && (
                <DropZone label={rightLabel} title={`Sambung di ujung ${rightLabel}`} accepts={acceptsRight} onDrop={onDropRight} />
              )}
              {tile && i > 0 && i < slots.length - 1 && (
                <DominoChain
                  placed={tile}
                  crosswise={isDoubleTile(tile)}
                  reversed={!slot.leftToRight}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Zona di tepi rantai tempat kartu dijatuhkan. Menyala hijau hanya bila
 * kartu yang sedang dipegang memang boleh masuk di sisi itu. */
function DropZone({
  label,
  title,
  accepts,
  onDrop,
}: {
  /** Ditulis pendek karena kedudukannya selebar satu kartu. */
  readonly label: string;
  readonly title: string;
  readonly accepts: boolean;
  readonly onDrop: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={() => accepts && onDrop()}
      onDragOver={(e) => {
        if (accepts) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (accepts) onDrop();
      }}
      style={{
        width: '46px',
        height: '46px',
        padding: '0',
        lineHeight: 1.1,
        borderRadius: '8px',
        border: `2px dashed ${accepts ? '#4ade80' : 'rgba(255,255,255,0.35)'}`,
        background: accepts ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.06)',
        color: accepts ? '#bbf7d0' : 'rgba(255,255,255,0.55)',
        cursor: accepts ? 'pointer' : 'default',
        // Sengaja tidak memakai `disabled`: tombol yang disabled tidak
        // menerima event dragover/drop sama sekali, jadi kartu tidak bisa
        // dijatuhkan ke sini.
        fontSize: '1.05rem',
        fontWeight: 800,
        opacity: accepts ? 1 : 0.55,
      }}
    >
      {label}
    </button>
  );
}

function HandTile({
  tile,
  playable,
  held,
  recommended,
  onPick,
  onToggle,
}: {
  readonly tile: Tile;
  readonly playable: boolean;
  readonly held: boolean;
  readonly recommended: boolean;
  /** Dipakai saat kartu mulai ditarik: selalu memegang, tidak membatalkan. */
  readonly onPick: () => void;
  readonly onToggle: () => void;
}) {
  return (
    <div
      draggable={playable}
      onDragStart={(e) => {
        if (!playable) return;
        e.dataTransfer.effectAllowed = 'move';
        // Sebagian browser menolak drag tanpa data apa pun.
        e.dataTransfer.setData('text/plain', `${tile.a}-${tile.b}`);
        onPick();
      }}
      onClick={() => playable && onToggle()}
      role="button"
      tabIndex={playable ? 0 : -1}
      onKeyDown={(e) => {
        if (playable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
      title={playable ? `Tarik ${tile.a}|${tile.b} ke meja` : `${tile.a}|${tile.b} belum bisa dipasang`}
      style={{
        cursor: playable ? 'grab' : 'not-allowed',
        transform: held ? 'translateY(-8px)' : undefined,
        transition: 'transform 120ms ease',
      }}
    >
      <Domino a={tile.a} b={tile.b} dimmed={!playable} highlighted={held || (recommended && playable)} />
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
function DominoChain({
  placed,
  crosswise = false,
  reversed = false,
}: {
  readonly placed: PlacedTile;
  /** Balak dipasang melintang — tegak lurus arah rantai. */
  readonly crosswise?: boolean;
  /** Baris yang berjalan dari kanan ke kiri: urutan kedua sisi dibalik supaya
   * angka yang bersentuhan tetap sama seperti urutan rantai sebenarnya. */
  readonly reversed?: boolean;
}) {
  const direction = crosswise
    ? reversed
      ? 'column-reverse'
      : 'column'
    : reversed
      ? 'row-reverse'
      : 'row';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        background: '#fffdf5',
        border: '2px solid #334155',
        borderRadius: '5px',
        overflow: 'hidden',
      }}
    >
      <PipFace value={placed[0]} size={24} />
      <div
        style={
          crosswise
            ? { height: '2px', background: '#334155' }
            : { width: '2px', background: '#334155' }
        }
      />
      <PipFace value={placed[1]} size={24} />
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
                width: `${Math.max(6, size * 0.27)}px`,
                height: `${Math.max(6, size * 0.27)}px`,
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
