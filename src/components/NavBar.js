import React from "react";

export default function NavBar({
  user,
  onLogin,
  onRegister,
  onPerfil,
  onLogout,
  dark,
  setDark,
  cartsCount, // número de carrinhos salvos
  onShowCarts, // callback para abrir a tela de carrinhos
}) {
  return (
    <nav
      className={`navbar navbar-expand-lg ${
        dark ? "navbar-dark bg-dark" : "navbar-light bg-light"
      } shadow-sm`}
    >
      <div className="container">
        <a className="navbar-brand fw-bold" href="/">
          LightHand
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarBtns"
          aria-controls="navbarBtns"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className="collapse navbar-collapse justify-content-end"
          id="navbarBtns"
        >
          <ul className="navbar-nav mb-2 mb-lg-0 align-items-lg-center">
            {/* Dark/Light Mode */}
            <li className="nav-item me-3">
              <button
                className={`btn btn-${dark ? "light" : "dark"} btn-sm`}
                onClick={() => setDark((d) => !d)}
                title={dark ? "Modo Claro" : "Modo Escuro"}
                style={{ borderRadius: "20px", minWidth: 70 }}
              >
                {dark ? "🌙 Dark" : "☀️ Light"}
              </button>
            </li>

            {/* Ícone de Carrinho com badge, só quando logado */}
            {user && (
              <li className="nav-item me-3 position-relative">
                <button
                  className="btn btn-outline-primary btn-sm position-relative"
                  onClick={onShowCarts}
                  title="Meus Carrinhos"
                  style={{ borderRadius: "20px" }}
                >
                  🛒
                  {cartsCount > 0 && (
                    <span
                      className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                      style={{ fontSize: "0.65rem" }}
                    >
                      {cartsCount}
                    </span>
                  )}
                </button>
              </li>
            )}

            {user ? (
              <>
                <li className="nav-item me-2">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={onPerfil}
                  >
                    Meu Perfil
                  </button>
                </li>
                <li className="nav-item">
                  <button className="btn btn-outline-danger" onClick={onLogout}>
                    Sair
                  </button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item me-2">
                  <button className="btn btn-outline-primary" onClick={onLogin}>
                    Login
                  </button>
                </li>
                <li className="nav-item">
                  <button className="btn btn-primary" onClick={onRegister}>
                    Registrar
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
