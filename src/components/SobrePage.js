import React from "react";

export default function SobrePage() {
  return (
    <div
      className="container my-5 px-3 px-md-4"
      style={{
        zIndex: 2,
        paddingTop: "70px",
      }}
    >
      <div
        className="text-center text-white rounded-4 py-5 mb-5"
        style={{
          background: "linear-gradient(135deg, #2B60DE, #2B60DE)",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
        }}
      >
        <i
          className="bi bi-cart4 mb-3"
          style={{ fontSize: "3rem", opacity: 0.9 }}
        ></i>
        <h1 className="fw-bold" style={{ letterSpacing: "1px" }}>
          Savvy
        </h1>
        <p className="fs-5 fw-light">
          Conectando pessoas e mercados com leveza e tecnologia
        </p>
        <small className="fst-italic">São Paulo, SP • 30 maio 2025</small>
      </div>
      <section className="mb-5">
        <h4
          className="fw-semibold mb-4 position-relative"
          style={{ fontSize: "1.5rem" }}
        >
          <i
            className="bi bi-eye-fill me-2"
            style={{ color: "#1E90FF", fontSize: "1.4rem" }}
          ></i>
          Visão geral do produto
        </h4>
        <div
          className="p-4 rounded-4"
          style={{
            background: "#DBE9FA",
            border: "1px solid #2B60DE",
            boxShadow: "0 4px 16px rgba(25, 76, 135, 0.1)",
          }}
        >
          <p style={{ lineHeight: 1.6, fontSize: "1rem", color: "#000" }}>
            Savvy é um aplicativo de varejo que traz todas as grandes redes
            de mercado para a palma da sua mão. Aqui você confere promoções em
            tempo real, compara preços em diferentes lojas e monta seu carrinho
            online antes mesmo de sair de casa. A partir da sua localização, o
            app sugere o mercado mais vantajoso no momento, ajudando você a
            economizar tempo e dinheiro com apenas um toque.
          </p>
        </div>
      </section>

      <section className="mb-5">
        <h4
          className="fw-semibold mb-4 position-relative"
          style={{ fontSize: "1.5rem" }}
        >
          <i
            className="bi bi-book-half me-2"
            style={{ color: "#1E90FF", fontSize: "1.4rem" }}
          ></i>
          História
        </h4>
        <div className="row gx-4 align-items-center" style={{ gap: "1rem" }}>
          <div className="col-12 col-md-6">
            <p style={{ lineHeight: 1.6, fontSize: "1rem" }}>
              A ideia surgiu de amigos apaixonados por tecnologia, que queriam
              facilitar a rotina de quem faz compras no mercado. Cada um trouxe
              suas habilidades design, desenvolvimento, marketing e logística
              para criar uma plataforma simples e intuitiva. Desde o primeiro
              protótipo, percebemos que nosso foco seria a experiência do
              usuário: nada de telas complicadas ou centenas de cliques para
              encontrar uma promoção. Assim nasceu o Savvy, com o objetivo
              de tornar a compra no mercado mais leve, rápida e divertida.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <h4
          className="fw-semibold mb-4 position-relative"
          style={{ fontSize: "1.5rem" }}
        >
          <i
            className="bi bi-flag-fill me-2"
            style={{ color: "#1E90FF", fontSize: "1.4rem" }}
          ></i>
          Missão, Visão e Valores
        </h4>
        <div className="row row-cols-1 row-cols-md-3 g-4">
          <div className="col">
            <div
              className="card h-100 border-0 shadow-sm"
              style={{
                borderRadius: "16px",
                background: "#DBE9FA",
              }}
            >
              <div className="card-body">
                <h5 className="card-title text-primary">Missão</h5>
                <p
                  className="card-text"
                  style={{ fontSize: "0.95rem", lineHeight: 1.5 }}
                >
                  Criar soluções que tragam praticidade ao dia a dia de todos,
                  visando poupar tempo e dinheiro.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div
              className="card h-100 border-0 shadow-sm"
              style={{
                borderRadius: "16px",
                background: "#DBE9FA",
              }}
            >
              <div className="card-body">
                <h5 className="card-title text-primary">Visão</h5>
                <p
                  className="card-text"
                  style={{ fontSize: "0.95rem", lineHeight: 1.5 }}
                >
                  Ser a plataforma de referência que conecta pessoas e mercados
                  de forma inovadora e leve.
                </p>
              </div>
            </div>
          </div>
          <div className="col">
            <div
              className="card h-100 border-0 shadow-sm"
              style={{
                borderRadius: "16px",
                background: "#DBE9FA",
              }}
            >
              <div className="card-body">
                <h5 className="card-title text-primary">Valores</h5>
                <ul
                  className="card-text"
                  style={{ fontSize: "0.95rem", lineHeight: 1.5 }}
                >
                  <li>Inovação contínua</li>
                  <li>Transparência e confiança</li>
                  <li>Foco no usuário</li>
                  <li>Colaboração e respeito</li>
                  <li>Compromisso com a qualidade</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-5">
        <h4
          className="fw-semibold mb-4 position-relative"
          style={{ fontSize: "1.5rem" }}
        >
          <i
            className="bi bi-people-fill me-2"
            style={{ color: "#1E90FF", fontSize: "1.4rem" }}
          ></i>
          Missao
        </h4>
        
        <div className="row row-cols-1 row-cols-md-2 gy-4">
          {["Gehaime Barros", "Robinson Silva"].map((nome) => (
            <div key={nome} className="col">
              <div
                className="card h-100 border-0 shadow-sm d-flex flex-row align-items-center px-4 py-3"
                style={{
                  borderRadius: "16px",
                  background: "#DBE9FA",
                  transition: "background 0.3s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#A0CFEC")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#DBE9FA")
                }
              >
                <div
                  className="rounded-circle bg-primary text-white d-flex justify-content-center align-items-center me-3"
                  style={{
                    width: 50,
                    height: 50,
                    fontWeight: 600,
                    fontSize: "1.2rem",
                  }}
                >
                  {nome
                    .split(" ")
                    .map((word) => word.charAt(0))
                    .join("")}
                </div>
                <div>
                  <h6 className="mb-1" style={{ fontWeight: 500 }}>
                    {nome}
                  </h6>
                  <small className="text-secondary">
                    Equipe de Desenvolvimento
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="text-center mt-5">
        <button
          className="btn btn-outline-secondary btn-lg"
          style={{
            borderRadius: "20px",
            fontWeight: 500,
            letterSpacing: 0.5,
            transition: "background 0.3s, color 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#0059FF";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#6c757d";
          }}
          onClick={() => (window.location.href = "/")}
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}
