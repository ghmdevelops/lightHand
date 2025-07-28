import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import {
  FaUserCircle,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaRegEye,
  FaRegEyeSlash,
} from "react-icons/fa";

export default function Register({ showLogin }) {
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const toggleSenha = () => setMostrarSenha((prev) => !prev);

  const getSenhaStrength = () => {
    let strength = 0;
    if (senha.length >= 6) strength += 25;
    if (/[A-Z]/.test(senha)) strength += 25;
    if (/[0-9]/.test(senha)) strength += 25;
    if (/[^A-Za-z0-9]/.test(senha)) strength += 25;
    return strength;
  };

  const getSenhaColor = () => {
    const strength = getSenhaStrength();
    if (strength <= 25) return "bg-danger";
    if (strength <= 50) return "bg-warning";
    if (strength <= 75) return "bg-info";
    return "bg-success";
  };

  const getSenhaLabel = () => {
    const strength = getSenhaStrength();
    if (strength <= 25) return "Fraca";
    if (strength <= 50) return "Média";
    if (strength <= 75) return "Boa";
    return "Forte";
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!nome || !apelido || !email || !telefone || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const user = userCredential.user;

      await updateProfile(user, { displayName: nome });

      await set(ref(db, "usuarios/" + user.uid), {
        nome,
        apelido,
        email,
        telefone,
      });

      setErro("");
      alert("Conta criada com sucesso!");
      showLogin();
    } catch (err) {
      setErro("Erro ao criar conta: " + err.message);
    }
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center px-3 mb-5"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #e9f0fb 0%, #f7f9fc 100%)",
        fontFamily: "'Inter', sans-serif",
        paddingTop: "130px",
      }}
    >
      <div
        className="shadow-lg rounded-5 p-4 p-md-5 bg-white w-100"
        style={{
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
        <div className="text-center">
          <h2 className="mt-2 fw-bold text-primary" style={{ letterSpacing: "0.7px" }}>
            Crie sua conta
          </h2>
          <p className="text-secondary fs-6 mt-2">
            Preencha os dados para começar sua jornada.
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-4">
          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaUserCircle className="text-primary" />
            </span>
            <input
              type="text"
              className="form-control border-0 shadow-none"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>

          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaUserCircle className="text-primary" />
            </span>
            <input
              type="text"
              className="form-control border-0 shadow-none"
              placeholder="Apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              required
            />
          </div>

          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaEnvelope className="text-primary" />
            </span>
            <input
              type="email"
              className="form-control border-0 shadow-none"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaPhone className="text-primary" />
            </span>
            <input
              type="tel"
              className="form-control border-0 shadow-none"
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              required
            />
          </div>

          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaLock className="text-primary" />
            </span>
            <input
              type={mostrarSenha ? "text" : "password"}
              className="form-control border-0 shadow-none"
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <span
              className="input-group-text bg-white border-0"
              style={{ cursor: "pointer" }}
              onClick={toggleSenha}
            >
              {mostrarSenha ? <FaRegEyeSlash /> : <FaRegEye />}
            </span>
          </div>

          {senha.length > 0 && (
            <div className="mb-3">
              <div
                className="progress"
                style={{
                  height: "8px",
                  borderRadius: "20px",
                  backgroundColor: "#e9ecef",
                }}
              >
                <div
                  className={`progress-bar ${getSenhaColor()}`}
                  role="progressbar"
                  style={{ width: `${getSenhaStrength()}%` }}
                />
              </div>
              <small
                className={`text-${getSenhaColor().replace("bg-", "")} fw-semibold mt-1 d-block`}
              >
                Força da senha: {getSenhaLabel()}
              </small>
            </div>
          )}

          <div className="input-group shadow-sm rounded-3 overflow-hidden mb-3">
            <span className="input-group-text bg-white border-0">
              <FaLock className="text-primary" />
            </span>
            <input
              type={mostrarSenha ? "text" : "password"}
              className="form-control border-0 shadow-none"
              placeholder="Confirmar senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
            <span
              className="input-group-text bg-white border-0"
              style={{ cursor: "pointer" }}
              onClick={toggleSenha}
            >
              {mostrarSenha ? <FaRegEyeSlash /> : <FaRegEye />}
            </span>
          </div>

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

          <button
            type="submit"
            className="btn btn-primary w-100 fw-semibold py-3 shadow-sm mt-3"
            style={{
              fontSize: "1.1rem",
              borderRadius: "1.2rem",
              letterSpacing: "0.05em",
            }}
          >
            Criar Conta
          </button>
        </form>

        <div className="text-center mt-4">
          <span className="text-muted me-2">Já possui conta?</span>
          <button
            type="button"
            className="btn btn-link fw-semibold p-0 text-decoration-none"
            onClick={showLogin}
            style={{ color: "#4a6ef0" }}
          >
            Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
