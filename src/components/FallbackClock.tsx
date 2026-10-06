export default function FallbackClock() {
  return (
    <svg className="fallback-clock" viewBox="0 0 48 48" aria-hidden="true">
      <circle className="fallback-clock__dial" cx="24" cy="24" r="19" />
      <circle className="fallback-clock__track" cx="24" cy="24" r="19" />
      <g className="fallback-clock__hand">
        <line x1="24" y1="24" x2="24" y2="12" />
      </g>
      <circle className="fallback-clock__pin" cx="24" cy="24" r="2" />
    </svg>
  );
}
