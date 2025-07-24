import React, { useState } from "react";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ref, set } from "firebase/database";

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
      className="d-flex justify-content-center align-items-center min-vh-100 px-3 text-dark"
      style={{
        backgroundColor: "#f8fafc",
        backgroundImage:
          "linear-gradient(135deg, #f4fbffff 0%, #f4fafeff 100%)",
        zIndex: 2,
        paddingTop: "110px",
      }}
    >
      <div className="w-100" style={{ maxWidth: "500px" }}>
        <div className="card shadow-lg rounded-4 bg-white text-dark">
          <div className="p-4">
            <h3 className="fw-bold text-center mb-4">
              Criar Conta na LightHand
            </h3>
            <form onSubmit={handleRegister}>
              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="floatingNome"
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
                <label htmlFor="floatingNome">Nome completo</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="text"
                  className="form-control"
                  id="floatingApelido"
                  placeholder="Apelido"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  required
                />
                <label htmlFor="floatingApelido">Apelido</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="tel"
                  className="form-control"
                  id="floatingCelular"
                  placeholder="Celular"
                  value={celular}
                  onChange={(e) => setCelular(e.target.value)}
                  required
                />
                <label htmlFor="floatingCelular">Celular (10-11 dígitos)</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="email"
                  className="form-control"
                  id="floatingEmail"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <label htmlFor="floatingEmail">E-mail</label>
              </div>

              <div className="form-floating mb-3">
                <input
                  type="password"
                  className="form-control"
                  id="floatingSenha"
                  placeholder="Senha"
                  value={senha}
                  onChange={handleSenhaChange}
                  required
                />
                <label htmlFor="floatingSenha">Senha</label>

                {senha && (
                  <div className="mt-2">
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className={`progress-bar ${getBarClass()}`}
                        role="progressbar"
                        style={{ width: `${senhaForca.score}%` }}
                        aria-valuenow={senhaForca.score}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      ></div>
                    </div>
                    <small className={`form-text mt-1 ${getBarClass()}`}>
                      {senhaForca.label}
                    </small>
                  </div>
                )}
              </div>

              <div className="form-floating mb-4">
                <input
                  type="password"
                  className="form-control"
                  id="floatingConfirmSenha"
                  placeholder="Confirmar Senha"
                  value={confirmSenha}
                  onChange={(e) => setConfirmSenha(e.target.value)}
                  required
                />
                <label htmlFor="floatingConfirmSenha">Confirmar Senha</label>
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 mb-3">
                Registrar
              </button>

              {erro && (
                <div className="alert alert-danger text-center py-2">
                  {erro}
                </div>
              )}

              <div className="text-center">
                <span>Já tem conta? </span>
                <button
                  type="button"
                  className="btn btn-link p-0 fw-semibold"
                  onClick={showLogin}
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
