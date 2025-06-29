import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login({ onAuth, showRegister, dark }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      onAuth();
    } catch {
      setErro("E-mail ou senha inválidos.");
    }
  };

  const backgroundImage = dark
    ? "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1470&q=80"
    : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1470&q=80";

  return (
    <div
      className={`d-flex justify-content-center align-items-center vh-100 ${
        dark ? "text-light" : "text-dark"
      }`}
      style={{
        position: "relative",
        overflow: "hidden",
        zIndex: 2,
        paddingTop: "90px",

        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",

        backgroundBlendMode: "overlay",
        backgroundColor: dark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.3)",
      }}
    >
      <style>{`
        .glass-login-card {
    background: ${dark ? "#ffffff" : "rgb(255, 251, 251)"};
    border: 1.5px solid ${
      dark ? "rgba(255,255,255,0.08)" : "rgba(25, 135, 84, 0.19)"
    };
    color: ${dark ? "#eee" : "#222"};
  }
        .glass-login-card:hover {
          box-shadow: 0 12px 54px 0 #728FCE, 0 2.5px 22px 0 #728FCE;
          transform: scale(1.02);
        }

        /* Inputs com contorno verde no foco */
        .form-control:focus {
          border-color: #728FCE !important;
          box-shadow: 0 0 8px rgba(11, 130, 162, 0.59) !important;
        }
        .form-control {
          background: rgba(255, 255, 255, 0.15);
          color: #222;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 0.75rem;
        }
        .form-control::placeholder {
          color: rgba(0,0,0,0.4);
        }
        .form-control:disabled {
          background: rgba(255,255,255,0.1);
        }

        .btn-neon {
          background: #4863A0;
          color: #fff;
          border-radius: 50px !important;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 1px;
          transition: box-shadow 0.2s, background 0.2s, color 0.2s;
        }
        .btn-neon:hover, .btn-neon:focus {
          background: #fff !important;
          color: #2F539B !important;
          box-shadow: 0 0 12px #728FCE, 0 0 40px #728FCE;
        }

        .eye-toggle {
          position: absolute;
          top: 50%;
          right: 1rem;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(0,0,0,0.6);
          font-size: 1.1rem;
          cursor: pointer;
        }
        .eye-toggle:hover {
          color: #728FCE;
        }

        /* Ícone de cadeado no topo do card */
        .lock-icon-wrapper {
          background: rgba(30, 140, 224, 0.15);
          border-radius: 50%;
          width: 72px;
          height: 72px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          transition: box-shadow 0.3s, transform 0.3s;
        }
        .lock-icon-wrapper:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.15);
          transform: scale(1.05);
        }

        /* Animação de erro */
        .error-msg {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .text-register {
          color: #555;
          font-size: 0.95rem;
        }
        .text-register a {
          color: #4863A0;
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s;
        }
        .text-register a:hover {
          color: #728FCE;
        }
      `}</style>

      <div
        className="glass-login-card p-4 p-md-5 mx-3"
        style={{ maxWidth: 380, width: "100%" }}
      >
        <div className="text-center mb-4">
          <div className="lock-icon-wrapper">
            <i
              className="fa-solid fa-lock"
              style={{ fontSize: "2rem", color: "#728FCE" }}
            ></i>
          </div>
          <h3
            className="mt-3 fw-bold"
            style={{ letterSpacing: "1px", color: "#222" }}
          >
            Bem-vindo de volta!
          </h3>
          <p className="text-muted" style={{ fontSize: "0.95rem" }}>
            Faça login para acessar sua conta
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-floating mb-3 position-relative">
            <input
              type="email"
              className="form-control"
              id="floatingEmail"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="floatingEmail" className="text-muted">
              E-mail
            </label>
          </div>

          <div className="form-floating mb-4 position-relative">
            <input
              type={showSenha ? "text" : "password"}
              className="form-control pe-5"
              id="floatingPassword"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <label htmlFor="floatingPassword" className="text-muted">
              Senha
            </label>
            <button
              type="button"
              onClick={() => setShowSenha((prev) => !prev)}
              className="eye-toggle"
              tabIndex={-1}
            >
              <i
                className={`fa-solid ${showSenha ? "fa-eye-slash" : "fa-eye"}`}
              />
            </button>
          </div>

          <button type="submit" className="btn btn-neon w-100 py-2 mb-3">
            Entrar
          </button>

          {erro && (
            <div className="alert alert-danger text-center error-msg py-1 mb-3">
              {erro}
            </div>
          )}

          {/* Link para registro */}
          <div className="text-center mt-2 text-register">
            Ainda não tem conta?{" "}
            <a href="#" onClick={showRegister}>
              Cadastre-se
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
