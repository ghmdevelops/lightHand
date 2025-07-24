import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";

export default function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setErro("");
    setMensagem("");
    try {
      await sendPasswordResetEmail(auth, email);
      setMensagem("E-mail de recuperação enviado!");
    } catch (err) {
      setErro("Erro ao enviar. Verifique o e-mail.");
    }
  };

  useEffect(() => {
    if (mensagem) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [mensagem, navigate]);

  return (
    <div
      className="d-flex justify-content-center align-items-center vh-100 text-dark"
      style={{
        backgroundColor: "#f8fafc",
        paddingTop: "60px",
        backgroundImage:
          "linear-gradient(135deg, #f4fbffff 0%, #f4fafeff 100%)",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
        }

        .glass-login-card {
          background: rgba(255, 255, 255, 1);
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.61);
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          transition: all 0.3s ease-in-out;
        }

        .glass-login-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(114, 143, 206, 0.3);
        }

        .form-control {
          background: rgba(255, 255, 255, 0.1);
          color: #222;
          border: none;
          border-radius: 0.75rem;
        }

        .form-control:focus {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid #728FCE !important;
          box-shadow: 0 0 8px rgba(114, 143, 206, 0.5);
        }

        .btn-neon {
          background: linear-gradient(to right, #4863A0, #728FCE);
          color: #fff;
          font-weight: 600;
          border-radius: 50px;
          transition: 0.3s ease;
        }

        .btn-neon:hover {
          background: #fff;
          color: #2F539B;
          box-shadow: 0 0 15px #728FCE;
        }

        .lock-icon-wrapper {
          background: rgba(114, 143, 206, 0.1);
          border-radius: 50%;
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .error-msg {
          animation: fadeIn 0.3s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .text-register a {
          color: #4863A0;
          text-decoration: none;
          font-weight: 600;
        }

        .text-register a:hover {
          color: #728FCE;
        }
      `}</style>

      <div
        className="glass-login-card p-4 p-md-5 mx-3"
        style={{ maxWidth: 400, width: "100%" }}
      >
        <div className="text-center mb-4">
          <div className="lock-icon-wrapper">
            <i
              className="fa-solid fa-unlock-keyhole"
              style={{ fontSize: "1.8rem", color: "#728FCE" }}
            ></i>
          </div>
          <h3 className="mt-3 fw-bold">Recuperar Senha</h3>
          <p className="text-muted" style={{ fontSize: "0.9rem" }}>
            Informe seu e-mail para redefinir a senha.
          </p>
        </div>

        <form onSubmit={handleReset}>
          <div className="form-floating mb-3 position-relative">
            <input
              type="email"
              className="form-control"
              id="resetEmail"
              placeholder="nome@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="resetEmail">E-mail</label>
          </div>

          <button type="submit" className="btn btn-neon w-100 py-2 mb-3">
            Enviar link
          </button>

          <button
            type="button"
            className="btn btn-outline-primary w-100 py-2 mb-3"
            onClick={() => navigate("/login")}
          >
            Voltar para Login
          </button>

          {mensagem && (
            <div className="alert alert-success text-center error-msg py-2">
              {mensagem}
              <div className="small mt-1">Redirecionando para login...</div>
            </div>
          )}

          {erro && (
            <div className="alert alert-danger text-center error-msg py-2">
              {erro}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
