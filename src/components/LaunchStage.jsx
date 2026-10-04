import { AnimatePresence, motion } from "framer-motion";
import LottieAsset from "./LottieAsset.jsx";
import FallbackRocket from "./FallbackRocket.jsx";
import FallbackExplosion from "./FallbackExplosion.jsx";
import PingBadge from "./PingBadge.jsx";
import FairnessPanel from "./FairnessPanel.jsx";
import "./LaunchStage.css";

const easeOut = [0.16, 1, 0.3, 1];

export default function LaunchStage({ phase, countdown, fair, history }) {
  return (
    <div className={`stage stage--${phase}`}>
      <PingBadge />
      <FairnessPanel currentHash={fair.hash} history={history} />

      <div className="stage__grid" aria-hidden="true">
        <div className="stage__grid-layer stage__grid-layer--far" />
        <div className="stage__grid-layer stage__grid-layer--near" />
      </div>

      <div className="stage__vignette" aria-hidden="true" />

      <div className="stage__content">
        <AnimatePresence>
          {phase === "waiting" && countdown > 0 && (
            <motion.div
              key="countdown"
              className="stage__countdown-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              transition={{ duration: 0.4, ease: easeOut }}
            >
              <AnimatePresence mode="wait">
                <motion.span
                  key={countdown}
                  className="stage__countdown"
                  initial={{ opacity: 0, scale: 0.6, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.3, y: -14 }}
                  transition={{ duration: 0.45, ease: easeOut }}
                >
                  {countdown}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          )}

          {phase === "flying" && (
            <motion.div
              key="rocket"
              className="stage__craft"
              initial={{ opacity: 0, scale: 0.75, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.65, ease: easeOut }}
            >
              <LottieAsset
                src="/animations/rocket.lottie"
                loop
                autoplay
                className="stage__craft-visual"
                fallback={<FallbackRocket />}
              />
            </motion.div>
          )}

          {phase === "crashed" && (
            <motion.div
              key="explosion"
              className="stage__craft"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: [0.8, 1.15, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
            >
              <LottieAsset
                src="/animations/explosion.lottie"
                loop
                autoplay
                className="stage__craft-visual stage__craft-visual--boom"
                fallback={<FallbackExplosion />}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
