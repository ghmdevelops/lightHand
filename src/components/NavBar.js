// src/components/NavBar.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

export default function NavBar({
  user,
  avatarURL,
  avatarIcon,
  onLogin,
  onRegister,
  onLogout,
  dark,
  setDark,
  cartsCount,
  onShowCarts,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Navbar
      expand="lg"
      expanded={expanded}
      fixed="top"
      variant={dark ? "dark" : "light"}
      className="px-3"
      style={{
        backdropFilter: "blur(8px)",
        background: dark ? "rgba(30, 30, 30, 0.87)" : "rgba(255,255,255,0.85)",
        borderBottom: dark ? "1px solid #21252922" : "1px solid #19875422",
        boxShadow: "0 2px 12px #0002",
        transition: "background 0.3s",
        zIndex: 1030,
      }}
    >
      <Container fluid>
        <Navbar.Brand
          as={Link}
          to="/"
          className="d-flex align-items-center gap-2"
        >
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
            <i className="fa-solid fa-hand-holding-heart" />
          </span>
          <span
            className="fw-bold d-none d-lg-inline"
            style={{
              fontWeight: 600,
              fontSize: "1.25rem",
              letterSpacing: ".01em",
              opacity: 0.92,
            }}
          >
            LightHand
          </span>
        </Navbar.Brand>

        {/* MOBILE (< lg): apenas ícones */}
        <div className="d-flex d-lg-none ms-auto align-items-center gap-2">
          {user && (
            /* Carrinho só aparece quando logado */
            <Button
              size="sm"
              variant="outline-success"
              onClick={onShowCarts}
              style={{
                borderRadius: "999px",
                background: dark ? "#232b2675" : "#e9f9f5",
                transition: "all 0.3s",
                position: "relative",
                width: "36px",
                height: "36px",
                padding: 0,
              }}
              title="Meus Carrinhos"
              className="d-flex justify-content-center align-items-center"
            >
              <i className="fa-solid fa-cart-shopping" />
              {cartsCount > 0 && (
                <Badge
                  bg="danger"
                  pill
                  style={{
                    fontSize: ".65rem",
                    position: "absolute",
                    top: "2px",
                    right: "-2px",
                  }}
                >
                  {cartsCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Tema (ícone somente) */}
          <Button
            size="sm"
            variant="link"
            onClick={() => setDark((d) => !d)}
            style={{
              padding: 0,
              border: "none",
              background: "transparent",
              width: "36px",
              height: "36px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
            title={dark ? "Modo Claro" : "Modo Escuro"}
          >
            <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
          </Button>

          {!user && (
            <>
              {/* “Login” (ícone só) */}
              <Button
                size="sm"
                variant="link"
                onClick={onLogin}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                title="Login"
              >
                <i className="fa-solid fa-sign-in-alt" />
              </Button>
              <Button
                size="sm"
                variant="link"
                onClick={onRegister}
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                title="Registrar"
              >
                <i className="fa-solid fa-user-plus" />
              </Button>
            </>
          )}

          {user && (
            /* Avatar dropdown (ícone só) */
            <Dropdown align="end" onToggle={() => setExpanded(false)}>
              <Dropdown.Toggle
                as={Button}
                variant="link"
                id="avatar-dropdown-mobile"
                style={{
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  overflow: "hidden",
                }}
              >
                {avatarURL ? (
                  <img
                    src={avatarURL}
                    alt="Avatar"
                    className="img-fluid"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "#198754",
                      color: "#fff",
                      fontSize: "1.1rem",
                    }}
                  >
                    <i className={`fa-solid ${avatarIcon || "fa-user"}`} />
                  </div>
                )}
              </Dropdown.Toggle>
              <Dropdown.Menu
                variant={dark ? "dark" : ""}
                style={{ minWidth: "12rem" }}
              >
                <Dropdown.Header>
                  Olá, {user.displayName || user.email}
                </Dropdown.Header>
                <Dropdown.Item as={Link} to="/perfil">
                  <i className="bi bi-person-circle me-2" /> Perfil
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/passaporte">
                  <i className="bi bi-forward me-2" /> Passaporte
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/trocas">
                  <i className="fa-solid fa-exchange-alt me-2" /> Club de Trocas
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/favoritos">
                  <i className="bi bi-star-fill me-2" /> Favoritos
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/previsao">
                  <i className="bi bi-bar-chart-line-fill me-2" /> Previsão de
                  Gastos
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/cupons">
                  <i className="bi bi-wallet2 me-2" /> Pagamentos &amp; Cupons
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={onLogout} className="text-danger">
                  <i className="bi bi-box-arrow-right me-2" /> Sair
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center gap-lg-2 gap-3">
            <Nav.Item className="d-none d-lg-flex">
              <Button
                size="sm"
                variant={dark ? "light" : "outline-success"}
                onClick={() => setDark((d) => !d)}
                style={{ borderRadius: "100px", fontWeight: 500, minWidth: 80 }}
                title={dark ? "Modo Claro" : "Modo Escuro"}
                className="d-flex align-items-center"
              >
                <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
                <span className="ms-1"> {dark ? "Claro" : "Escuro"}</span>
              </Button>
            </Nav.Item>

            {user ? (
              <>
                {/* Carrinho (desktop ≥ lg): ícone + badge */}
                <Nav.Item className="position-relative d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant="outline-success"
                    onClick={() => {
                      setExpanded(false);
                      onShowCarts();
                    }}
                    style={{
                      borderRadius: "999px",
                      background: dark ? "#232b2675" : "#e9f9f5",
                      transition: "all 0.3s",
                    }}
                    title="Meus Carrinhos"
                    className="d-flex align-items-center"
                  >
                    <i className="fa-solid fa-cart-shopping" />
                    {cartsCount > 0 && (
                      <Badge
                        bg="danger"
                        pill
                        className="ms-1"
                        style={{
                          fontSize: ".7rem",
                          position: "absolute",
                          top: "2px",
                          right: "-2px",
                        }}
                      >
                        {cartsCount}
                      </Badge>
                    )}
                  </Button>
                </Nav.Item>

                {/* Avatar Dropdown (desktop ≥ lg) */}
                <Nav.Item className="d-none d-lg-flex">
                  <Dropdown align="end" onToggle={() => setExpanded(false)}>
                    <Dropdown.Toggle
                      as={Button}
                      variant="link"
                      id="avatar-dropdown-desktop"
                      style={{
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        overflow: "hidden",
                      }}
                    >
                      {avatarURL ? (
                        <img
                          src={avatarURL}
                          alt="Avatar"
                          className="img-fluid"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          className="d-flex justify-content-center align-items-center"
                          style={{
                            width: "100%",
                            height: "100%",
                            background: "#198754",
                            color: "#fff",
                            fontSize: "1.2rem",
                          }}
                        >
                          <i
                            className={`fa-solid ${avatarIcon || "fa-user"}`}
                          />
                        </div>
                      )}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                      variant={dark ? "dark" : ""}
                      style={{ minWidth: "12rem" }}
                    >
                      <Dropdown.Header>
                        Olá, {user.displayName || user.email}
                      </Dropdown.Header>
                      <Dropdown.Item
                        as={Link}
                        to="/perfil"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-person-circle me-2" /> Perfil
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/passaporte"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-forward me-2" /> Passaporte
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/trocas"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="fa-solid fa-exchange-alt me-2" /> Club de
                        Trocas
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/favoritos"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-star-fill me-2" /> Favoritos
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/previsao"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-bar-chart-line-fill me-2" />{" "}
                        Previsão de Gastos
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/cupons"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-wallet2 me-2" /> Pagamentos &amp;
                        Cupons
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={onLogout} className="text-danger">
                        <i className="bi bi-box-arrow-right me-2" /> Sair
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Nav.Item>
              </>
            ) : (
              <>
                {/* “Login” (desktop ≥ lg) */}
                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onLogin}
                  >
                    <i className="fa-solid fa-sign-in-alt me-1" /> Login
                  </Button>
                </Nav.Item>

                {/* “Registrar” (desktop ≥ lg) */}
                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant="success"
                    style={{
                      borderRadius: "999px",
                      fontWeight: 500,
                      letterSpacing: ".01em",
                    }}
                    onClick={onRegister}
                  >
                    <i className="fa-solid fa-user-plus me-1" /> Registrar
                  </Button>
                </Nav.Item>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
