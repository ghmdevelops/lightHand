import React, { useState } from "react";
import { TbShoppingCartDiscount } from "react-icons/tb";
import {
  FaBolt,
  FaUsers,
  FaWallet,
  FaMapLocationDot,
  FaMagnifyingGlass,
  FaCartShopping,
} from "react-icons/fa6";

export default function LandingPage({ onLogin, onRegister }) {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = [
    {
      avatar: "https://i.pravatar.cc/100?img=5",
      text: "“O Savvy salvou meu fim de semana! Consegui comparar preços e encontrei ofertas incríveis bem pertinho de mim.”",
      author: "Maria Fernandes",
    },
    {
      avatar: "https://i.pravatar.cc/100?img=14",
      text: "“A comunidade de usuários é ótima: descobri promoções que nem sabia que existiam no meu bairro!”",
      author: "João Silva",
    },
    {
      avatar: "https://i.pravatar.cc/100?img=22",
      text: "“Uso para montar meu carrinho antes de ir ao mercado. Economia garantida!”",
      author: "Paulo Mendes",
    },
  ];

  return (
    <>
      <style>{`
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #2c3e50;
        }
        
        .hero-section {
          background-color: #f0f2f5;
          background-image: radial-gradient(circle at 1% 1%, hsla(211, 100%, 94%, 1.00) 0%, transparent 50%), 
                            radial-gradient(circle at 99% 99%, hsla(217, 100%, 91%, 1) 0%, transparent 40%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }
        .content-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1100px;
          width: 100%;
          gap: 3rem;
        }
        .text-content {
          max-width: 520px;
          flex-shrink: 0;
        }
        .main-headline {
          font-size: clamp(2.5rem, 5vw, 3.5rem);
          font-weight: 700;
          color: #4565c4ff;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }
        .main-headline span {
            color: #1E90FF;
        }
        .sub-headline {
          font-size: 1.25rem;
          font-weight: 600;
          color: #4585c4ff;
          margin-bottom: 0.75rem;
        }
        .description {
          font-size: 1.1rem;
          color: #4a5568;
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }
        .button-group {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .btn-custom {
          padding: 0.8rem 1.8rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 1rem;
          border: 2px solid transparent;
          transition: all 0.2s ease-in-out;
          cursor: pointer;
        }
        .btn-primary-custom {
          background-color: #046acfff;
          color: white;
        }
        .btn-primary-custom:hover {
          background-color: #3a669fff;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .btn-secondary-custom {
          background-color: white;
          color: #4582c4ff;
          border-color: #d9ddf0ff;
        }
        .btn-secondary-custom:hover {
          background-color: #1f6cd2ff;
          color: #ffffff;
          border-color: #4589c4ff;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .visual-content {
          flex-grow: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .icon-showcase {
          font-size: clamp(15rem, 30vw, 24rem);
          color: #6eaae3ff;
          opacity: 0.6;
          filter: drop-shadow(0 10px 30px rgba(88, 69, 196, 0.2));
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        .footer-note {
          position: absolute;
          bottom: 1rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.9rem;
          color: #667;
          text-align: center;
        }
        
        .page-content-wrapper {
          background-color: #ffffff;
        }
        .content-section {
          padding: 5rem 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-title {
          text-align: center;
          font-size: 2.25rem;
          font-weight: 600;
          color: #1a202c;
          margin-bottom: 3.5rem;
        }
        .section-separator {
          border: 0;
          height: 1px;
          background-color: #e2e8f0;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }
        .info-card {
          background-color: #f8f9fa;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .info-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 10px 20px rgba(45, 55, 72, 0.08);
        }
        .info-card-icon {
          font-size: 2.5rem;
          color: #1E90FF;
          margin-bottom: 1rem;
        }
        .step-icon-wrapper {
          background-color: #e6f7ffff;
          width: 70px;
          height: 70px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          color: #4578c4ff;
          font-size: 1.8rem;
        }
        .info-card h5 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }
        .info-card h6 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }
        .info-card p {
          color: #718096;
          line-height: 1.6;
        }

        .testimonial-card {
            max-width: 650px;
            margin: 0 auto;
            background: #f8f9fa;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
        }
        .testimonial-avatar {
             width: 70px;
             height: 70px;
             border-radius: 50%;
             object-fit: cover;
             margin-bottom: 1rem;
             border: 3px solid #6ebae3ff;
        }
        .testimonial-text {
             font-style: italic;
             color: #4a5568;
             margin-bottom: 1rem;
             font-size: 1.1rem;
        }
        .testimonial-author {
             font-weight: 600;
             color: #2d3748;
        }
        .testimonial-nav {
            margin-top: 1.5rem;
            text-align: center;
        }
        .testimonial-nav-button {
            background-color: #d9e2f0ff;
            border: none;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin: 0 6px;
            cursor: pointer;
            transition: background-color 0.3s, transform 0.3s;
        }
        .testimonial-nav-button.active {
            background-color: #4585c4ff;
            transform: scale(1.2);
        }

        @media (max-width: 992px) {
          .visual-content { display: none; }
          .text-content {
            max-width: 600px;
            text-align: center;
            margin: 0 auto;
          }
          .button-group { justify-content: center; }
        }
        @media (max-width: 576px) {
           .hero-section { padding: 1rem; }
           .button-group { flex-direction: column; align-items: stretch; }
           .content-section { padding: 3rem 1rem; }
        }
      `}</style>

      <div className="page-wrapper">
        <header className="hero-section py-5">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-lg-6 text-content text-center text-lg-start mb-4 mb-lg-0">
                <h1 className="main-headline">
                  Bem-vindo ao <span>Savvy</span>
                </h1>
                <p className="sub-headline">
                  Encontre mercados e postos próximos de você em segundos.
                </p>
                <p className="description">
                  <strong>Não perca tempo!</strong> Cadastre-se ou faça login agora para desbloquear ofertas exclusivas e economizar junto.
                </p>

                <div className="button-group d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
                  <button
                    className="btn-custom btn-primary-custom"
                    onClick={onRegister}
                  >
                    Registrar
                  </button>
                  <button
                    className="btn-custom btn-secondary-custom"
                    onClick={onLogin}
                  >
                    Login
                  </button>
                </div>
              </div>

              <div className="col-lg-6 d-none d-lg-flex justify-content-center visual-content">
                <TbShoppingCartDiscount className="icon-showcase" />
              </div>
            </div>

            <footer className="footer-note text-center mt-4">
              Savvy &copy; {new Date().getFullYear()}
            </footer>
          </div>
        </header>


        <main className="page-content-wrapper">
          <section className="content-section">
            <h2 className="section-title">Por que Savvy?</h2>
            <div className="cards-grid">
              <div className="info-card">
                <div className="info-card-icon"><FaBolt /></div>
                <h5>Rapidez</h5>
                <p>Encontre mercados e postos próximos em segundos e veja ofertas em tempo real.</p>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><FaUsers /></div>
                <h5>Comunidade</h5>
                <p>Compartilhe ofertas e descubra promoções postadas por outros usuários.</p>
              </div>
              <div className="info-card">
                <div className="info-card-icon"><FaWallet /></div>
                <h5>Economia</h5>
                <p>Compare preços antes de sair de casa e monte seu carrinho para economizar.</p>
              </div>
            </div>
          </section>

          <hr className="section-separator" />

          <section className="content-section">
            <h2 className="section-title">Como funciona?</h2>
            <div className="cards-grid">
              <div className="info-card">
                <div className="step-icon-wrapper"><FaMapLocationDot /></div>
                <h6>1. Permita localização</h6>
                <p>Autorize acesso ao GPS para encontrar mercados próximos a você.</p>
              </div>
              <div className="info-card">
                <div className="step-icon-wrapper"><FaMagnifyingGlass /></div>
                <h6>2. Busque mercados e postos</h6>
                <p>Toque em “Buscar” e veja uma lista das lojas em sua região.</p>
              </div>
              <div className="info-card">
                <div className="step-icon-wrapper"><FaCartShopping /></div>
                <h6>3. Confira ofertas</h6>
                <p>Selecione um mercado ou posto para ver ofertas, salvar favoritos ou montar seu carrinho.</p>
              </div>
            </div>
          </section>

          <hr className="section-separator" />

          <section className="content-section">
            <h2 className="section-title">O que dizem nossos usuários</h2>
            <div className="testimonial-card">
              <img
                src={testimonials[activeTestimonial].avatar}
                alt="Avatar do usuário"
                className="testimonial-avatar"
              />
              <p className="testimonial-text">
                {testimonials[activeTestimonial].text}
              </p>
              <strong className="testimonial-author">
                {testimonials[activeTestimonial].author}
              </strong>
            </div>
            <div className="testimonial-nav">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`testimonial-nav-button ${activeTestimonial === index ? "active" : ""
                    }`}
                  onClick={() => setActiveTestimonial(index)}
                  aria-label={`Ver depoimento ${index + 1}`}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}