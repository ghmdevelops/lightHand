import { BiUserPlus } from "react-icons/bi";
import { FaUserAlt } from "react-icons/fa";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import Nav from "react-bootstrap/Nav";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";

export default function NavBar({
  user,
  avatarURL,
  avatarIcon,
  onLogin,
  onRegister,
  onLogout,
  cartsCount,
  onShowCarts,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Navbar
      expand="lg"
      expanded={expanded}
      fixed="top"
      variant="light"
      className="px-3"
      style={{
        backdropFilter: "blur(8px)",
        background: "rgba(255,255,255,0.85)",
        borderBottom: "1px solid #1E90FF",
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
          <>
            <style>{`
              .savvy-title {
                color: #3D3C3A;
                font-weight: 700;
                font-size: 2.2rem;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                letter-spacing: 0.05em;
                text-transform: capitalize;
                user-select: none;
              }

              .savvy-subtitle {
                color: #728FCE;
                font-weight: 500;
                font-size: 0.85rem;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin-top: -8px;
                user-select: none;
              }

              @media (max-width: 576px) {
                .savvy-title {
                  font-size: 1.5rem;
                }
                .savvy-subtitle {
                  font-size: 0.7rem;
                  margin-top: -6px;
                }
              }
            `}</style>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                backgroundColor: "transparent",
                cursor: "default",
                userSelect: "none",
              }}
            >
              <span className="savvy-title">Savvy</span>
              <span className="savvy-subtitle">
                Escolhas inteligentes no mercado
              </span>
            </div>
          </>
        </Navbar.Brand>

        <div className="d-flex d-lg-none ms-auto align-items-center gap-2">
          {!user && (
            <>
              <Button
                size="sm"
                variant="outline-primary"
                style={{
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 0,
                  boxShadow: "0 0 4px rgba(0,0,0,0.1)",
                  background: "#ffffffcc",
                }}
                onClick={onLogin}
                title="Login"
              >
                <FaUserAlt size={16} />
              </Button>

              <Button
                size="sm"
                variant="outline-primary"
                style={{
                  borderRadius: "50%",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 0,
                  boxShadow: "0 0 4px rgba(0,0,0,0.1)",
                  background: "#ffffffcc",
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
              <Dropdown.Menu style={{ minWidth: "12rem" }}>
                <Dropdown.Header>
                  Olá, {user.displayName || user.email}
                </Dropdown.Header>
                <Dropdown.Item as={Link} to="/perfil">
                  Perfil
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/carrinho">
                  Carrinho
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/pedidos">
                  Pedidos
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/conquistas">
                  Conquistas
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/favoritos">
                  Favoritos
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/previsao">
                  Previsão de Gastos
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/cesta-mensal">
                  Cesta Mensal
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/trocas">
                  Club de Trocas
                </Dropdown.Item>
                <Dropdown.Item as={Link} to="/cupons">
                  Pagamentos & Cupons
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={onLogout} className="text-danger">
                  Sair
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>

        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto align-items-center gap-lg-2 gap-3">
            {user ? (
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
                        <i className={`fa-solid ${avatarIcon || "fa-user"}`} />
                      </div>
                    )}
                  </Dropdown.Toggle>

                  <Dropdown.Menu style={{ minWidth: "12rem" }}>
                    <Dropdown.Header>
                      Olá, {user.displayName || user.email}
                    </Dropdown.Header>
                    <Dropdown.Item
                      as={Link}
                      to="/perfil"
                      onClick={() => setExpanded(false)}
                    >
                      Perfil
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/carrinho"
                      onClick={() => setExpanded(false)}
                    >
                      Carrinho
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/pedidos"
                      onClick={() => setExpanded(false)}
                    >
                      Pedidos
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/conquistas"
                      onClick={() => setExpanded(false)}
                    >
                      Conquistas
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/favoritos"
                      onClick={() => setExpanded(false)}
                    >
                      Favoritos
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/previsao"
                      onClick={() => setExpanded(false)}
                    >
                      Previsão de Gastos
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/cesta-mensal"
                      onClick={() => setExpanded(false)}
                    >
                      Cesta Mensal
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/trocas"
                      onClick={() => setExpanded(false)}
                    >
                      Club de Trocas
                    </Dropdown.Item>
                    <Dropdown.Item
                      as={Link}
                      to="/cupons"
                      onClick={() => setExpanded(false)}
                    >
                      Pagamentos & Cupons
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item onClick={onLogout} className="text-danger">
                      Sair
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </Nav.Item>
            ) : (
              <>
                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant="outline-primary"
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
                      background: "#ffffffcc",
                      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
                    }}
                  >
                    <FaUserAlt size={18} />
                  </Button>
                </Nav.Item>

                <Nav.Item className="d-none d-lg-flex">
                  <Button
                    size="sm"
                    variant="outline-primary"
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
                      background: "#ffffffcc",
                      boxShadow: "0 0 6px rgba(0,0,0,0.1)",
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
