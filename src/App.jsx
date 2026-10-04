import { useCrashRound } from "./hooks/useCrashRound.js";
import HistoryStrip from "./components/HistoryStrip.jsx";
import LaunchStage from "./components/LaunchStage.jsx";
import Multiplier from "./components/Multiplier.jsx";
import BetPanel from "./components/BetPanel.jsx";
import StageErrorBoundary from "./components/StageErrorBoundary.jsx";

export default function App() {
  const { phase, countdown, multiplier, history, balance, bet, lastResult, fair, placeBet, cashOut } =
    useCrashRound({ startingBalance: 1000 });

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

      <Multiplier phase={phase} value={multiplier} />

      <BetPanel
        phase={phase}
        balance={balance}
        bet={bet}
        multiplier={multiplier}
        lastResult={lastResult}
        onPlaceBet={placeBet}
        onCashOut={cashOut}
      />
    </div>
  );
}
