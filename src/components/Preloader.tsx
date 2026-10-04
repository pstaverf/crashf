import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./Preloader.css";

const ASSET_URLS = ["/animations/rocket.lottie", "/animations/explosion.lottie"];
const MAX_WAIT_MS = 4000;
const MIN_SHOW_MS = 450;
const easeOut = [0.16, 1, 0.3, 1] as const;

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export default function Preloader({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const started = performance.now();

    const assets = Promise.all(ASSET_URLS.map((url) => fetch(url).then((res) => res.blob()).catch(() => null)));
    const work = Promise.all([assets, document.fonts?.ready]);

    void Promise.race([work, wait(MAX_WAIT_MS)]).then(async () => {
      const elapsed = performance.now() - started;
      if (elapsed < MIN_SHOW_MS) await wait(MIN_SHOW_MS - elapsed);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AnimatePresence mode="wait">
      {!ready ? (
        <motion.div
          key="preloader"
          className="preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
        >
          <div className="preloader__ring">
            <span className="preloader__spark" />
          </div>
          <p className="preloader__label">Готовим ракету к старту…</p>
          <div className="preloader__bar">
            <span className="preloader__bar-fill" />
          </div>
        </motion.div>
      ) : (
        <motion.div key="app" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: easeOut }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
