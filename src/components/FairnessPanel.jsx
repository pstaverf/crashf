import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./FairnessPanel.css";

const easeOut = [0.16, 1, 0.3, 1];

function ShieldCheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2.6 4.4 5.4v5.3c0 5.1 3.3 8.9 7.6 10.3 4.3-1.4 7.6-5.2 7.6-10.3V5.4L12 2.6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M8.4 12.2l2.5 2.5 4.9-5.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FairnessPanel({ currentHash, history }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="fairness-btn" onClick={() => setOpen(true)}>
        <ShieldCheckIcon />
        <span>Честность</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fairness-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="fairness-modal"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.35, ease: easeOut }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="fairness-modal__head">
                <ShieldCheckIcon className="fairness-modal__head-icon" />
                <h2>Честная игра</h2>
                <button className="fairness-modal__close" onClick={() => setOpen(false)} aria-label="Закрыть">
                  ✕
                </button>
              </div>

              <p className="fairness-modal__text">
                Перед стартом раунда публикуется SHA-256 хэш секретного значения — оно уже
                зафиксировано и определяет множитель краша. После взрыва значение раскрывается:
                посчитайте его хэш сами и сравните с тем, что было показано заранее.
              </p>

              <div className="fairness-modal__block">
                <span className="fairness-modal__label">Хэш текущего раунда</span>
                <code className="fairness-modal__hash">{currentHash || "…"}</code>
              </div>

              {history.length > 0 && (
                <div className="fairness-modal__block">
                  <span className="fairness-modal__label">Прошлые раунды</span>
                  <ul className="fairness-modal__history">
                    {history.map((round) => (
                      <li key={round.id}>
                        <span className="fairness-modal__round-mult">x{round.value.toFixed(2)}</span>
                        <code className="fairness-modal__round-seed" title="Раскрытое значение (seed)">
                          {round.seed}
                        </code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
