import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';

export default function Register({ onAuth, showLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, senha);
      await set(ref(db, `usuarios/${res.user.uid}`), { email });
      onAuth();
    } catch (err) {
      setErro(err.message);
    }
  };

  return (
    <div className="container mt-5" style={{maxWidth:400}}>
      <h2>Registrar</h2>
      <form onSubmit={handleRegister}>
        <input className="form-control mb-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail" required/>
        <input className="form-control mb-2" type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" required/>
        <button className="btn btn-success w-100" type="submit">Registrar</button>
      </form>
      {erro && <div className="alert alert-danger mt-2">{erro}</div>}
      <p className="mt-2">
        Já tem conta? <span className="text-primary" role="button" onClick={showLogin}>Login</span>
      </p>
    </div>
  );
}
