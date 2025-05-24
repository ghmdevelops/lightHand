import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';

export default function UserProfile({ user }) {
  const [form, setForm] = useState({
    nome: '',
    sobrenome: '',
    cep: '',
    celular: ''
  });
  const [loading, setLoading] = useState(true);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `usuarios/${user.uid}`);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const dados = snapshot.val();
        setForm({
          nome: dados.nome || '',
          sobrenome: dados.sobrenome || '',
          cep: dados.cep || '',
          celular: dados.celular || ''
        });
      }
      setLoading(false);
    });
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const userRef = ref(db, `usuarios/${user.uid}`);
    await update(userRef, form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="container mt-4" style={{maxWidth: 500}}>
      <h4 className="mb-4">Meu Perfil</h4>
      <form onSubmit={handleSave}>
        <div className="mb-3">
          <label className="form-label">E-mail</label>
          <input className="form-control" value={user.email} disabled />
        </div>
        <div className="mb-3">
          <label className="form-label">Nome</label>
          <input className="form-control" name="nome" value={form.nome} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Sobrenome</label>
          <input className="form-control" name="sobrenome" value={form.sobrenome} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">CEP</label>
          <input className="form-control" name="cep" value={form.cep} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Celular</label>
          <input className="form-control" name="celular" value={form.celular} onChange={handleChange} />
        </div>
        <button className="btn btn-primary w-100" type="submit">Salvar Dados</button>
      </form>
      {salvo && <div className="alert alert-success mt-3">Dados salvos com sucesso!</div>}
    </div>
  );
}
