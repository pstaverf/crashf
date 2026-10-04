import { useCrashRound } from "./hooks/useCrashRound.ts";
import HistoryStrip from "./components/HistoryStrip.tsx";
import LaunchStage from "./components/LaunchStage.tsx";
import Multiplier from "./components/Multiplier.tsx";
import BetPanel from "./components/BetPanel.tsx";
import StageErrorBoundary from "./components/StageErrorBoundary.tsx";

export default function App() {
  const { phase, countdown, history, balance, bet, lastResult, fair, placeBet, cashOut } = useCrashRound();

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Ignition</h1>
        <span className="balance">{balance.toFixed(0)} ⭐</span>
      </header>

      <HistoryStrip history={history} />

      <StageErrorBoundary resetKey={phase} fallback={<div className="stage stage--waiting" />}>
        <LaunchStage phase={phase} countdown={countdown} fair={fair} history={history} />
      </StageErrorBoundary>

      <Multiplier phase={phase} />

      <BetPanel phase={phase} balance={balance} bet={bet} lastResult={lastResult} onPlaceBet={placeBet} onCashOut={cashOut} />
    </div>
  );
}
