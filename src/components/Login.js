import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login({ onAuth, showRegister }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, senha);
      onAuth();
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <div className="container mt-5" style={{maxWidth:400}}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input className="form-control mb-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" required/>
        <input className="form-control mb-2" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" required/>
        <button className="btn btn-primary w-100" type="submit">Entrar</button>
      </form>
      {erro && <div className="alert alert-danger mt-2">{erro}</div>}
      <p className="mt-2">
        Não tem conta? <span className="text-primary" role="button" onClick={showRegister}>Registrar</span>
      </p>
    </div>
  );
}
