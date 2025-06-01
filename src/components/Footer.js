import React from "react";
import { Link } from "react-router-dom";

export default function Footer({ dark }) {
  return (
    <footer
      className={`mt-auto shadow-sm border-0 ${
        dark ? "bg-dark text-secondary" : "bg-light text-muted"
      }`}
      style={{
        fontFamily: "Inter, Segoe UI, Arial, sans-serif",
        letterSpacing: 0.4,
        fontWeight: 500,
        paddingTop: "1.1rem",
        paddingBottom: "0.9rem",
        borderTop: dark ? "1.5px solid #212529" : "1.5px solid #e3e3e3",
        background: dark
          ? "linear-gradient(90deg,#181f28 40%,#232c37 100%)"
          : "linear-gradient(90deg,#ffffff 60%,#eafff3 100%)",
      }}
    >
      <div className="container d-flex flex-column flex-md-row align-items-center justify-content-between">
        {/* Esquerda */}
        <div className="mb-2 mb-md-0 text-md-start text-center">
          <span
            style={{
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: 1,
              color: "#198754",
            }}
          >
            <i
              className="bi bi-cart4"
              style={{ fontSize: 21, verticalAlign: "sub" }}
            />{" "}
            LIGHTHAND
          </span>
          <span className="mx-2" style={{ opacity: 0.22 }}>
            |
          </span>
          <span style={{ fontSize: 15, fontWeight: 400 }}>
            Conectando pessoas e mercados com leveza e tecnologia.
          </span>
          {/* Botão Saiba Mais */}
          <div className="mt-2">
           <Link to="/sobre" className="btn btn-outline-success btn-sm" title="Saiba Mais">
    Saiba Mais
  </Link>
          </div>
        </div>

        {/* Centro: ícones sociais */}
        <div className="d-flex align-items-center gap-3 mb-2 mb-md-0">
          <a
            href="mailto:contato@lighthand.app"
            className={`text-decoration-none ${
              dark ? "text-success" : "text-success"
            }`}
            title="Contato"
            style={{ fontSize: 17 }}
          >
            <i className="bi bi-envelope-open"></i>
          </a>
          <a
            href="https://instagram.com/"
            className={`text-decoration-none ${
              dark ? "text-light" : "text-secondary"
            }`}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram"
            style={{ fontSize: 19 }}
          >
            <i className="bi bi-instagram"></i>
          </a>
          <a
            href="https://github.com/"
            className={`text-decoration-none ${
              dark ? "text-light" : "text-secondary"
            }`}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub"
            style={{ fontSize: 19 }}
          >
            <i className="bi bi-github"></i>
          </a>
        </div>

        <div
          className="text-md-end text-center"
          style={{ fontSize: 14, opacity: 0.82 }}
        >
          &copy; {new Date().getFullYear()} LIGHTHAND.
          <br className="d-md-none" />
          Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
