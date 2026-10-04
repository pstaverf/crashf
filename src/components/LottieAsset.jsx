import { useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Plays a .lottie or .json animation from /public/animations.
 * If the file hasn't been dropped in yet (or fails to load), renders
 * `fallback` instead so the app still works out of the box.
 */
export default function LottieAsset({ src, loop = true, autoplay = true, fallback, className }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <DotLottieReact
        src={src}
        loop={loop}
        autoplay={autoplay}
        backgroundColor="transparent"
        dotLottieRefCallback={(dotLottie) => {
          if (!dotLottie) return; // called with null on unmount — must not touch it
          dotLottie.addEventListener("loadError", () => setFailed(true));
        }}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
