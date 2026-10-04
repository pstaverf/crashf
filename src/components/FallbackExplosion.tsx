import type { CSSProperties } from "react";

const SHARDS = Array.from({ length: 8 }, (_, index) => ({ "--angle": `${45 * index}deg` }) as CSSProperties);

export default function FallbackExplosion() {
  return (
    <div className="fallback-explosion">
      <span className="fallback-explosion__ring fallback-explosion__ring--1" />
      <span className="fallback-explosion__ring fallback-explosion__ring--2" />
      <span className="fallback-explosion__ring fallback-explosion__ring--3" />
      {SHARDS.map((style, index) => (
        <span key={index} className="fallback-explosion__shard" style={style} />
      ))}
    </div>
  );
}
