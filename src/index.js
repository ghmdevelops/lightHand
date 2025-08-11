import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";

(function createSplash() {
  const style = document.createElement("style");
  style.textContent = `
    #splash{position:fixed;inset:0;z-index:9999;background:#0d6efd;display:flex;align-items:center;justify-content:center;transition:opacity .4s ease}
    #splash .logo{width:110px;height:110px;object-fit:contain;animation:pulse 1.2s ease-in-out infinite;filter:drop-shadow(0 8px 24px rgba(0,0,0,.25))}
    @keyframes pulse{0%{transform:scale(1) rotate(0)}50%{transform:scale(1.08) rotate(2deg)}100%{transform:scale(1) rotate(0)}}
    @media (prefers-reduced-motion: reduce){#splash .logo{animation:none}}
  `;
  const splash = document.createElement("div");
  splash.id = "splash";
  splash.setAttribute("role", "status");
  splash.setAttribute("aria-label", "Carregando");
  splash.innerHTML = `<img class="logo" src="/logo192.png" alt="Savvy" />`;
  document.head.appendChild(style);
  document.body.appendChild(splash);
})();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
    />
    <App />
  </React.StrictMode>
);

(function hideSplashSoon() {
  const hide = () => {
    const el = document.getElementById("splash");
    if (!el || el.dataset.hidden) return;
    el.dataset.hidden = "1";
    el.style.opacity = "0";
    setTimeout(() => el && el.remove(), 400);
  };

  if (document.readyState === "complete") {
    setTimeout(hide, 300);
  } else {
    window.addEventListener("load", () => setTimeout(hide, 300), { once: true });
  }
})();

reportWebVitals();
