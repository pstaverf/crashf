import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import Preloader from "./components/Preloader.tsx";
import StageErrorBoundary from "./components/StageErrorBoundary.tsx";
import "./styles/tokens.css";
import "./styles/global.css";

const fallback = (
  <div className="app-shell">
    <div className="app-crash">
      <p>Что-то пошло не так.</p>
      <button onClick={() => window.location.reload()}>Обновить страницу</button>
    </div>
  </div>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StageErrorBoundary resetKey="root" fallback={fallback}>
      <Preloader>
        <App />
      </Preloader>
    </StageErrorBoundary>
  </StrictMode>
);
