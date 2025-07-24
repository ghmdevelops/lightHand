import { TbShoppingCartDiscount } from "react-icons/tb"; 
import React from "react";
import { FaShoppingCart } from "react-icons/fa";

function getGlassBg() {
  return "rgba(255,255,255,0.89)";
}

export default function LandingPage({ onLogin, onRegister }) {
  return (
    <div
      className="d-flex flex-column min-vh-100 bg-light text-dark"
      style={{
        backgroundColor: "#fff",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          zIndex: 1,
          inset: 0,
          pointerEvents: "none",
        }}
      />

      <style>{`
        .glass-card {
          background: ${getGlassBg()};
          box-shadow: 0 10px 36px 0 #728FCE, 0 2px 16px 0 rgba(43, 229, 217, 0.4);
          border-radius: 2.2rem;
          border: 1.5px solid rgba(255,255,255,0.19);
          backdrop-filter: blur(18px);
          transition: box-shadow 0.3s, transform 0.3s;
          position: relative;
        }
          
        .glass-card:hover {
          box-shadow: 0 12px 54px 0 #728FCE, 0 2.5px 22px 0 rgba(71, 255, 255, 0.56);
          transform: scale(1.028);
        }

        .cart-icon-animate {
          animation: bounceIn 1.2s cubic-bezier(.43,1.43,.58,1.06);
          display: inline-block;
          transition: filter 0.35s, transform 0.35s;
          cursor: pointer;
        }
        .cart-icon-animate:hover {
          filter: brightness(1.19) drop-shadow(0 0 25px #728FCE);
          transform: scale(1.15) rotate(-4deg);
        }
        @keyframes bounceIn {
          0%   { transform: scale(0.5) translateY(90px); opacity: 0.14;}
          60%  { transform: scale(1.14) translateY(-24px);}
          85%  { transform: scale(0.97) translateY(3px);}
          100% { transform: scale(1) translateY(0); opacity: 1;}
        }

        .neon-btn {
          box-shadow: 0 0 8px #728FCE, 0 0 0 rgba(59, 225, 247, 0);
          transition: box-shadow 0.18s, background 0.18s, color 0.17s;
          border-radius: 10px !important;
          font-weight: 600;
          font-size: 1.17rem;
          letter-spacing: 1.5px;
        }
        .neon-btn:hover, .neon-btn:focus {
          box-shadow: 0 0 22px #2F539B, 0 0 60px rgba(95, 247, 229, 0.77);
          background: #2F539B !important;
          color: #fff !important;
          border-color: #2F539B !important;
        }

        /* Linha “glass” */
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
          transition: opacity 0.5s, transform 0.5s;
        }
        .bg-card-imgs .carrinho {
          right: 30px; bottom: 30px;
          transform: rotate(-12deg) scale(1.25);
        }
        .bg-card-imgs .vegetal {
          left: 10px; top: 15px;
          transform: rotate(15deg) scale(1.1);
        }

        .scroll-indicator {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          animation: bounceDown 1.8s infinite;
          font-size: 2rem;
          color: #000000aa;
        }
        @keyframes bounceDown {
          0%, 20% { transform: translateX(-50%) translateY(0); opacity: 1; }
          50%      { transform: translateX(-50%) translateY(10px); opacity: 0.6; }
          100%     { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        .feature-card {
          border: none;
          border-radius: 1rem;
          background: ${getGlassBg()};
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
          color: #1E90FF;
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
          color: #1E90FF;
          background: ${getGlassBg()};
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
          background: ${getGlassBg()};
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
          border: 2px solid #1E90FF;
        }
        .testimonial-navigation {
          margin-top: 1rem;
        }
        .testimonial-navigation button {
          background: #728FCE;
          border: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin: 0 6px;
          transition: background 0.3s;
        }
        .testimonial-navigation button.active {
          background: #1E90FF;
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
            maxWidth: 80000,
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
              alt="a"
              className="carrinho"
            />
            <img
              src="https://cdn-icons-png.flaticon.com/512/590/590685.png"
              alt="b"
              className="vegetal"
            />
          </div>

          <div
            className="mb-4 position-relative text-center"
            style={{
              zIndex: 10,
              maxWidth: 480,
              margin: "auto",
              padding: "0 1rem",
            }}
          >
            <div
              style={{
                fontSize: "170px",
                display: "inline-block",
                transition: "filter 0.3s ease",
                cursor: "default",
              }}
              aria-label="Ícone carrinho"
            >
              <TbShoppingCartDiscount />
            </div>

            <h1
              className="fw-bold mb-3"
              style={{
                letterSpacing: 3,
                fontWeight: 700,
                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                color: "#1E90FF",
                textShadow: "0 2px 6px rgba(30,144,255,0.6)",
                userSelect: "none",
              }}
            >
              Bem-vindo ao <span className="text-primary">Savvy</span>
            </h1>

            <p
              className="lead mb-5"
              style={{
                fontWeight: 500,
                color: "#444",
                fontSize: "1.18rem",
                maxWidth: 380,
                margin: "0 auto",
                lineHeight: 1.5,
                userSelect: "none",
              }}
            >
              Encontre mercados próximos de você em segundos.
              <br />
              <span
                className="text-secondary"
                style={{ fontWeight: 400, fontSize: "1rem" }}
              >
                Cadastre-se ou faça login para aproveitar ofertas e colaborar
                com a comunidade!
              </span>
            </p>

            <div className="d-flex flex-column flex-md-row justify-content-center gap-4">
              <button
                className="btn neon-btn btn-primary btn-lg px-5 fw-semibold"
                onClick={onRegister}
                style={{
                  borderRadius: "12px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 0 12px #1E90FF",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 22px #00CED1")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 12px #1E90FF")
                }
              >
                Registrar
              </button>
              <button
                className="btn neon-btn btn-outline-primary btn-lg px-5 fw-semibold"
                onClick={onLogin}
                style={{
                  borderRadius: "12px",
                  transition: "all 0.3s ease",
                  boxShadow: "0 0 8px #1E90FF inset",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 18px #00CED1 inset")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "0 0 8px #1E90FF inset")
                }
              >
                Login
              </button>
            </div>

            <style>{`
    @keyframes pulseGlow {
      0%, 100% {
        filter: drop-shadow(0 0 12px #1E90FF) drop-shadow(0 0 8px #00CED1);
      }
      50% {
        filter: drop-shadow(0 0 20px #00CED1) drop-shadow(0 0 14px #1E90FF);
      }
    }
  `}</style>
          </div>

          <hr className="glass-hr" />

          <small style={{ zIndex: 10, position: "relative" }}>
            Simples. Rápido.{" "}
            <span style={{ color: "#1E90FF", fontWeight: 600 }}>
              Feito para você!
            </span>
            <br />
            <span className="fw-semibold">Savvy</span> &copy;{" "}
            {new Date().getFullYear()}
          </small>
          <div className="scroll-indicator">
            <i className="bi bi-chevron-double-down"></i>
          </div>
        </div>
      </div>

      <section className="container py-5" style={{ zIndex: 2 }}>
        <h2 className="text-center mb-4 fw-semibold">
          Por que Savvy?
        </h2>
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
        <h2 className="text-center mb-4 fw-semibold">
          Como funciona?
        </h2>
        <div className="row g-4">
          <div className="col-12 col-md-4">
            <div className="feature-card text-center p-4 h-100">
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
            <div className="feature-card text-center p-4 h-100">
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
            <div className="feature-card text-center p-4 h-100">
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
              “O Savvy salvou meu fim de semana! Consegui comparar preços e
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
