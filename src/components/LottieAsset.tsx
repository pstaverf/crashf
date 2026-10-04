import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface LottieAssetProps {
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  fallback: ReactNode;
  className?: string;
}

const FILL = { width: "100%", height: "100%" } as const;
const availability = new Map<string, Promise<boolean>>();

const probe = (src: string): Promise<boolean> => {
  let pending = availability.get(src);
  if (!pending) {
    pending = fetch(src, { method: "HEAD" })
      .then((res) => res.ok && !(res.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    availability.set(src, pending);
  }
  return pending;
};

export default function LottieAsset({ src, loop = true, autoplay = true, fallback, className }: LottieAssetProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    void probe(src).then((ok) => {
      if (!ok && !cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) return <div className={className}>{fallback}</div>;

  return (
    <div className={className}>
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        backgroundColor="transparent"
        dotLottieRefCallback={(instance) => instance?.addEventListener("loadError", () => setFailed(true))}
        style={FILL}
      />
    </div>
  );
}
