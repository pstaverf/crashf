import { AnimatePresence, motion } from "framer-motion";
import "./Multiplier.css";

const easeOut = [0.16, 1, 0.3, 1];

function rangeFor(value) {
  if (value < 2.0) return "cold"; // x1.0–1.9 — black
  if (value <= 3.0) return "warm"; // x2.0–3.0 — white
  if (value <= 10.0) return "climb"; // x3.1–10.0 — green
  return "danger"; // x10.1+ — red, shaking
}

export default function Multiplier({ phase, value }) {
  const range = rangeFor(value);
  const label = phase === "crashed" ? "Улетел на" : "Множитель";

  return (
    <div className="mult">
      <AnimatePresence>
        {phase !== "waiting" && (
          <motion.div
            key="mult-inner"
            className="mult__inner"
            initial={{ opacity: 0, y: 10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.35, ease: easeOut }}
          >
            <span className="mult__label">{label}</span>
            <span
              className={`mult__value mult__value--${range} ${range === "danger" ? "mult__value--shake" : ""}`}
            >
              x{value.toFixed(2)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
