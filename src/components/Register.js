import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";
import {
  FaUser,
  FaUserCircle,
  FaPhone,
  FaEnvelope,
  FaLock,
  FaRegEye,
} from "react-icons/fa";

export default function Register({ onAuth, showLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmSenha, setConfirmSenha] = useState("");
  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [celular, setCelular] = useState("");
  const [erro, setErro] = useState("");
  const [senhaForca, setSenhaForca] = useState({ label: "", score: 0 });

  const calcularForca = (pwd) => {
    let pontos = 0;
    if (pwd.length >= 8) pontos += 1;
    if (/[A-Z]/.test(pwd)) pontos += 1;
    if (/[0-9]/.test(pwd)) pontos += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) pontos += 1;
    if (pontos <= 1) return { label: "Fraca", score: 33 };
    if (pontos === 2) return { label: "Média", score: 66 };
    return { label: "Forte", score: 100 };
  };

  const handleSenhaChange = (e) => {
    const val = e.target.value;
    setSenha(val);
    setSenhaForca(calcularForca(val));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    if (senhaForca.label === "Fraca") {
      setErro("Escolha uma senha mais forte.");
      return;
    }

    if (!/^\d{10,11}$/.test(celular)) {
      setErro("Celular inválido (10 ou 11 dígitos).");
      return;
    }

    try {
      const res = await createUserWithEmailAndPassword(auth, email, senha);
      await updateProfile(res.user, { displayName: nome });
      await set(ref(db, `usuarios/${res.user.uid}`), {
        email,
        nome,
        apelido,
        celular,
      });
      onAuth();
    } catch (err) {
      setErro("Erro ao registrar: " + err.message);
    }
  };

  const getBarClass = () => {
    if (senhaForca.score <= 33) return "bg-danger";
    if (senhaForca.score <= 66) return "bg-warning";
    return "bg-success";
  };

  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100 px-3"
      style={{
        background: "linear-gradient(135deg, #f4fbff 0%, #f4fafe 100%)",
        paddingTop: "110px",
      }}
    >
<div className="w-100" style={{ maxWidth: "520px" }}>
  <div className="card shadow-lg rounded-4 border-0">
    <div className="card-body p-4">
      <h2 className="text-center fw-bold mb-4 text-primary">
        Criar Conta na LightHand
      </h2>

      <form onSubmit={handleRegister}>

        {/* Nome completo */}
        <div className="mb-3">
          <label htmlFor="nome" className="form-label">Nome completo</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaUser />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              id="nome"
              placeholder="Nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              style={{ height: "48px" }}
            />
          </div>
        </div>

        {/* Apelido */}
        <div className="mb-3">
          <label htmlFor="apelido" className="form-label">Apelido</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaUserCircle />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              id="apelido"
              placeholder="Apelido"
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              required
              style={{ height: "48px" }}
            />
          </div>
        </div>

        {/* Celular */}
        <div className="mb-3">
          <label htmlFor="celular" className="form-label">Celular (com DDD)</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaPhone />
            </span>
            <input
              type="tel"
              className="form-control border-start-0"
              id="celular"
              placeholder="Celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              required
              style={{ height: "48px" }}
            />
          </div>
        </div>

        {/* E-mail */}
        <div className="mb-3">
          <label htmlFor="email" className="form-label">E-mail</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaEnvelope />
            </span>
            <input
              type="email"
              className="form-control border-start-0"
              id="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ height: "48px" }}
            />
          </div>
        </div>

        {/* Senha */}
        <div className="mb-3">
          <label htmlFor="senha" className="form-label">Senha</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaLock />
            </span>
            <input
              type="password"
              className="form-control border-start-0"
              id="senha"
              placeholder="Senha"
              value={senha}
              onChange={handleSenhaChange}
              required
              style={{ height: "48px" }}
            />
          </div>

          {senha && (
            <div className="mt-2">
              <div className="progress" style={{ height: "6px" }}>
                <div
                  className={`progress-bar ${getBarClass()}`}
                  role="progressbar"
                  style={{ width: `${senhaForca.score}%` }}
                ></div>
              </div>
              <small className={`form-text ${getBarClass()}`}>
                {senhaForca.label}
              </small>
            </div>
          )}
        </div>

        {/* Confirmar Senha */}
        <div className="mb-4">
          <label htmlFor="confirmSenha" className="form-label">Confirmar Senha</label>
          <div className="input-group input-group-lg">
            <span className="input-group-text bg-white border-end-0">
              <FaLock />
            </span>
            <input
              type="password"
              className="form-control border-start-0"
              id="confirmSenha"
              placeholder="Confirmar Senha"
              value={confirmSenha}
              onChange={(e) => setConfirmSenha(e.target.value)}
              required
              style={{ height: "48px" }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary w-100 fw-bold py-2 mb-3"
        >
          Criar Conta
        </button>

        {erro && (
          <div className="alert alert-danger text-center py-2">
            {erro}
          </div>
        )}

        <div className="text-center">
          <small className="text-muted">Já possui conta?</small>
          <br />
          <button
            type="button"
            className="btn btn-link fw-semibold"
            onClick={showLogin}
          >
            Entrar
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

      <style>{`
      .form-icon-end {
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        color: #6c757d;
        pointer-events: none;
      }
    `}</style>
    </div>
  );
}
