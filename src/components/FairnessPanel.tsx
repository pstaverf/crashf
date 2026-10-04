import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { SVGProps } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { verifyRoundInBrowser, cryptoAvailable } from "../utils/fair.ts";
import type { BrowserVerifyReport } from "../utils/fair.ts";
import type { Fairness, RoundChip } from "../hooks/useCrashRound.ts";
import "./FairnessPanel.css";

const easeOut = [0.16, 1, 0.3, 1] as const;

function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true" {...props}>
      <path d="M12 2.6 4.4 5.4v5.3c0 5.1 3.3 8.9 7.6 10.3 4.3-1.4 7.6-5.2 7.6-10.3V5.4L12 2.6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8.4 12.2l2.5 2.5 4.9-5.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const short = (hex: string, head = 10, tail = 6): string =>
  !hex ? "…" : hex.length <= head + tail + 1 ? hex : `${hex.slice(0, head)}…${hex.slice(-tail)}`;

const copy = (text: string): void => void navigator.clipboard?.writeText(text);

function FairnessPanel({ fair, history }: { fair: Fairness; history: RoundChip[] }) {
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<Record<string, BrowserVerifyReport>>({});
  const [checking, setChecking] = useState(false);

  const verifyAll = useCallback(async () => {
    if (history.length === 0) return;
    setChecking(true);

    const next = await Promise.all(
      history.map((round, index) =>
        verifyRoundInBrowser(
          { serverSeed: round.seed, serverSeedHash: round.hash, crashPoint: round.value },
          history[index + 1]?.seed ?? null
        )
      )
    );

    setReports(Object.fromEntries(history.map((round, index) => [round.id, next[index]!])));
    setChecking(false);
  }, [history]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => void (e.key === "Escape" && setOpen(false));
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = scroll;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) void verifyAll();
  }, [open, verifyAll]);

  const results = Object.values(reports);
  const verified = results.filter((report) => report.ok).length;
  const failed = results.filter((report) => !report.ok && !report.unavailable).length;

  return (
    <>
      <button className="fairness-btn" onClick={() => setOpen(true)}>
        <ShieldCheckIcon />
        <span>Честность</span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fairness-backdrop"
              role="dialog"
              aria-modal="true"
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
                onClick={(event) => event.stopPropagation()}
              >
                <div className="fairness-modal__head">
                  <ShieldCheckIcon className="fairness-modal__head-icon" />
                  <h2>Честная игра</h2>
                  <button className="fairness-modal__close" onClick={() => setOpen(false)} aria-label="Закрыть">
                    ✕
                  </button>
                </div>

                <p className="fairness-modal__text">
                  Все {fair.totalRounds || "—"} результатов сервер сгенерировал заранее в виде цепочки хэшей и опубликовал её якорь до
                  первого раунда. Сид каждого раунда раскрывается после взрыва, и <b>sha256(сид) всегда равен сиду предыдущего раунда</b> —
                  подменить хотя бы один результат, не разорвав всю цепочку, невозможно.
                </p>

                {!cryptoAvailable() && (
                  <div className="fairness-modal__warn">
                    Страница открыта не по HTTPS — Web Crypto недоступен, пересчитать хэши в браузере нельзя. Откройте сайт по https, чтобы
                    проверка заработала.
                  </div>
                )}

                <div className="fairness-modal__block">
                  <span className="fairness-modal__label">Якорь цепочки (опубликован до игры)</span>
                  <code className="fairness-modal__hash" onClick={() => copy(fair.terminalCommit ?? "")} title="Скопировать">
                    {fair.terminalCommit || "…"}
                  </code>
                </div>

                <div className="fairness-modal__grid">
                  <div>
                    <span className="fairness-modal__label">Соль (в формуле)</span>
                    <code className="fairness-modal__mini">{fair.salt || "…"}</code>
                  </div>
                  <div>
                    <span className="fairness-modal__label">Раундов в запасе</span>
                    <code className="fairness-modal__mini">{fair.remaining ?? "…"}</code>
                  </div>
                </div>

                <div className="fairness-modal__block">
                  <span className="fairness-modal__label">Хэш текущего раунда {fair.nonce !== null && `· #${fair.nonce}`}</span>
                  <code className="fairness-modal__hash" onClick={() => copy(fair.hash)} title="Скопировать">
                    {fair.hash || "…"}
                  </code>
                </div>

                <div className="fairness-modal__formula">
                  <span className="fairness-modal__label">Формула множителя</span>
                  <code>
                    h = HMAC_SHA256(сид, «{fair.salt || "соль"}»)
                    <br />h % 50 == 0 → 1.00x, иначе (100·2⁵² − h₅₂) / (2⁵² − h₅₂) / 100
                  </code>
                </div>

                {history.length > 0 && (
                  <div className="fairness-modal__block">
                    <div className="fairness-modal__verify-head">
                      <span className="fairness-modal__label">Проверка последних раундов</span>
                      <button className="fairness-modal__recheck" onClick={() => void verifyAll()} disabled={checking}>
                        {checking ? "Считаю…" : "Пересчитать"}
                      </button>
                    </div>

                    {!checking && results.length > 0 && (
                      <div className={`fairness-modal__verdict ${failed ? "is-bad" : "is-good"}`}>
                        {failed
                          ? `${failed} раунд(ов) не сошлись — это баг или подмена`
                          : `Пересчитано в вашем браузере: ${verified} из ${history.length} — всё сходится`}
                      </div>
                    )}

                    <ul className="fairness-modal__history">
                      {history.map((round) => {
                        const report = reports[round.id];
                        const state = !report || report.unavailable ? "is-idle" : report.ok ? "is-ok" : "is-bad";
                        const mark = !report ? "…" : report.unavailable ? "—" : report.ok ? "✓" : "✕";

                        return (
                          <li key={round.id}>
                            <span className={`fairness-modal__mark ${state}`}>{mark}</span>
                            <span className="fairness-modal__round-mult">x{round.value.toFixed(2)}</span>
                            <code className="fairness-modal__round-seed" title={round.seed} onClick={() => copy(round.seed)}>
                              {short(round.seed)}
                            </code>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                <p className="fairness-modal__foot">
                  Проверить вручную: <code>echo -n «сид» | openssl dgst -sha256</code> — результат обязан совпасть с хэшем, который был
                  показан до раунда.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default memo(FairnessPanel);
