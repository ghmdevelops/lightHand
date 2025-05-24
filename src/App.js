import React, { useEffect, useState } from "react";
import { auth } from "./firebase";

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

  useEffect(() => {
    document.body.className = dark
      ? "bg-dark text-light"
      : "bg-light text-dark";
    localStorage.setItem("darkMode", dark);
  }, [dark]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((usuario) => {
      if (usuario) {
        setUser(usuario);
        setTela("home");
      } else {
        setUser(null);
        setTela("landing");
      }
    });
    return unsubscribe;
  }, []);

  const navProps = {
    user,
    onLogin: () => setTela("login"),
    onRegister: () => setTela("register"),
    onPerfil: () => setTela("perfil"),
    onLogout: () => auth.signOut(),
    dark,
    setDark,
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
        ) : tela === "home" ? (
          <Home user={user} onLogout={() => auth.signOut()} dark={dark} />
        ) : tela === "perfil" ? (
          <UserProfile user={user} dark={dark} />
        ) : null}
      </div>
      <Footer dark={dark} />
    </div>
  );
}
