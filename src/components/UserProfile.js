import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, get, update, remove } from "firebase/database";

export default function UserProfile({ user }) {
  const [form, setForm] = useState({
    nome: "",
    sobrenome: "",
    cep: "",
    celular: "",
  });
  const [loading, setLoading] = useState(true);
  const [salvo, setSalvo] = useState(false);

  const [carts, setCarts] = useState([]);
  const [cartsLoading, setCartsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Perfil
    get(ref(db, `usuarios/${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const d = snap.val();
        setForm({
          nome: d.nome || "",
          sobrenome: d.sobrenome || "",
          cep: d.cep || "",
          celular: d.celular || "",
        });
      }
      setLoading(false);
    });
    // Carrinhos
    get(ref(db, `usuarios/${user.uid}/carts`)).then((snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => b.criadoEm - a.criadoEm);
      setCarts(arr);
      setCartsLoading(false);
    });
  }, [user]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await update(ref(db, `usuarios/${user.uid}`), form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  const handleDeleteCart = async (id) => {
    await remove(ref(db, `usuarios/${user.uid}/carts/${id}`));
    setCarts((c) => c.filter((x) => x.id !== id));
  };

  if (loading) return <div>Carregando perfil...</div>;

  return (
    <div className="container mt-4" style={{ maxWidth: 600 }}>
      <h4 className="mb-4">Meu Perfil</h4>
      <form onSubmit={handleSaveProfile}>
        <div className="mb-3">
          <label className="form-label">E-mail</label>
          <input className="form-control" value={user.email} disabled />
        </div>
        {["nome", "sobrenome", "cep", "celular"].map((field) => (
          <div className="mb-3" key={field}>
            <label className="form-label">
              {field.charAt(0).toUpperCase() + field.slice(1)}
            </label>
            <input
              className="form-control"
              name={field}
              value={form[field]}
              onChange={handleChange}
            />
          </div>
        ))}
        <button className="btn btn-primary w-100" type="submit">
          Salvar Dados
        </button>
      </form>
      {salvo && (
        <div className="alert alert-success mt-3">
          Perfil atualizado com sucesso!
        </div>
      )}

      <hr className="my-4" />

      <h4 className="mb-3">Meus Carrinhos Salvos</h4>
      {cartsLoading ? (
        <div>Carregando carrinhos…</div>
      ) : carts.length === 0 ? (
        <div className="alert alert-info">Você não tem carrinhos salvos.</div>
      ) : (
        <ul className="list-group mb-4">
          {carts.map((cart) => {
            const total = cart.items.reduce(
              (sum, it) => sum + Number(it.price),
              0
            );
            return (
              <li
                key={cart.id}
                className="list-group-item d-flex justify-content-between align-items-start"
              >
                <div>
                  <small className="text-muted">
                    {new Date(cart.criadoEm).toLocaleString()}
                  </small>
                  <ul className="mt-1 mb-1">
                    {cart.items.map((it, idx) => (
                      <li key={idx} style={{ fontSize: 14 }}>
                        {it.name} — R${" "}
                        {Number(it.price).toFixed(2).replace(".", ",")}
                      </li>
                    ))}
                  </ul>
                  <div>
                    <strong>
                      {cart.items.length}{" "}
                      {cart.items.length !== 1 ? "itens" : "item"} — Total: R${" "}
                      {total.toFixed(2).replace(".", ",")}
                    </strong>
                  </div>
                </div>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDeleteCart(cart.id)}
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
