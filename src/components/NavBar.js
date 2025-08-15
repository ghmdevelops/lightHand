import { BiUserPlus } from "react-icons/bi";
import {
  FaUserAlt,
  FaUserCircle,
  FaShoppingCart,
  FaReceipt,
  FaTrophy,
  FaHeart,
  FaChartLine,
  FaBoxOpen,
  FaExchangeAlt,
  FaTicketAlt,
  FaSignOutAlt,
  FaHome,
  FaInfoCircle,
} from "react-icons/fa";
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Dropdown from "react-bootstrap/Dropdown";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";
import Nav from "react-bootstrap/Nav";

// >>> ADIÇÕES PARA OUVIR O FIREBASE <<<
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

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
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 991.98px)").matches
      : false
  );
  const [showMenu, setShowMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressVisible, setProgressVisible] = useState(false);
  const location = useLocation();

  // >>> CONTAGEM DE CARRINHOS PENDENTES <<<
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    const mq = window.matchMedia("(max-width: 991.98px)");
    const handleMedia = (e) => setIsMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", handleMedia);
    else mq.addListener(handleMedia);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (mq.removeEventListener) mq.removeEventListener("change", handleMedia);
      else mq.removeListener(handleMedia);
    };
  }, []);

  useEffect(() => {
    let t1, t2, t3, t4;
    setProgressVisible(true);
    setProgress(12);
    t1 = setTimeout(() => setProgress(55), 140);
    t2 = setTimeout(() => setProgress(82), 420);
    t3 = setTimeout(() => setProgress(100), 820);
    t4 = setTimeout(() => {
      setProgressVisible(false);
      setProgress(0);
    }, 1120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      setProgress(0);
      setProgressVisible(false);
    };
  }, [location.pathname]);

  // >>> OUVINTE DO FIREBASE PARA PENDENTES <<<
  useEffect(() => {
    if (!user) {
      setPendingCount(0);
      return;
    }
    const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
    const off = onValue(cartsRef, (snap) => {
      const val = snap.val() || {};
      const count = Object.values(val).filter((c) => !c?.pedidoFeito).length;
      setPendingCount(count);
    });
    return () => off();
  }, [user]);

  const AuthButton = ({ onClick, title, Icon, label, filled }) => {
    const showLabel = Boolean(label) && !isMobile;
    const baseStyle = {
      display: "flex",
      alignItems: "center",
      gap: showLabel ? 8 : 0,
      padding: showLabel ? "10px 16px" : 0,
      minWidth: showLabel ? 116 : 42,
      height: 42,
      borderRadius: 999,
      border: filled ? "1px solid transparent" : "1px solid rgba(2,6,23,0.12)",
      background: filled
        ? "linear-gradient(135deg,#6366f1,#22d3ee)"
        : "linear-gradient(135deg,#ffffff,#f8fafc)",
      color: filled ? "#fff" : "#0f172a",
      boxShadow: filled
        ? "0 12px 30px rgba(34,211,238,0.32)"
        : "0 8px 22px rgba(2,6,23,0.08)",
      cursor: "pointer",
      transition:
        "transform .18s ease, box-shadow .18s ease, filter .18s ease, background .18s ease",
      fontWeight: 800,
      fontSize: ".92rem",
      whiteSpace: "nowrap",
      justifyContent: "center",
      letterSpacing: ".2px",
      backdropFilter: "saturate(130%) blur(6px)",
      WebkitBackdropFilter: "saturate(130%) blur(6px)",
    };
    const onEnter = (e) => {
      e.currentTarget.style.transform = "translateY(-1.5px) scale(1.01)";
      e.currentTarget.style.filter = "brightness(1.05)";
      e.currentTarget.style.boxShadow = filled
        ? "0 16px 40px rgba(34,211,238,0.38)"
        : "0 12px 28px rgba(2,6,23,0.10)";
    };
    const onLeave = (e) => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.filter = "none";
      e.currentTarget.style.boxShadow = filled
        ? "0 12px 30px rgba(34,211,238,0.32)"
        : "0 8px 22px rgba(2,6,23,0.08)";
    };
    const onFocus = (e) => {
      e.currentTarget.style.boxShadow = "0 0 0 4px rgba(99,102,241,0.28)";
    };
    const onBlur = (e) => {
      e.currentTarget.style.boxShadow = filled
        ? "0 12px 30px rgba(34,211,238,0.32)"
        : "0 8px 22px rgba(2,6,23,0.08)";
    };
    return (
      <Button
        size="sm"
        variant="link"
        onClick={onClick}
        aria-label={title}
        title={title}
        style={baseStyle}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        <Icon size={showLabel ? 18 : 16} />
        {showLabel && <span>{label}</span>}
      </Button>
    );
  };

  const MenuItems = ({ onNavigate }) => (
    <Nav className="flex-column">
      <Nav.Item>
        <Nav.Link as={Link} to="/" onClick={onNavigate} className="d-flex align-items-center gap-2">
          <FaHome /> Início
        </Nav.Link>
      </Nav.Item>
      <Nav.Item>
        <Nav.Link as={Link} to="/sobre" onClick={onNavigate} className="d-flex align-items-center gap-2">
          <FaInfoCircle /> Sobre
        </Nav.Link>
      </Nav.Item>
      {user ? (
        <>
          <div className="mt-2 mb-1 px-2 fw-bold text-uppercase" style={{ fontSize: 12, opacity: 0.7 }}>
            Minha conta
          </div>
          <Nav.Item>
            <Nav.Link as={Link} to="/perfil" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaUserCircle /> Perfil
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/carrinho" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaShoppingCart /> Carrinho
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/pedidos" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaReceipt /> Pedidos
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/conquistas" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaTrophy /> Conquistas
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/favoritos" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaHeart /> Favoritos
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/previsao" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaChartLine /> Previsão de Gastos
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/cesta-mensal" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaBoxOpen /> Cesta Mensal
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/trocas" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaExchangeAlt /> Clube de Trocas
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link as={Link} to="/cupons" onClick={onNavigate} className="d-flex align-items-center gap-2">
              <FaTicketAlt /> Pagamentos & Cupons
            </Nav.Link>
          </Nav.Item>
          <div className="mt-2" />
          <Button
            variant="link"
            onClick={() => {
              onNavigate();
              onLogout();
            }}
            className="w-100 d-flex align-items-center justify-content-center gap-2 text-danger"
            style={{ textDecoration: "none" }}
          >
            <FaSignOutAlt /> Sair
          </Button>
        </>
      ) : (
        <div className="d-flex gap-2 mt-2">
          <AuthButton onClick={() => { onNavigate(); onLogin(); }} title="Login" Icon={FaUserAlt} label="Entrar" filled={false} />
          <AuthButton onClick={() => { onNavigate(); onRegister(); }} title="Registrar" Icon={BiUserPlus} label="Registrar" filled={true} />
        </div>
      )}
    </Nav>
  );

  // estilos do badge/dot do carrinho
  const countLabel = pendingCount > 99 ? "99+" : String(pendingCount);

  return (
    <>
      {/* barra de progresso topo */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: 3,
          width: "100%",
          zIndex: 2000,
          pointerEvents: "none",
          opacity: progressVisible ? 1 : 0,
          transition: "opacity .25s ease",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background:
              "linear-gradient(90deg,#22d3ee 0%,#6366f1 50%,#22d3ee 100%)",
            boxShadow: "0 0 18px rgba(34,211,238,.45)",
            transition: "width .3s ease",
          }}
        />
      </div>

      {/* keyframes/estilos para o badge e dot */}
      <style>{`
        @keyframes cartBlink {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,.55); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        }
        .cart-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-weight: 900;
          font-size: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          z-index: 2;
        }
        .cart-dot {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: cartBlink 1.2s ease-in-out infinite;
          z-index: 1;
        }
      `}</style>

      <Navbar
        fixed="top"
        variant="light"
        className="px-3"
        style={{
          background: scrolled
            ? "linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)"
            : "linear-gradient(135deg,rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.7) 100%)",
          transition:
            "background .35s ease, box-shadow .35s ease, border-color .35s ease",
          borderBottom: scrolled
            ? "1px solid rgba(2,6,23,0.06)"
            : "1px solid rgba(255,255,255,0)",
          boxShadow: scrolled
            ? "0 14px 40px rgba(2,6,23,0.12)"
            : "0 6px 18px rgba(2,6,23,0.06)",
          backdropFilter: "saturate(160%) blur(12px)",
          WebkitBackdropFilter: "saturate(160%) blur(12px)",
          zIndex: 1030,
        }}
      >
        <Container fluid className="d-flex align-items-center">
          <Navbar.Brand
            as={Link}
            to="/"
            className="d-flex align-items-center gap-2"
            style={{ textDecoration: "none" }}
          >
            <style>{`
              @keyframes sheen { 0% {transform: translateX(-120%)} 60% {transform: translateX(120%)} 100% {transform: translateX(120%)} }
              @keyframes float { 0% {transform: translateY(0)} 50% {transform: translateY(-1.5px)} 100% {transform: translateY(0)} }
              .brand-wrap { position: relative; display: inline-block; }
              .brand-sheen { position:absolute; inset:0; background: linear-gradient(120deg, transparent 0%, rgba(255,255,255,.35) 50%, transparent 100%); mix-blend-mode: overlay; animation: sheen 3.6s ease-in-out infinite; }
              .savvy-title {
                background: conic-gradient(from 180deg at 50% 50%, #0f172a, #334155, #2563eb, #22d3ee, #0f172a);
                background-size: 200% 200%;
                -webkit-background-clip: text;
                background-clip: text;
                color: transparent;
                font-weight: 900;
                font-size: 2rem;
                letter-spacing: .02em;
                line-height: 1;
                animation: float 3.4s ease-in-out infinite;
              }
              .savvy-subtitle {
                color: #64748b;
                font-weight: 700;
                font-size: .82rem;
                margin-top: -2px;
                letter-spacing: .02em;
              }
              @media (max-width: 576px) {
                .savvy-title { font-size: 1.6rem; }
                .savvy-subtitle { font-size: .72rem; }
              }
            `}</style>
            <div className="brand-wrap">
              <span className="brand-sheen" />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                }}
              >
                <span className="savvy-title">Savvy</span>
                <span className="savvy-subtitle">
                  Escolhas inteligentes
                </span>
              </div>
            </div>
          </Navbar.Brand>

          {/* MOBILE: carrinho + avatar */}
          <div className="d-flex d-lg-none ms-auto align-items-center gap-2">
            {user && pendingCount > 0 && (
              <Link
                to="/carrinho"
                aria-label={`Você tem ${pendingCount} carrinho${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`}
                className="position-relative"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#ffffff,#f8fafc)",
                    color: "#0f172a",
                    boxShadow: "0 10px 26px rgba(2,6,23,0.12)",
                    position: "relative",
                  }}
                >
                  <FaShoppingCart />
                  <span className="cart-dot" />
                  <span className="cart-badge">{countLabel}</span>
                </div>
              </Link>
            )}

            <Button
              variant="link"
              aria-label="Abrir menu"
              onClick={() => setShowMenu(true)}
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                border: "none",
                background: "transparent",
                position: "relative",
                padding: 0,
                boxShadow: "0 10px 26px rgba(2,6,23,0.12)",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: "50%",
                  padding: 2,
                  background:
                    "conic-gradient(#22d3ee, #6366f1, #06b6d4, #22d3ee)",
                  WebkitMask:
                    "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              />
              {avatarURL ? (
                <img
                  src={avatarURL}
                  alt="Avatar"
                  className="img-fluid"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                />
              ) : (
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg,#16a34a,#22c55e)",
                    color: "#fff",
                    fontSize: "1.1rem",
                    borderRadius: "50%",
                  }}
                >
                  <i className={`fa-solid ${avatarIcon || "fa-user"}`} />
                </div>
              )}
            </Button>
          </div>

          {/* DESKTOP: carrinho + avatar/menu */}
          <div className="ms-auto d-none d-lg-flex align-items-center gap-3">
            {user && pendingCount > 0 && (
              <Link
                to="/carrinho"
                aria-label={`Você tem ${pendingCount} carrinho${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`}
                className="position-relative"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#ffffff,#f8fafc)",
                    color: "#0f172a",
                    boxShadow: "0 12px 28px rgba(2,6,23,0.12)",
                    position: "relative",
                  }}
                >
                  <FaShoppingCart />
                  <span className="cart-dot" />
                  <span className="cart-badge">{countLabel}</span>
                </div>
              </Link>
            )}

            {user ? (
              <Dropdown align="end">
                <Dropdown.Toggle
                  as={Button}
                  variant="link"
                  id="avatar-dropdown-desktop"
                  style={{
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    boxShadow: "0 12px 28px rgba(2,6,23,0.12)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      inset: -2,
                      borderRadius: "50%",
                      padding: 2,
                      background:
                        "conic-gradient(#22d3ee, #6366f1, #06b6d4, #22d3ee)",
                      WebkitMask:
                        "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      maskComposite: "exclude",
                    }}
                  />
                  {avatarURL ? (
                    <img
                      src={avatarURL}
                      alt="Avatar"
                      className="img-fluid"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    <div
                      className="d-flex justify-content-center align-items-center"
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg,#16a34a,#22c55e)",
                        color: "#fff",
                        fontSize: "1.15rem",
                        borderRadius: "50%",
                      }}
                    >
                      <i className={`fa-solid ${avatarIcon || "fa-user"}`} />
                    </div>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu
                  style={{
                    minWidth: "14.5rem",
                    borderRadius: 16,
                    border: "1px solid rgba(2,6,23,0.06)",
                    boxShadow: "0 24px 56px rgba(2,6,23,0.16)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                  }}
                >
                  <Dropdown.Header style={{ fontWeight: 800 }}>
                    Olá, {user.displayName || user.email}
                  </Dropdown.Header>
                  <Dropdown.Item as={Link} to="/perfil">
                    <FaUserCircle className="me-2" /> Perfil
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/carrinho">
                    <FaShoppingCart className="me-2" /> Carrinho
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/pedidos">
                    <FaReceipt className="me-2" /> Pedidos
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/conquistas">
                    <FaTrophy className="me-2" /> Conquistas
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/favoritos">
                    <FaHeart className="me-2" /> Favoritos
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/previsao">
                    <FaChartLine className="me-2" /> Previsão de Gastos
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/cesta-mensal">
                    <FaBoxOpen className="me-2" /> Cesta Mensal
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/trocas">
                    <FaExchangeAlt className="me-2" /> Clube de Trocas
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/cupons">
                    <FaTicketAlt className="me-2" /> Pagamentos & Cupons
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={onLogout} className="text-danger">
                    <FaSignOutAlt className="me-2" />
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

      <Offcanvas
        show={showMenu}
        placement="end"
        onHide={() => setShowMenu(false)}
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <Offcanvas.Header
          closeButton
          closeVariant="white"
          style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)", color: "#fff" }}
        >
          <Offcanvas.Title className="d-flex align-items-center gap-2">
            <span style={{ fontWeight: 900 }}>Savvy</span>
            <span style={{ fontSize: 12, opacity: 0.85 }}>escolhas inteligentes</span>
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <MenuItems onNavigate={() => setShowMenu(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
