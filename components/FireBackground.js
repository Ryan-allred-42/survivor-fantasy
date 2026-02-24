// Decorative fire/torch atmosphere — fixed, pointer-events-none, very low opacity
//
// Negative animation delays are the key trick: a delay of -Xs means the animation
// has already been running for X seconds, so at page load, embers appear distributed
// throughout the full height rather than all starting from the bottom simultaneously.

// 24 horizontal positions × 3 phase offsets = 72 continuously-floating embers
const EMBER_POSITIONS = [2, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 94, 97, 99, 4, 15];

const ALL_EMBERS = [];
EMBER_POSITIONS.forEach((left, i) => {
  const baseDur = 10 + (i % 10) * 1.4; // 10s – 23.6s range
  const drift   = i % 2 === 0 ? `${4 + (i % 7)}px` : `-${4 + (i % 7)}px`;
  const baseSize = i % 4 === 0 ? 3 : 2;

  for (let ph = 0; ph < 3; ph++) {
    const dur   = baseDur + ph * 0.9;
    const delay = -(dur * ph / 3); // 0, -dur/3, -2dur/3 → phases evenly spaced
    ALL_EMBERS.push({
      left: `${left}%`,
      size: ph === 0 ? baseSize : Math.max(1, baseSize - 1),
      dur:  `${dur.toFixed(1)}s`,
      delay: `${delay.toFixed(2)}s`,
      drift,
    });
  }
});

export default function FireBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ── Bottom center glow ── */}
      <div style={{
        position: "absolute", bottom: 0, left: "10%", right: "10%", height: "45vh",
        background: "radial-gradient(ellipse 80% 100% at 50% 100%, oklch(0.68 0.22 38 / 0.11) 0%, oklch(0.58 0.18 30 / 0.06) 45%, transparent 70%)",
        animation: "fire-pulse 4.2s ease-in-out infinite",
      }} />

      {/* ── Left torch column ── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, width: "22vw", height: "70vh",
        background: "radial-gradient(ellipse 100% 75% at 0% 100%, oklch(0.65 0.22 40 / 0.10) 0%, oklch(0.55 0.18 32 / 0.04) 50%, transparent 70%)",
        animation: "fire-pulse 3.6s ease-in-out infinite 0.7s",
      }} />

      {/* ── Right torch column ── */}
      <div style={{
        position: "absolute", bottom: 0, right: 0, width: "22vw", height: "70vh",
        background: "radial-gradient(ellipse 100% 75% at 100% 100%, oklch(0.65 0.22 40 / 0.10) 0%, oklch(0.55 0.18 32 / 0.04) 50%, transparent 70%)",
        animation: "fire-pulse-alt 4s ease-in-out infinite 1.3s",
      }} />

      {/* ── Secondary warm center glow ── */}
      <div style={{
        position: "absolute", bottom: 0, left: "25%", right: "25%", height: "25vh",
        background: "radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.72 0.24 42 / 0.08) 0%, transparent 65%)",
        animation: "fire-pulse-alt 5s ease-in-out infinite 0.3s",
      }} />

      {/* ── Continuously floating embers (negative delay = pre-populated through flight path) ── */}
      {ALL_EMBERS.map((e, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: e.left,
            bottom: "0%",
            width: e.size,
            height: e.size,
            borderRadius: "50%",
            background: "oklch(0.85 0.22 45)",
            boxShadow: `0 0 ${e.size * 3}px 1px oklch(0.78 0.24 38 / 0.50)`,
            "--ember-drift": e.drift,
            animation: `ember-rise ${e.dur} ease-out infinite ${e.delay}`,
          }}
        />
      ))}
    </div>
  );
}
