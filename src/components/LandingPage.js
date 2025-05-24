import React from "react";
import NavBar from "./NavBar";
import Footer from "./Footer";

export default function LandingPage({ onLogin, onRegister }) {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/*<NavBar onLogin={onLogin} onRegister={onRegister} />*/}
      <div className="container text-center flex-grow-1 mt-5 mb-5">
        <div className="mb-4">
          <h1>Bem-vindo ao App LIGHT HAND!</h1>
          <p className="lead">
            Ache mercados próximos de você em segundos. Cadastre-se ou faça
            login para começar!
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80"
          alt="Caixa supermercado"
          className="img-fluid rounded"
          style={{ maxWidth: "400px" }}
        />
      </div>
      <Footer />
    </div>
  );
}
