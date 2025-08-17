import React, { useState, useEffect, useRef } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";

export default function Login({ onAuth, showRegister }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const deferredPromptRef = useRef(null);
  const formRef = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      if ("credentials" in navigator && window.PasswordCredential) {
        try {
          const cred = new window.PasswordCredential({
            id: email,
            name: email,
            password: senha,
          });
          await navigator.credentials.store(cred);
        } catch { }
      }
      onAuth();
    } catch {
      setErro("E-mail ou senha inválidos.");
    }
  };

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile || isStandalone) return;

    const dismissed = localStorage.getItem("pwa_prompt_dismissed") === "1";
    const installed = localStorage.getItem("pwa_installed") === "1";
    if (dismissed || installed) return;

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      showInstallSwal("android");
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIos) setTimeout(() => showInstallSwal("ios"), 1000);

    const onInstalled = () => {
      localStorage.setItem("pwa_installed", "1");
      Swal.close();
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function showInstallSwal(platform) {
    const isIos = platform === "ios";
    const { isConfirmed, dismiss } = await Swal.fire({
      title: "Instalar o Savvy?",
      html: isIos
        ? `No iPhone/iPad: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.`
        : `Instale o app para abrir mais rápido e usar offline.`,
      imageUrl: "/logo192.png",
      imageHeight: 72,
      showCancelButton: true,
      confirmButtonText: isIos ? "OK" : "Instalar",
      cancelButtonText: "Agora não",
    });

    if (dismiss) localStorage.setItem("pwa_prompt_dismissed", "1");

    if (!isIos && isConfirmed && deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      const { outcome } = await deferredPromptRef.current.userChoice;
      if (outcome === "accepted") localStorage.setItem("pwa_installed", "1");
      deferredPromptRef.current = null;
    }
  }

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100 px-3 mb-5"
      style={{
        background: "linear-gradient(135deg, #e9f0fb 0%, #f7f9fc 100%)",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "120px",
      }}
    >
      <div
        className="shadow-lg rounded-5 p-4 p-md-5 bg-white"
        style={{
          width: "100%",
          maxWidth: 420,
          boxShadow: "0 12px 24px rgba(50, 115, 220, 0.15)",
          border: "1px solid #dce3f2",
        }}
      >
        <div className="text-center mb-5">
          <div
            style={{
              backgroundColor: "#c4d6fa",
              borderRadius: "50%",
              width: 72,
              height: 72,
              margin: "0 auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              boxShadow: "0 8px 16px rgba(114, 143, 206, 0.25)",
              transition: "background-color 0.3s ease",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#4a6ef0"
              viewBox="0 0 24 24"
              width="28"
              height="28"
              aria-hidden="true"
              style={{ maxWidth: "100%", height: "auto" }}
            >
              <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2z" />
              <path d="M17 8V7a5 5 0 0 0-10 0v1H5v10h14V8h-2zm-8-1a3 3 0 0 1 6 0v1H9V7z" />
            </svg>
          </div>
          <h2 className="mt-4 fw-bold text-primary" style={{ letterSpacing: "0.7px" }}>
            Acesse sua conta
          </h2>
          <p className="text-secondary fs-6 mt-2">
            Seja bem-vindo de volta! Faça login para continuar.
          </p>
        </div>

        <form ref={formRef} onSubmit={handleLogin} noValidate autoComplete="on" name="login">
          <div className="mb-4 position-relative">
            <label htmlFor="inputEmail" className="form-label fw-semibold text-secondary">
              E-mail
            </label>
            <div className="input-group shadow-sm rounded-3 overflow-hidden">
              <span className="input-group-text bg-white border-0" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="#4a6ef0" viewBox="0 0 24 24" width="22" height="22">
                  <path d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" />
                  <path d="M22 6l-10 7L2 6" fill="none" stroke="#4a6ef0" strokeWidth="2" />
                </svg>
              </span>
              <input
                type="email"
                id="inputEmail"
                name="username"
                className="form-control border-0 shadow-none"
                placeholder="nome@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                style={{ boxShadow: "none", outline: "none" }}
                enterKeyHint="next"
              />
            </div>
          </div>

          <div className="mb-5 position-relative">
            <label htmlFor="inputPassword" className="form-label fw-semibold text-secondary">
              Senha
            </label>
            <div className="input-group shadow-sm rounded-3 overflow-hidden">
              <span className="input-group-text bg-white border-0" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" fill="#4a6ef0" viewBox="0 0 24 24" width="22" height="22">
                  <path d="M12 17a2 2 0 0 0 2-2v-3a2 2 0 1 0-4 0v3a2 2 0 0 0 2 2z" />
                  <path d="M17 8V7a5 5 0 0 0-10 0v1H5v10h14V8h-2zm-8-1a3 3 0 0 1 6 0v1H9V7z" />
                </svg>
              </span>
              <input
                type={showSenha ? "text" : "password"}
                id="inputPassword"
                name="password"
                className="form-control border-0 shadow-none"
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
                style={{ boxShadow: "none", outline: "none" }}
                enterKeyHint="go"
              />
              <button
                type="button"
                onClick={() => setShowSenha((prev) => !prev)}
                className="btn btn-outline-primary border-0"
                tabIndex={-1}
                aria-label={showSenha ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={showSenha}
                style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, boxShadow: "none" }}
              >
                {showSenha ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="#4a6ef0" viewBox="0 0 24 24" width="22" height="22">
                    <path d="M17.94 17.94A10.06 10.06 0 0 1 12 19c-5 0-9-3.58-10-8a9.78 9.78 0 0 1 1.62-3.25" stroke="#4a6ef0" strokeWidth="2" fill="none" />
                    <path d="M1 1l22 22" stroke="#4a6ef0" strokeWidth="2" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="#4a6ef0" viewBox="0 0 24 24" width="22" height="22">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                    <circle cx="12" cy="12" r="3" fill="#fff" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold py-3 shadow-sm"
            style={{ fontSize: "1.1rem", borderRadius: "1.2rem", letterSpacing: "0.05em", transition: "background-color 0.3s ease" }}
          >
            Entrar
          </button>

          {erro && (
            <div className="alert alert-danger text-center mt-4" style={{ animation: "fadeIn 0.3s ease-in-out", borderRadius: "0.75rem", fontWeight: "600" }} role="alert">
              {erro}
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap" style={{ fontSize: "0.9rem", gap: "1rem" }}>
            <Link
              to="/register"
              className="btn btn-link fw-semibold p-0 text-decoration-none"
              style={{ color: "#4a6ef0" }}
              onClick={() => { try { Swal.close(); } catch { } }}
            >
              Criar conta
            </Link> 
            <button type="button" className="btn btn-link fw-semibold p-0 text-decoration-none" onClick={() => navigate("/recuperar")} style={{ color: "#4a6ef0" }}>
              Esqueceu a senha?
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
