import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Preloader from "./components/Preloader.jsx";
import StageErrorBoundary from "./components/StageErrorBoundary.jsx";
import "./styles/tokens.css";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <StageErrorBoundary
      resetKey="root"
      fallback={
        <div className="app-shell">
          <div className="app-crash">
            <p>Что-то пошло не так.</p>
            <button onClick={() => window.location.reload()}>Обновить страницу</button>
          </div>
        </div>
      }
    >
      <Preloader>
        <App />
      </Preloader>
    </StageErrorBoundary>
  </React.StrictMode>
);
