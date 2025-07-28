import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="text-light py-5"
      style={{
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        background: "rgba(15, 20, 30, 0.6)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 0 20px rgba(0,255,255,0.04)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div className="container">
        <div className="row g-4 text-center text-md-start">
          <div className="col-md-4">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start mb-2">
              <i
                className="bi bi-cart4"
                style={{ fontSize: 30, color: "#00FFFF" }}
              />
              <span
                className="ms-2 fw-bold"
                style={{
                  fontSize: 22,
                  letterSpacing: 1.1,
                  background: "linear-gradient(90deg, #00ffff, #1E90FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Savvy
              </span>
            </div>
            <p style={{ opacity: 0.85, fontSize: 14 }}>
              Escolhas inteligentes no mercado.
              <br />
              Unindo pessoas, dados e tecnologia.
            </p>
          </div>

          <div className="col-md-4">
            <h6
              className="text-uppercase mb-3"
              style={{ fontSize: 13, opacity: 0.9 }}
            >
              Links úteis
            </h6>
            <ul className="list-unstyled" style={{ lineHeight: "1.8" }}>
              <li>
                <Link to="/sobre" className="footer-link">
                  Sobre o Projeto
                </Link>
              </li>
              <li>
                <Link to="/contato" className="footer-link">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/termos" className="footer-link">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="footer-link">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Redes sociais */}
          <div className="col-md-4">
            <h6
              className="text-uppercase mb-3"
              style={{ fontSize: 13, opacity: 0.9 }}
            >
              Redes & Contato
            </h6>
            <div className="d-flex justify-content-center justify-content-md-start gap-4">
              <a
                href="mailto:contato@savvy.app"
                title="Email"
                className="neon-icon"
              >
                <i className="bi bi-envelope-open" />
              </a>
              <a
                href="https://instagram.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                className="neon-icon"
              >
                <i className="bi bi-instagram" />
              </a>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub"
                className="neon-icon"
              >
                <i className="bi bi-github" />
              </a>
            </div>
          </div>
        </div>

        <div
          className="text-center mt-5"
          style={{
            fontSize: 13,
            opacity: 0.65,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: 16,
          }}
        >
          &copy; {year} Savvy • Todos os direitos reservados.
        </div>
      </div>

      {/* Estilos extras modernos */}
      <style>{`
        .footer-link {
          text-decoration: none;
          color: rgba(255, 255, 255, 0.85);
          font-size: 14px;
        }
        .footer-link:hover {
          color: #00FFFF;
          text-decoration: underline;
        }

        .neon-icon {
          font-size: 20px;
          color: #b0e0ff;
          transition: all 0.3s ease;
        }

        .neon-icon:hover {
          color: #00FFFF;
          text-shadow: 0 0 6px #00FFFF;
          transform: scale(1.2);
        }
      `}</style>
    </footer>
  );
}
