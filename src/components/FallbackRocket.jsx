export default function FallbackRocket() {
  return (
    <div className="fallback-rocket">
      <svg viewBox="0 0 120 200" className="fallback-rocket__svg">
        <ellipse cx="60" cy="185" rx="16" ry="8" className="fallback-rocket__glow" />
        <g className="fallback-rocket__flame">
          <path d="M60 150 C 50 168, 52 182, 60 196 C 68 182, 70 168, 60 150 Z" />
        </g>
        <g>
          <path
            d="M60 8 C 84 34, 90 78, 86 128 L 34 128 C 30 78, 36 34, 60 8 Z"
            className="fallback-rocket__hull"
          />
          <path d="M34 128 L 16 156 L 34 150 Z" className="fallback-rocket__fin" />
          <path d="M86 128 L 104 156 L 86 150 Z" className="fallback-rocket__fin" />
          <circle cx="60" cy="66" r="14" className="fallback-rocket__window" />
        </g>
      </svg>
    </div>
  );
}
