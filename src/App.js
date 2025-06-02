// src/App.js
import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { ref, get } from "firebase/database";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";

import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import UserProfile from "./components/UserProfile";
import Footer from "./components/Footer";

import SobrePage from "./components/SobrePage";
import FavoritosPage from "./components/FavoritosPage";
import PrevisaoGastosPage from "./components/PrevisaoGastosPage";
import CuponsPage from "./components/CuponsPage";
import PassaportePage from "./components/PassaportePage";
import TrocasPage from "./components/TrocasPage";

import CestaMensalPage from "./components/CestaMensalPage";
import MarketplaceProdutoresPage from "./components/MarketplaceProdutoresPage";

export default function App() {
  const [tela, setTela] = useState("landing");
  const [user, setUser] = useState(null);
  const [avatarURL, setAvatarURL] = useState(null);
  const [avatarIcon, setAvatarIcon] = useState(null);

  // Armazena o ID do último mercado visitado
  const [ultimaVisita, setUltimaVisita] = useState(null);

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    document.body.className = dark
      ? "bg-dark text-light"
      : "bg-light text-dark";
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (usuario) => {
      if (usuario) {
        setUser(usuario);
        setTela("home");
        const userRef = ref(db, `usuarios/${usuario.uid}/avatar`);
        const snap = await get(userRef);
        if (snap.exists()) {
          const val = snap.val();
          if (typeof val === "string" && val.startsWith("http")) {
            setAvatarURL(val);
            setAvatarIcon(null);
          } else {
            setAvatarURL(null);
            setAvatarIcon(val);
          }
        } else {
          setAvatarURL(null);
          setAvatarIcon(null);
        }
      } else {
        setUser(null);
        setTela("landing");
        setAvatarURL(null);
        setAvatarIcon(null);
      }
    });
    return unsubscribe;
  }, []);

  const navProps = {
    user,
    avatarURL,
    avatarIcon,
    onLogin: () => setTela("login"),
    onRegister: () => setTela("register"),
    onPerfil: () => setTela("perfil"),
    onLogout: () => auth.signOut(),
    dark,
    setDark,
    cartsCount: 0,
    onShowCarts: () => {},
  };

  return (
    <BrowserRouter>
      <div
        className={`d-flex flex-column min-vh-100 ${
          dark ? "bg-dark text-light" : "bg-light text-dark"
        }`}
      >
        <NavBar {...navProps} />

        <div className="flex-grow-1">
          <Routes>
            <Route
              path="/"
              element={
                !user ? (
                  tela === "landing" ? (
                    <LandingPage
                      onLogin={() => setTela("login")}
                      onRegister={() => setTela("register")}
                      dark={dark}
                    />
                  ) : tela === "login" ? (
                    <Login
                      onAuth={() => setTela("home")}
                      showRegister={() => setTela("register")}
                      dark={dark}
                    />
                  ) : tela === "register" ? (
                    <Register
                      onAuth={() => setTela("home")}
                      showLogin={() => setTela("login")}
                      dark={dark}
                    />
                  ) : null
                ) : tela === "home" ? (
                  // Aqui, passamos setUltimaVisita para que Home (ou BuscarMercadosOSM) repasse a OfertasMercado
                  <Home
                    user={user}
                    onLogout={() => auth.signOut()}
                    dark={dark}
                    setUltimaVisita={setUltimaVisita}
                  />
                ) : tela === "perfil" ? (
                  <UserProfile user={user} />
                ) : null
              }
            />

            <Route
              path="/sobre"
              element={<SobrePage onVoltar={() => window.history.back()} />}
            />

            <Route
              path="/favoritos"
              element={
                user ? (
                  <FavoritosPage
                    user={user}
                    onVoltar={() => window.history.back()}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/previsao"
              element={
                user ? (
                  <PrevisaoGastosPage onVoltar={() => window.history.back()} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/cupons"
              element={
                user ? (
                  <CuponsPage onVoltar={() => window.history.back()} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/passaporte"
              element={
                user ? (
                  <PassaportePage
                    user={user}
                    ultimaVisita={ultimaVisita}
                    onVoltar={() => window.history.back()}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/trocas"
              element={
                user ? (
                  <TrocasPage onVoltar={() => window.history.back()} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/produtores"
              element={
                user ? (
                  <MarketplaceProdutoresPage
                    user={user}
                    onVoltar={() => window.history.back()}
                  />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/cesta-mensal"
              element={
                user ? (
                  <CestaMensalPage onVoltar={() => window.history.back()} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />

            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Login
                    onAuth={() => setTela("home")}
                    showRegister={() => setTela("register")}
                    dark={dark}
                  />
                )
              }
            />

            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to="/" replace />
                ) : (
                  <Register
                    onAuth={() => setTela("home")}
                    showLogin={() => setTela("login")}
                    dark={dark}
                  />
                )
              }
            />

            <Route
              path="/perfil"
              element={
                user ? <UserProfile user={user} /> : <Navigate to="/" replace />
              }
            />

            <Route
              path="*"
              element={
                <div className="text-center my-5">
                  <h3>Página não encontrada</h3>
                  <p>
                    <Link to="/" className="text-decoration-none text-primary">
                      Voltar ao Início
                    </Link>
                  </p>
                </div>
              }
            />
          </Routes>
        </div>

        <Footer dark={dark} />
      </div>
    </BrowserRouter>
  );
}
