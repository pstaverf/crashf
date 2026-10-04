import { useState } from "react";
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

export default function LottieAsset({ src, loop = true, autoplay = true, fallback, className }: LottieAssetProps) {
  const [failed, setFailed] = useState(false);

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
