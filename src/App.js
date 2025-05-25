import React, { useEffect, useState } from "react";
import { auth, db } from "./firebase";
import { ref, onValue } from "firebase/database";

import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import UserProfile from "./components/UserProfile";
import Footer from "./components/Footer";

export default function App() {
  const [tela, setTela] = useState("landing");
  const [user, setUser] = useState(null);
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === null ? true : saved === "true";
  });

  // ---- Novo estado pra contar carrinhos salvos ----
  const [cartsCount, setCartsCount] = useState(0);
  const [showCarts, setShowCarts] = useState(false);

  // Dark mode persistido
  useEffect(() => {
    document.body.className = dark
      ? "bg-dark text-light"
      : "bg-light text-dark";
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setTela(u ? "home" : "landing");
      setShowCarts(false);
    });
    return unsubscribe;
  }, []);

  // Se usuário logado, subscribe à contagem de carts
  useEffect(() => {
    if (!user) {
      setCartsCount(0);
      return;
    }
    const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
    const off = onValue(cartsRef, (snap) => {
      const data = snap.val() || {};
      setCartsCount(Object.keys(data).length);
    });
    return () => off();
  }, [user]);

  const navProps = {
    user,
    onLogin: () => setTela("login"),
    onRegister: () => setTela("register"),
    onPerfil: () => setTela("perfil"),
    onLogout: () => auth.signOut(),
    dark,
    setDark,
    cartsCount,
    onShowCarts: () => {
      setShowCarts(true);
      setTela("perfil"); // ou outra tela se preferir
    },
  };

  return (
    <div
      className={`d-flex flex-column min-vh-100 ${
        dark ? "bg-dark text-light" : "bg-light text-dark"
      }`}
    >
      <NavBar {...navProps} />

      <div className="flex-grow-1">
        {!user ? (
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
        ) : showCarts ? (
          // Mostra a lista de carrinhos salvos (UserProfile faz isso)
          <UserProfile user={user} dark={dark} />
        ) : tela === "home" ? (
          <Home user={user} dark={dark} />
        ) : tela === "perfil" ? (
          <UserProfile user={user} dark={dark} />
        ) : null}
      </div>

      <Footer dark={dark} />
    </div>
  );
}
