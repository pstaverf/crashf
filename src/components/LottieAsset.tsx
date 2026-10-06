import { useEffect, useRef, useState } from "react";
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
const LOAD_TIMEOUT_MS = 6000;
const missing = new Map<string, Promise<boolean>>();

const isSameOrigin = (src: string): boolean => {
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

const probeLocal = (src: string): Promise<boolean> => {
  let pending = missing.get(src);
  if (!pending) {
    pending = fetch(src, { method: "HEAD" })
      .then((res) => !res.ok || (res.headers.get("content-type") ?? "").includes("text/html"))
      .catch(() => false);
    missing.set(src, pending);
  }
  return pending;
};

export default function LottieAsset({ src, loop = true, autoplay = true, fallback, className }: LottieAssetProps) {
  const [failed, setFailed] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loaded.current = false;
    setFailed(false);

    if (isSameOrigin(src)) {
      void probeLocal(src).then((gone) => {
        if (gone && !cancelled) setFailed(true);
      });
    }

    const watchdog = window.setTimeout(() => {
      if (!loaded.current && !cancelled) setFailed(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(watchdog);
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
        dotLottieRefCallback={(instance) => {
          if (!instance) return;
          instance.addEventListener("load", () => {
            loaded.current = true;
          });
          instance.addEventListener("loadError", () => setFailed(true));
        }}
        style={FILL}
      />
    </div>
  );
}
