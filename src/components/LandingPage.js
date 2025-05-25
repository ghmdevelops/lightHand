import React from "react";
import Footer from "./Footer";

// Troque para uma imagem de fundo de sua preferência!
const BACKGROUND_IMG =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80";

function getGlassBg(dark) {
  return dark ? "rgba(27, 33, 43, 0.84)" : "rgba(255,255,255,0.89)";
}

export default function LandingPage({ onLogin, onRegister, dark }) {
  return (
    <div
      className={`d-flex flex-column min-vh-100 ${
        dark ? "bg-dark text-light" : "bg-light text-dark"
      }`}
      style={{
        background: `url('${BACKGROUND_IMG}') center/cover no-repeat fixed`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Overlay para escurecer e dar contraste */}
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          inset: 0,
          background: dark
            ? "linear-gradient(135deg, #16192588 0%, #23232e88 100%)"
            : "linear-gradient(135deg, #00000033 0%, #23e47422 100%)",
          pointerEvents: "none",
        }}
      />
      <style>{`
        .glass-card {
          background: ${getGlassBg(dark)};
          box-shadow: 0 10px 36px 0 #3bf78742, 0 2px 16px 0 #2be5ab66;
          border-radius: 2.2rem;
          border: 1.5px solid rgba(255,255,255,0.19);
          backdrop-filter: blur(18px);
          transition: box-shadow 0.3s, transform 0.3s;
        }
        .glass-card:hover {
          box-shadow: 0 12px 54px 0 #3bf78785, 0 2.5px 22px 0 #47ffc790;
          transform: scale(1.028);
        }
        .cart-icon-animate {
          animation: bounceIn 1.2s cubic-bezier(.43,1.43,.58,1.06);
          display: inline-block;
          transition: filter 0.35s, transform 0.35s;
        }
        .cart-icon-animate:hover {
          filter: brightness(1.19) drop-shadow(0 0 25px #3bf787cc);
          transform: scale(1.15) rotate(-4deg);
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.5) translateY(90px); opacity: 0.14;}
          60%  { transform: scale(1.14) translateY(-24px);}
          85%  { transform: scale(0.97) translateY(3px);}
          100% { transform: scale(1) translateY(0); opacity: 1;}
        }
        .neon-btn {
          box-shadow: 0 0 8px #3bf78777, 0 0 0 #3bf78700;
          transition: box-shadow 0.18s, background 0.18s, color 0.17s;
          border-radius: 100px !important;
          font-weight: 600;
          font-size: 1.17rem;
          letter-spacing: 1.5px;
        }
        .neon-btn:hover, .neon-btn:focus {
          box-shadow: 0 0 22px #3bf787dd, 0 0 60px #5ff7e588;
          background: #3bf787 !important;
          color: #222 !important;
          border-color: #3bf787 !important;
        }
        .glass-hr {
          border: 0;
          height: 2px;
          background: linear-gradient(90deg, #3bf78744 0%, #b2f2e544 100%);
          margin: 2rem 0 1.5rem 0;
        }
        .bg-card-imgs {
          pointer-events: none;
          position: absolute;
          z-index: 0;
          left: 0; top: 0; width: 100%; height: 100%;
        }
        .bg-card-imgs img {
          position: absolute;
          opacity: 0.22;
          width: 140px;
          filter: blur(0.5px);
          transition: opacity 0.5s;
        }
        .bg-card-imgs .carrinho {
          right: -20px; bottom: 10px;
          transform: rotate(-12deg) scale(1.25);
        }
        .bg-card-imgs .vegetal {
          left: -30px; top: 15px;
          transform: rotate(15deg) scale(1.1);
        }
      `}</style>

      {/* Card central */}
      <div
        className="container flex-grow-1 d-flex align-items-center justify-content-center"
        style={{ zIndex: 2 }}
      >
        <div
          className="glass-card p-5 px-4 px-md-5 mx-auto text-center position-relative"
          style={{
            maxWidth: 460,
            width: "100%",
            marginTop: 72,
            marginBottom: 70,
            minHeight: 450,
            zIndex: 3,
          }}
        >
          {/* IMAGENS EXTRAS NO FUNDO DO CARD */}
          <div className="bg-card-imgs">
            {/* Você pode trocar as imagens por outras de alimentos, sacola, etc */}
            <img
              src="https://cdn-icons-png.flaticon.com/512/3176/3176290.png"
              alt=""
              className="carrinho"
              style={{ bottom: 18, right: 5 }}
            />
            <img
              src="https://cdn-icons-png.flaticon.com/512/590/590685.png"
              alt=""
              className="vegetal"
              style={{ top: 14, left: 0 }}
            />
          </div>

          <div className="mb-3 position-relative" style={{ zIndex: 10 }}>
            <i
              className="bi bi-cart4 cart-icon-animate"
              style={{
                fontSize: "7.7rem",
                color: "#198754",
                filter: "drop-shadow(0 0 25px #3bf78777)",
                marginBottom: 16,
                cursor: "pointer",
              }}
              aria-label="Mercado"
              title="Encontre mercados!"
            ></i>
            <h1 className="fw-bold mb-2" style={{ letterSpacing: 2 }}>
              Bem-vindo ao <span className="text-success">LightHand</span>
            </h1>
            <p className="lead mb-4" style={{ fontWeight: 500 }}>
              Encontre mercados próximos de você em segundos.
              <br />
              <span className="text-secondary" style={{ fontWeight: 400 }}>
                Cadastre-se ou faça login para aproveitar ofertas e colaborar
                com a comunidade!
              </span>
            </p>
            <div className="d-flex flex-column flex-md-row justify-content-center gap-3 mb-2">
              <button
                className="btn neon-btn btn-success btn-lg px-4"
                onClick={onRegister}
              >
                Registrar
              </button>
              <button
                className="btn neon-btn btn-outline-success btn-lg px-4"
                onClick={onLogin}
              >
                Login
              </button>
            </div>
          </div>
          <hr className="glass-hr" />
          <small
            className="text-muted"
            style={{ zIndex: 10, position: "relative" }}
          >
            Simples. Rápido.{" "}
            <span style={{ color: "#3bf787", fontWeight: 600 }}>
              Feito para você!
            </span>
            <br />
            <span className="fw-semibold">LightHand</span> &copy;{" "}
            {new Date().getFullYear()}
          </small>
        </div>
      </div>
    </div>
  );
}
