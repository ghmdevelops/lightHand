import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="savvy-footer text-light py-5 position-relative">
      <div className="container">
        <div className="row g-4 text-center text-md-start align-items-start">
          <div className="col-md-4">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start mb-2">
              <i className="bi bi-cart4 brand-icon" />
              <span className="ms-2 fw-bold brand-text">Savvy</span>
            </div>
            <p className="mb-0 tagline">
              Escolhas inteligentes no mercado.
              <br />
              Unindo pessoas, dados e tecnologia.
            </p>
          </div>

          <div className="col-md-4">
            <h6 className="section-title mb-3">Links úteis</h6>
            <ul className="list-unstyled link-list">
              <li>
                <Link to="/sobre" className="footer-link">Sobre o Projeto</Link>
              </li>
              <li>
                <Link to="/contato" className="footer-link">Contato</Link>
              </li>
              <li>
                <Link to="/termos" className="footer-link">Termos de Uso</Link>
              </li>
              <li>
                <Link to="/privacidade" className="footer-link">Política de Privacidade</Link>
              </li>
            </ul>
          </div>

          <div className="col-md-4">
            <h6 className="section-title mb-3">Redes & Contato</h6>
            <div className="d-flex justify-content-center justify-content-md-start gap-3 flex-wrap">
              <a href="mailto:contato@savvy.app" aria-label="Enviar email" className="social-btn">
                <i className="bi bi-envelope-open" />
              </a>
              <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="social-btn">
                <i className="bi bi-instagram" />
              </a>
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="social-btn">
                <i className="bi bi-github" />
              </a>
            </div>
            <button
              type="button"
              className="btn btn-outline-light btn-sm mt-3 backtop"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Voltar ao topo
            </button>
          </div>
        </div>

        <div className="text-center mt-5 fineprint">
          &copy; {year} Savvy • Todos os direitos reservados.
        </div>
      </div>

      <style>{`
      :root {
  --footer-bg: #0b1e3a;   /* azul escuro */
  --footer-text: rgba(255, 255, 255, 0.9);
  --footer-sub: rgba(255, 255, 255, 0.75);
  --footer-line: rgba(255, 255, 255, 0.08);
  --accent-a: #00ffff;
  --accent-b: #1e90ff;
}
        @media (prefers-color-scheme: light) {
          :root {
            --footer-bg: rgba(15, 20, 30, 0.75);
          }
        }
        .savvy-footer {
          font-family: Inter, Segoe UI, Arial, sans-serif;
  background: linear-gradient(180deg, #0b1e3a 0%, #08162b 100%);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-top: 1px solid var(--footer-line);
          box-shadow: 0 0 24px rgba(0, 255, 255, 0.05);
          overflow: hidden;
        }
        .savvy-footer::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(1200px 400px at -10% 0%, rgba(0,255,255,0.08), transparent 60%),
                      radial-gradient(900px 300px at 110% 10%, rgba(30,144,255,0.08), transparent 60%);
          pointer-events: none;
        }
        .brand-icon {
          font-size: 30px;
          color: var(--accent-a);
          filter: drop-shadow(0 0 6px rgba(0,255,255,0.25));
        }
        .brand-text {
          font-size: 22px;
          letter-spacing: 1.1px;
          background: linear-gradient(90deg, var(--accent-a), var(--accent-b));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .tagline {
          opacity: 0.9;
          font-size: 14px;
          color: var(--footer-sub);
        }
        .section-title {
          text-transform: uppercase;
          font-size: 13px;
          letter-spacing: .08em;
          color: var(--footer-sub);
        }
        .link-list {
          line-height: 1.85;
          margin: 0;
        }
        .footer-link {
          text-decoration: none;
          color: var(--footer-text);
          font-size: 14px;
          padding: 2px 0;
          border-bottom: 1px solid transparent;
          transition: color .2s ease, border-color .2s ease, transform .2s ease;
        }
        .footer-link:hover,
        .footer-link:focus {
          color: var(--accent-a);
          border-color: rgba(0,255,255,.35);
          outline: none;
          transform: translateX(2px);
          text-decoration: none;
        }
        .footer-link:focus-visible {
          box-shadow: 0 0 0 3px rgba(0,255,255,.25);
          border-radius: 4px;
        }
        .social-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
          border: 1px solid var(--footer-line);
          color: #b0e0ff;
          transition: transform .2s ease, box-shadow .2s ease, color .2s ease, border-color .2s ease;
        }
        .social-btn:hover,
        .social-btn:focus-visible {
          color: var(--accent-a);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,255,255,.12);
          border-color: rgba(0,255,255,.35);
          outline: none;
        }
        .backtop {
          border-radius: 12px;
          border-color: rgba(255,255,255,.35);
        }
        .backtop:focus-visible {
          box-shadow: 0 0 0 3px rgba(0,255,255,.25);
          outline: none;
        }
        .fineprint {
          font-size: 13px;
          opacity: .7;
          border-top: 1px solid var(--footer-line);
          padding-top: 16px;
          color: var(--footer-sub);
        }
      `}</style>
    </footer>
  );
}
