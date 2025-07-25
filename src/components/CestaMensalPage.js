import React from "react";

export default function CestaMensalPage({ onVoltar }) {
  return (
    <div className="container my-5 px-3 px-md-4">
      <button
        className="btn btn-link mb-3"
        onClick={onVoltar}
        style={{ fontSize: "1rem" }}
      >
        &larr; Voltar
      </button>

      <div className="text-center mb-4">
        <h2 className="fw-bold">Clube de Compra por Assinatura</h2>
        <p className="text-muted">
          Receba todo mês uma “Cesta Mensal” surpresa com itens em promoção dos
          mercados parceiros.
        </p>
      </div>

      <section className="mb-5">
        <h4 className="fw-semibold mb-3">Como funciona?</h4>
        <ul style={{ lineHeight: 1.6, fontSize: "1rem" }}>
          <li>
            1. Escolha suas categorias de interesse (padaria, laticínios,
            hortifrúti, mercearia básica).
          </li>
          <li>
            2. A cada mês, o Savvy monta uma cesta com 8–10 itens em
            destaque, otimizando promoções e reduzindo estoque de proximidade de
            validade.
          </li>
          <li>
            3. Disponibilizamos diferentes níveis de assinatura:
            <ul style={{ marginLeft: "1rem", marginTop: "0.5rem" }}>
              <li>Tier Básico – R$ 50 (8−10 itens)</li>
              <li>Tier Intermediário – R$ 80 (10−12 itens)</li>
              <li>Tier Premium – R$ 120 (12−15 itens)</li>
            </ul>
          </li>
          <li>
            4. Você pode optar por entrega (taxa de envio compartilhada) ou
            retirada rápida no caixa do mercado parceiro.
          </li>
        </ul>
      </section>

      <section className="mb-5 text-center">
        <h4 className="fw-semibold mb-3">Assine Agora</h4>
        <p style={{ lineHeight: 1.6, fontSize: "1rem" }}>
          Escolha um plano e garanta sua cesta mensal cheia de ofertas.
        </p>
        <button className="btn btn-primary btn-lg neon-btn">
          Assine a Cesta Mensal
        </button>
      </section>

      <div className="text-center mt-5">
        <small className="text-secondary">
          * A cada assinatura, você ajuda a reduzir desperdícios e ainda
          economiza. 😉
        </small>
      </div>
    </div>
  );
}
