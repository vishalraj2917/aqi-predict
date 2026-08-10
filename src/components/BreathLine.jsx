// The signature "Breath Line" sparkline — a 24h AQI trace that
// color-shifts along its length by category (see 00_Design_System.md)

export default function BreathLine({ points, height = 90, label }) {
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: 1,
            color: "#5a655f",
            marginBottom: 8,
          }}
        >
          {label}
        </div>
      )}
      <svg
        viewBox="0 0 1000 100"
        width="100%"
        height={height}
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--good)"
          strokeWidth="2.5"
          style={{
            strokeDasharray: 1400,
            strokeDashoffset: 1400,
            animation: "draw 1.1s ease-out forwards",
          }}
        />
      </svg>
      <style>{`@keyframes draw { to { stroke-dashoffset: 0; } }`}</style>
    </div>
  );
}
