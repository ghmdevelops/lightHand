import { BiUserPlus } from "react-icons/bi";
import { FaUserAlt } from "react-icons/fa";
import React, { useState, useEffect } from "react";
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
}) {
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.matchMedia("(max-width: 991.98px)").matches : false
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    const mq = window.matchMedia("(max-width: 991.98px)");
    const handleMedia = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", handleMedia);
    } else {
      mq.addListener(handleMedia);
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mq.removeEventListener) {
        mq.removeEventListener("change", handleMedia);
      } else {
        mq.removeListener(handleMedia);
      }
    };
  }, []);

  // botão de autenticação reutilizável
  const AuthButton = ({ onClick, title, Icon, label, filled }) => {
    const showLabel = Boolean(label) && !isMobile;
    const baseStyle = {
      display: "flex",
      alignItems: "center",
      gap: showLabel ? 6 : 0,
      padding: showLabel ? "6px 14px" : 0,
      minWidth: showLabel ? 100 : 36,
      height: 36,
      borderRadius: 999,
      border: filled ? "none" : "1px solid rgba(0,0,0,0.15)",
      background: filled
        ? "linear-gradient(135deg,#556dff,#728fce)"
        : "#ffffffcc",
      color: filled ? "#fff" : "#3d3c3a",
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      cursor: "pointer",
      transition: "filter .15s ease, transform .15s ease, box-shadow .15s ease",
      fontWeight: 600,
      fontSize: "0.85rem",
      borderWidth: 1,
      borderStyle: "solid",
      whiteSpace: "nowrap",
      justifyContent: "center",
    };

    const handleMouseEnter = (e) => {
      e.currentTarget.style.filter = "brightness(1.07)";
      e.currentTarget.style.transform = "translateY(-1px)";
    };
    const handleMouseLeave = (e) => {
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.transform = "none";
    };
    const handleFocus = (e) => {
      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(114,143,206,0.6)";
    };
    const handleBlur = (e) => {
      e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
    };

    return (
      <Button
        size="sm"
        variant="link"
        onClick={onClick}
        aria-label={title}
        title={title}
        style={baseStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <Icon size={showLabel ? 16 : 14} />
        {showLabel && <span style={{ marginLeft: 4 }}>{label}</span>}
      </Button>
    );
  };

  return (
    <Navbar
      fixed="top"
      variant="light"
      className="px-3"
      style={{
        backgroundColor: scrolled ? "#ffffff" : "transparent",
        transition: "background-color 0.3s ease",
        borderBottom: scrolled ? "1px solid #ddd" : "none",
        boxShadow: scrolled ? "0 2px 6px rgba(0,0,0,0.05)" : "none",
        zIndex: 1030,
      }}
    >
      <Container fluid className="d-flex align-items-center">
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
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
                font-size: 1.6rem;
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
        </Navbar.Brand>

        {/* ações mobile (ícone only) */}
        <div className="d-flex d-lg-none ms-auto align-items-center gap-2">
          {!user && (
            <>
              <AuthButton
                onClick={onLogin}
                title="Login"
                Icon={FaUserAlt}
                label="Entrar"
                filled={false}
              />
              <AuthButton
                onClick={onRegister}
                title="Registrar"
                Icon={BiUserPlus}
                label="Registrar"
                filled={true}
              />
            </>
          )}
          {user && (
            <Dropdown align="end">
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

        {/* desktop: botões e dropdown */}
        <div className="ms-auto d-none d-lg-flex align-items-center gap-3">
          {user ? (
            <Dropdown align="end" onToggle={() => { }}>
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
          ) : (
            <>
              <AuthButton
                onClick={onLogin}
                title="Login"
                Icon={FaUserAlt}
                label="Entrar"
                filled={false}
              />
              <AuthButton
                onClick={onRegister}
                title="Registrar"
                Icon={BiUserPlus}
                label="Registrar"
                filled={true}
              />
            </>
          )}
        </div>
      </Container>
    </Navbar>
  );
}
