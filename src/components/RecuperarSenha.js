import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { FaEnvelope, FaUnlockAlt } from "react-icons/fa";

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
      className="d-flex justify-content-center align-items-center vh-100 px-3"
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
        <div
          style={{
            backgroundColor: "#c4d6fa",
            borderRadius: "50%",
            width: 72,
            height: 72,
            margin: "0 auto 20px auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 8px 16px rgba(114, 143, 206, 0.25)",
          }}
        >
          <FaUnlockAlt size={32} color="#4a6ef0" />
        </div>

        <h2
          className="fw-bold text-primary text-center"
          style={{ letterSpacing: "0.7px" }}
        >
          Recuperar Senha
        </h2>
        <p className="text-secondary fs-6 text-center mt-2">
          Informe seu e-mail para redefinir a senha.
        </p>

        <form onSubmit={handleReset} className="mt-4">
          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaEnvelope className="text-primary" />
            </span>
            <input
              type="email"
              className="form-control border-0 shadow-none"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold py-3 shadow-sm mt-3"
            style={{
              fontSize: "1.1rem",
              borderRadius: "1.2rem",
              letterSpacing: "0.05em",
            }}
          >
            Enviar link
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              className="btn btn-link fw-semibold p-0 text-decoration-none"
              onClick={() => navigate("/login")}
              style={{ color: "#4a6ef0" }}
            >
              Voltar para Login
            </button>
          </div>

          {mensagem && (
            <div
              className="alert alert-success text-center mt-3"
              style={{
                borderRadius: "0.75rem",
                fontWeight: "600",
              }}
            >
              {mensagem}
              <div className="small mt-1">Redirecionando para login...</div>
            </div>
          )}

          {erro && (
            <div
              className="alert alert-danger text-center mt-3"
              style={{
                borderRadius: "0.75rem",
                fontWeight: "600",
              }}
            >
              {erro}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
