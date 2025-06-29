import { BiUserPlus } from "react-icons/bi";
import { FaUserAlt } from "react-icons/fa";
import { FaUserCircle } from "react-icons/fa";
// src/components/NavBar.js
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import logo from "./img/check_list.png";

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
        borderBottom: dark ? "1px solid #3D3C3A" : "1px solid #19875422",
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
              color: "#3D3C3A",
              filter: "drop-shadow(0 0 8px #3D3C3A)",
              transition: "color 0.2s",
              display: "flex",
              alignItems: "center",
              backgroundColor: "#3A3B3C",
              borderRadius: "12rem",
              padding: "5px",
              boxShadow: "0 0 10px #3D3C3A",
            }}
          >
            <img
              src={logo}
              alt="Logo"
              style={{ width: "60px", height: "60px", objectFit: "contain" }}
            />
          </span>
        </Navbar.Brand>

        <div className="d-flex d-lg-none ms-auto align-items-center gap-2">
          {user && (
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
              {Number(cartsCount) > 0 && (
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

          <Button
            size="sm"
            variant={dark ? "outline-light" : "outline-success"}
            onClick={() => setDark((d) => !d)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              padding: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              background: dark ? "#232b26aa" : "#ffffffcc",
              boxShadow: dark
                ? "0 0 6px rgba(255,255,255,0.1)"
                : "0 0 6px rgba(0,0,0,0.1)",
              transition: "all 0.3s ease",
            }}
            title={dark ? "Modo Claro" : "Modo Escuro"}
          >
            <i
              className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`}
              style={{
                fontSize: "1rem",
                color: dark ? "#ffc107" : "#198754",
                filter: `drop-shadow(0 0 4px ${
                  dark ? "#ffc10799" : "#19875455"
                })`,
                transition: "color 0.3s, filter 0.3s",
              }}
            />
          </Button>

          {!user && (
            <>
              <Button
                size="sm"
                variant={dark ? "outline-light" : "outline-success"}
                style={{
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 0,
                  boxShadow: dark
                    ? "0 0 4px rgba(255,255,255,0.1)"
                    : "0 0 4px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
                  background: dark ? "#232b26aa" : "#ffffffcc",
                }}
                onClick={onLogin}
                title="Login"
              >
                <FaUserAlt size={16} />
              </Button>

              <Button
                size="sm"
                variant={dark ? "outline-light" : "outline-success"}
                style={{
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 0,
                  boxShadow: dark
                    ? "0 0 4px rgba(255,255,255,0.1)"
                    : "0 0 4px rgba(0,0,0,0.1)",
                  transition: "all 0.3s ease",
                  background: dark ? "#232b26aa" : "#ffffffcc",
                }}
                onClick={onRegister}
                title="Registrar"
              >
                <BiUserPlus size={26} />
              </Button>
            </>
          )}

          {user && (
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
                <Dropdown.Item as={Link} to="/cesta-mensal">
                  <i className="bi bi-basket3 me-2"></i> Cesta Mensal
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
                style={{
                  borderRadius: "999px",
                  fontWeight: 500,
                  padding: "6px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: dark ? "#ffffffcc" : "#f9fffb",
                  boxShadow: dark
                    ? "0 0 6px rgba(255,255,255,0.1)"
                    : "0 0 6px rgba(0,0,0,0.08)",
                  transition: "all 0.3s ease",
                }}
                title={dark ? "Modo Claro" : "Modo Escuro"}
              >
                <i
                  className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`}
                  style={{
                    fontSize: "1rem",
                    color: dark ? "#ffc107" : "#198754",
                    filter: `drop-shadow(0 0 4px ${
                      dark ? "#ffc10788" : "#19875444"
                    })`,
                    transition: "color 0.3s, filter 0.3s",
                  }}
                />
                <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>
                  {dark ? "Claro" : "Escuro"}
                </span>
              </Button>
            </Nav.Item>

            {user ? (
              <>
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
                        <i className="bi bi-person-circle me-2" />{" "}
                        Perfil/Carrinho
                      </Dropdown.Item>
                      <Dropdown.Item
                        as={Link}
                        to="/cesta-mensal"
                        onClick={() => setExpanded(false)}
                      >
                        <i className="bi bi-basket3 me-2"></i> Cesta Mensal
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
                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant={dark ? "outline-light" : "outline-success"}
                    onClick={onLogin}
                    title="Login"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 0,
                      fontWeight: 500,
                      background: dark ? "#232b26aa" : "#ffffffcc",
                      boxShadow: dark
                        ? "0 0 6px rgba(255,255,255,0.1)"
                        : "0 0 6px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <FaUserAlt size={18} />
                  </Button>
                </Nav.Item>

                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant={dark ? "outline-light" : "outline-success"}
                    onClick={onRegister}
                    title="Registrar"
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 0,
                      fontWeight: 500,
                      background: dark ? "#232b26aa" : "#ffffffcc",
                      boxShadow: dark
                        ? "0 0 6px rgba(255,255,255,0.1)"
                        : "0 0 6px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <BiUserPlus size={20} />
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
