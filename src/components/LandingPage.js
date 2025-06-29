import React from "react";
import Footer from "./Footer";
import { FaShoppingCart } from "react-icons/fa";

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
        overflowX: "hidden",
      }}
    >
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
        /* ------------- GLASS CARD ------------- */
        .glass-card {
          background: ${getGlassBg(dark)};
          box-shadow: 0 10px 36px 0 #3bf78742, 0 2px 16px 0 #2be5ab66;
          border-radius: 2.2rem;
          border: 1.5px solid rgba(255,255,255,0.19);
          backdrop-filter: blur(18px);
          transition: box-shadow 0.3s, transform 0.3s;
          position: relative;
        }
        .glass-card:hover {
          box-shadow: 0 12px 54px 0 #3bf78785, 0 2.5px 22px 0 #47ffc790;
          transform: scale(1.028);
        }

        /* Ícones animados no card */
        .cart-icon-animate {
          animation: bounceIn 1.2s cubic-bezier(.43,1.43,.58,1.06);
          display: inline-block;
          transition: filter 0.35s, transform 0.35s;
          cursor: pointer;
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

        /* Botões neon */
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

        /* Linha “glass” */
        .glass-hr {
          border: 0;
          height: 2px;
          background: linear-gradient(90deg, #3bf78744 0%, #b2f2e544 100%);
          margin: 2rem 0 1.5rem 0;
        }

        /* Imagens decorativas no fundo do card hero */
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
          transition: opacity 0.5s, transform 0.5s;
        }
        .bg-card-imgs .carrinho {
          right: -20px; bottom: 10px;
          transform: rotate(-12deg) scale(1.25);
        }
        .bg-card-imgs .vegetal {
          left: -30px; top: 15px;
          transform: rotate(15deg) scale(1.1);
        }

        /* Scroll Indicator (seta para baixo) */
        .scroll-indicator {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          animation: bounceDown 1.8s infinite;
          font-size: 2rem;
          color: #ffffffaa;
        }
        @keyframes bounceDown {
          0%, 20% { transform: translateX(-50%) translateY(0); opacity: 1; }
          50%      { transform: translateX(-50%) translateY(10px); opacity: 0.6; }
          100%     { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        /* ------------- SEÇÕES ABAIXO DO HERO ------------- */
        .feature-card {
          border: none;
          border-radius: 1rem;
          background: ${getGlassBg(dark)};
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.18);
        }
        .feature-icon {
          font-size: 2.2rem;
          color: #3bf787;
          margin-bottom: 12px;
        }

        .step-card {
          border: none;
          background: transparent;
          text-align: center;
          padding: 1rem;
        }
        .step-icon {
          font-size: 2.5rem;
          color: #3bf787;
          background: ${getGlassBg(dark)};
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          margin-bottom: 12px;
        }

        /* Depoimentos slider básico */
        .testimonial-slide {
          display: none;
          text-align: center;
        }
        .testimonial-slide.active {
          display: block;
        }
        .testimonial-card {
          border: none;
          border-radius: 1rem;
          background: ${getGlassBg(dark)};
          backdrop-filter: blur(12px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.1);
          padding: 1.5rem;
          max-width: 480px;
          margin: auto;
        }
        .testimonial-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 12px;
          border: 2px solid #3bf787;
        }
        .testimonial-navigation {
          margin-top: 1rem;
        }
        .testimonial-navigation button {
          background: #3bf78766;
          border: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin: 0 6px;
          transition: background 0.3s;
        }
        .testimonial-navigation button.active {
          background: #3bf787dd;
        }
      `}</style>

      <div
        className="container flex-grow-1 d-flex align-items-center justify-content-center position-relative"
        style={{
          zIndex: 2,
          paddingTop: "40px",
        }}
      >
        <div
          className="glass-card p-5 px-4 px-md-5 mx-auto text-center position-relative"
          style={{
            maxWidth: 460,
            width: "100%",
            marginTop: 72,
            marginBottom: 70,
            minHeight: 500,
            zIndex: 3,
          }}
        >
          <div className="bg-card-imgs">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3176/3176290.png"
              alt=""
              className="carrinho"
            />
            <img
              src="https://cdn-icons-png.flaticon.com/512/590/590685.png"
              alt=""
              className="vegetal"
            />
          </div>

          <div
            className="mb-3 position-relative"
            style={{ zIndex: 10, textAlign: "center" }}
          >
            <div
              style={{
                fontSize: "160px",
                color: "#198754",
                display: "inline-block",
                filter: "drop-shadow(0 0 8px #19875455)",
              }}
            >
              <FaShoppingCart />
            </div>

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
          <div className="scroll-indicator">
            <i className="bi bi-chevron-double-down"></i>
          </div>
        </div>
      </div>

      <section className="container py-5" style={{ zIndex: 2 }}>
        <h2 className="text-center mb-4 fw-semibold">Por que LightHand?</h2>
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="feature-card text-center p-4 h-100">
              <div className="feature-icon mb-3">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h5 className="fw-bold">Rapidez</h5>
              <p className="mx-2 text-secondary">
                Encontre mercados próximos em menos de 30 segundos e veja
                ofertas em tempo real.
              </p>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="feature-card text-center p-4 h-100">
              <div className="feature-icon mb-3">
                <i className="fa-solid fa-users"></i>
              </div>
              <h5 className="fw-bold">Comunidade</h5>
              <p className="mx-2 text-secondary">
                Compartilhe ofertas e descubra promoções postadas por outros
                usuários.
              </p>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="feature-card text-center p-4 h-100">
              <div className="feature-icon mb-3">
                <i className="fa-solid fa-wallet"></i>
              </div>
              <h5 className="fw-bold">Economia</h5>
              <p className="mx-2 text-secondary">
                Compare preços antes de sair de casa e monte seu carrinho para
                economizar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="glass-hr mx-4" />

      <section className="container py-5" style={{ zIndex: 2 }}>
        <h2 className="text-center mb-4 fw-semibold">Como funciona?</h2>
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="step-card">
              <div className="step-icon mb-3">
                <i className="fa-solid fa-map-location-dot"></i>
              </div>
              <h6 className="fw-bold">1. Permita localização</h6>
              <p className="text-secondary">
                Autorize acesso ao GPS para encontrar mercados próximos.
              </p>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="step-card">
              <div className="step-icon mb-3">
                <i className="fa-solid fa-magnifying-glass"></i>
              </div>
              <h6 className="fw-bold">2. Busque mercados</h6>
              <p className="text-secondary">
                Toque em “Buscar Mercados” e veja uma lista das lojas em sua
                região.
              </p>
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="step-card">
              <div className="step-icon mb-3">
                <i className="fa-solid fa-cart-shopping"></i>
              </div>
              <h6 className="fw-bold">3. Confira ofertas</h6>
              <p className="text-secondary">
                Selecione um mercado para ver ofertas, salvar favoritos ou
                montar seu carrinho.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="glass-hr mx-4" />

      <section className="container py-5 mb-5" style={{ zIndex: 2 }}>
        <h2 className="text-center mb-4 fw-semibold">
          O que dizem nossos usuários
        </h2>

        <div className="testimonial-slide active" id="t1">
          <div className="testimonial-card mx-auto">
            <img
              src="https://i.pravatar.cc/100?img=5"
              alt="Avatar"
              className="testimonial-avatar mb-2"
            />
            <p className="text-secondary mb-2">
              “O LightHand salvou meu fim de semana! Consegui comparar preços e
              encontrei ofertas incríveis bem pertinho de mim.”
            </p>
            <strong>Maria Fernandes</strong>
          </div>
        </div>
        <div className="testimonial-slide" id="t2">
          <div className="testimonial-card mx-auto">
            <img
              src="https://i.pravatar.cc/100?img=14"
              alt="Avatar"
              className="testimonial-avatar mb-2"
            />
            <p className="text-secondary mb-2">
              “A comunidade de usuários é ótima: descobri promoções que nem
              sabia que existiam no meu bairro!”
            </p>
            <strong>João Silva</strong>
          </div>
        </div>
        <div className="testimonial-slide" id="t3">
          <div className="testimonial-card mx-auto">
            <img
              src="https://i.pravatar.cc/100?img=22"
              alt="Avatar"
              className="testimonial-avatar mb-2"
            />
            <p className="text-secondary mb-2">
              “Uso para montar meu carrinho antes de ir ao mercado. Economia
              garantida!”
            </p>
            <strong>Paulo Mendes</strong>
          </div>
        </div>

        {/* Navegação (simples) */}
        <div className="text-center testimonial-navigation">
          <button
            className="active"
            onClick={() => {
              document.getElementById("t1").classList.add("active");
              document.getElementById("t2").classList.remove("active");
              document.getElementById("t3").classList.remove("active");
              document
                .querySelectorAll(".testimonial-navigation button")
                .forEach((b) => b.classList.remove("active"));
              document
                .querySelector(".testimonial-navigation button:nth-child(1)")
                .classList.add("active");
            }}
          />
          <button
            onClick={() => {
              document.getElementById("t1").classList.remove("active");
              document.getElementById("t2").classList.add("active");
              document.getElementById("t3").classList.remove("active");
              document
                .querySelectorAll(".testimonial-navigation button")
                .forEach((b) => b.classList.remove("active"));
              document
                .querySelector(".testimonial-navigation button:nth-child(2)")
                .classList.add("active");
            }}
          />
          <button
            onClick={() => {
              document.getElementById("t1").classList.remove("active");
              document.getElementById("t2").classList.remove("active");
              document.getElementById("t3").classList.add("active");
              document
                .querySelectorAll(".testimonial-navigation button")
                .forEach((b) => b.classList.remove("active"));
              document
                .querySelector(".testimonial-navigation button:nth-child(3)")
                .classList.add("active");
            }}
          />
        </div>
      </section>
    </div>
  );
}
