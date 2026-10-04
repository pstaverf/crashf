import { memo, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getMultiplier, subscribeMultiplier } from "../state/multiplier.ts";
import type { ClientPhase } from "../../shared/protocol.ts";
import "./Multiplier.css";

const easeOut = [0.16, 1, 0.3, 1] as const;

const rangeFor = (value: number): string => {
  if (value < 2) return "cold";
  if (value <= 3) return "warm";
  if (value <= 10) return "climb";
  return "danger";
};

const classFor = (range: string): string =>
  `mult__value mult__value--${range}${range === "danger" ? " mult__value--shake" : ""}`;

function MultiplierValue() {
  const node = useRef<HTMLSpanElement>(null);
  const range = useRef("");

  useEffect(
    () =>
      subscribeMultiplier((value) => {
        const element = node.current;
        if (!element) return;

        element.textContent = `x${value.toFixed(2)}`;

        const next = rangeFor(value);
        if (next !== range.current) {
          range.current = next;
          element.className = classFor(next);
        }
      }),
    []
  );

  return (
    <span ref={node} className={classFor(rangeFor(getMultiplier()))}>
      x{getMultiplier().toFixed(2)}
    </span>
  );
}

function Multiplier({ phase }: { phase: ClientPhase }) {
  return (
    <div className="mult">
      <AnimatePresence>
        {(phase === "flying" || phase === "crashed") && (
          <motion.div
            key="mult-inner"
            className="mult__inner"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <span className="mult__label">{phase === "crashed" ? "Улетел на" : "Множитель"}</span>
            <MultiplierValue />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(Multiplier);
