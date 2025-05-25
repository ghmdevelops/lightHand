import React, { useState } from "react";

export default function NavBar({
  user,
  onLogin,
  onRegister,
  onPerfil,
  onLogout,
  dark,
  setDark,
  cartsCount,
  onShowCarts,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className={`navbar navbar-expand-lg fixed-top px-3 ${
        dark ? "navbar-dark bg-dark" : "navbar-light bg-light"
      }`}
      style={{
        backdropFilter: "blur(8px)",
        background: dark ? "rgba(30, 30, 30, 0.87)" : "rgba(255,255,255,0.85)",
        borderBottom: dark ? "1px solid #21252922" : "1px solid #19875422",
        boxShadow: "0 2px 12px #0002",
        transition: "background 0.3s",
        zIndex: 1030,
      }}
    >
      <div className="container-fluid">
        <a className="navbar-brand d-flex align-items-center gap-2" href="/">
          <span
            style={{
              fontSize: "2rem",
              color: "#198754",
              filter: "drop-shadow(0 0 8px #19875455)",
              transition: "color 0.2s",
              display: "flex",
              alignItems: "center",
            }}
          >
            <i className="fa-solid fa-hand-holding-heart"></i>
          </span>
          <span
            className="fw-bold"
            style={{
              fontWeight: 600,
              fontSize: "1.25rem",
              letterSpacing: ".01em",
              opacity: 0.92,
            }}
          >
            LightHand
          </span>
        </a>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Menu"
          onClick={() => setMenuOpen((open) => !open)}
          style={{
            border: "none",
            outline: "none",
            boxShadow: "none",
            background: "transparent",
          }}
        >
          <span>
            <i
              className={`fa-solid ${menuOpen ? "fa-xmark" : "fa-bars"}`}
              style={{
                fontSize: "1.45rem",
                color: dark ? "#fff" : "#222",
                transition: "color 0.2s",
              }}
            />
          </span>
        </button>

        <div
          className={`collapse navbar-collapse justify-content-end ${
            menuOpen ? "show" : ""
          }`}
        >
          <ul className="navbar-nav align-items-center gap-lg-2 gap-3">
            <li>
              <button
                className={`btn btn-sm px-2 border-0`}
                style={{
                  borderRadius: "100px",
                  background: dark ? "#212529bb" : "#dff6e2ee",
                  color: dark ? "#fff" : "#198754",
                  transition: "all 0.3s",
                  boxShadow: dark ? "0 2px 8px #1113" : "0 2px 8px #19875418",
                  fontWeight: 500,
                  fontSize: "1rem",
                }}
                onClick={() => setDark((d) => !d)}
                title={dark ? "Modo Claro" : "Modo Escuro"}
              >
                <i
                  className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`}
                  style={{ fontSize: "1.1rem", marginRight: 6 }}
                />
                {dark ? "Claro" : "Escuro"}
              </button>
            </li>
            {user && (
              <li className="position-relative">
                <button
                  className="btn btn-outline-success btn-sm px-2 border-0"
                  style={{
                    borderRadius: "999px",
                    background: dark ? "#232b2675" : "#e9f9f5",
                    transition: "all 0.3s",
                  }}
                  onClick={onShowCarts}
                  title="Meus Carrinhos"
                >
                  <i className="fa-solid fa-cart-shopping" />
                  {cartsCount > 0 && (
                    <span
                      className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                      style={{
                        fontSize: ".8rem",
                        minWidth: 20,
                        marginLeft: "-6px",
                        marginTop: "-4px",
                        boxShadow: "0 1px 5px #0004",
                      }}
                    >
                      {cartsCount}
                    </span>
                  )}
                </button>
              </li>
            )}
            {user ? (
              <>
                <li>
                  <button
                    className="btn btn-outline-secondary btn-sm px-3 border-0"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onPerfil}
                  >
                    <i className="fa-solid fa-user" /> Perfil
                  </button>
                </li>
                <li>
                  <button
                    className="btn btn-danger btn-sm px-3 border-0"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onLogout}
                  >
                    <i className="fa-solid fa-sign-out-alt" /> Sair
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <button
                    className="btn btn-outline-primary btn-sm px-3 border-0"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onLogin}
                  >
                    <i className="fa-solid fa-sign-in-alt" /> Login
                  </button>
                </li>
                <li>
                  <button
                    className="btn btn-success btn-sm px-3 border-0"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onRegister}
                  >
                    <i className="fa-solid fa-user-plus" /> Registrar
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
