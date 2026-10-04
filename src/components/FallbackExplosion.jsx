export default function FallbackExplosion() {
  return (
    <div className="fallback-explosion">
      <span className="fallback-explosion__ring fallback-explosion__ring--1" />
      <span className="fallback-explosion__ring fallback-explosion__ring--2" />
      <span className="fallback-explosion__ring fallback-explosion__ring--3" />
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className="fallback-explosion__shard"
          style={{ "--angle": `${(360 / 8) * i}deg` }}
        />
      ))}
    </div>
  );
}
