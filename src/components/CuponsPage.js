// src/components/CuponsPage.js
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { ref, get, push, set } from "firebase/database";

export default function CuponsPage() {
  const [cupons, setCupons] = useState([]);
  const [novoCodigo, setNovoCodigo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCupons() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      const cuponsRef = ref(db, `usuarios/${user.uid}/coupons`);
      const snap = await get(cuponsRef);
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, c]) => ({ id, ...c }));
      setCupons(arr);
      setLoading(false);
    }
    fetchCupons();
  }, []);

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    setError("");
    if (!novoCodigo.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    // Adiciona no banco
    const cuponsRef = ref(db, `usuarios/${user.uid}/coupons`);
    const newRef = push(cuponsRef);
    await set(newRef, {
      code: novoCodigo.trim(),
      criadoEm: Date.now(),
      status: "ativo", // ou "usado"
    });
    setCupons((prev) => [
      ...prev,
      { id: newRef.key, code: novoCodigo.trim(), criadoEm: Date.now(), status: "ativo" },
    ]);
    setNovoCodigo("");
  };

  const handleUseCoupon = async (couponId) => {
    const user = auth.currentUser;
    if (!user) return;
    // Marca como usado
    const cupRef = ref(db, `usuarios/${user.uid}/coupons/${couponId}`);
    await set(cupRef, { status: "usado", usadoEm: Date.now() });
    setCupons((prev) =>
      prev.map((c) =>
        c.id === couponId ? { ...c, status: "usado", usadoEm: Date.now() } : c
      )
    );
  };

  if (loading) {
    return (
      <div className="container my-5">
        <p>Carregando cupons...</p>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4">
      <h2 className="mb-4">Pagamentos &amp; Cupons</h2>
      <form className="row g-2 align-items-center mb-4" onSubmit={handleAddCoupon}>
        <div className="col-auto">
          <input
            className="form-control"
            type="text"
            placeholder="Código do cupom"
            value={novoCodigo}
            onChange={(e) => setNovoCodigo(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-success" type="submit">
            Adicionar Cupom
          </button>
        </div>
      </form>
      {error && <div className="alert alert-danger">{error}</div>}

      {cupons.length === 0 ? (
        <div className="alert alert-info">
          Você ainda não adicionou nenhum cupom.
        </div>
      ) : (
        <ul className="list-group mb-4">
          {cupons.map((c) => (
            <li
              key={c.id}
              className={`list-group-item d-flex justify-content-between align-items-center ${
                c.status === "usado" ? "list-group-item-secondary" : ""
              }`}
            >
              <div>
                <strong>{c.code}</strong>{" "}
                <small className="text-muted">
                  ({new Date(c.criadoEm).toLocaleDateString("pt-BR")})
                </small>
              </div>
              {c.status === "ativo" ? (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => handleUseCoupon(c.id)}
                >
                  Marcar como usado
                </button>
              ) : (
                <span className="badge bg-secondary">Usado</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted">
        Aqui você pode cadastrar seus cupons de desconto e gerenciar o status deles (ativo/usado).
      </p>
      {/* Se desejar, acrescente opções de formas de pagamento no futuro */}
    </div>
  );
}
