import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  set,
  get,
} from "firebase/database";

export default function OfertasMercado({ mercado, user, onVoltar }) {
  const [ofertas, setOfertas] = useState([]);
  const [novo, setNovo] = useState({ valor: "", objeto: "" });
  const [editando, setEditando] = useState(null);
  const [editInput, setEditInput] = useState({ valor: "", objeto: "" });

  useEffect(() => {
    const ofertasRef = ref(db, `mercados/${mercado.id}/ofertas`);
    const off = onValue(ofertasRef, (snap) => {
      const data = snap.val() || {};
      setOfertas(Object.entries(data).map(([id, o]) => ({ id, ...o })));
    });
    return () => off();
  }, [mercado.id]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novo.valor || !novo.objeto) return;

    const mercadoRef = ref(db, `mercados/${mercado.id}`);

    const snapshot = await get(mercadoRef);
    if (!snapshot.exists()) {
      await set(mercadoRef, {
        nome: mercado.nome,
        rua: mercado.rua,
        estado: mercado.estado,
        pais: mercado.pais,
      });
    }

    const ofertasRef = ref(db, `mercados/${mercado.id}/ofertas`);
    await push(ofertasRef, {
      usuario: user.uid,
      valor: novo.valor,
      objeto: novo.objeto,
      criadoEm: Date.now(),
    });

    await set(ref(db, `usuarios/${user.uid}/mercadosAtivos/${mercado.id}`), {
      nome: mercado.nome,
      rua: mercado.rua,
      estado: mercado.estado,
      pais: mercado.pais,
      dataUltimaOferta: Date.now(),
      valorUltimaOferta: novo.valor,
      objetoUltimaOferta: novo.objeto,
    });

    setNovo({ valor: "", objeto: "" });
  };

  const handleDelete = (ofertaId) => {
    const ofertaRef = ref(db, `mercados/${mercado.id}/ofertas/${ofertaId}`);
    remove(ofertaRef);
  };

  const startEdit = (oferta) => {
    setEditando(oferta.id);
    setEditInput({ valor: oferta.valor, objeto: oferta.objeto });
  };

  const saveEdit = (ofertaId) => {
    const ofertaRef = ref(db, `mercados/${mercado.id}/ofertas/${ofertaId}`);
    update(ofertaRef, {
      valor: editInput.valor,
      objeto: editInput.objeto,
    });
    setEditando(null);
    setEditInput({ valor: "", objeto: "" });
  };

  const cancelEdit = () => {
    setEditando(null);
    setEditInput({ valor: "", objeto: "" });
  };

  function formatarDataHora(timestamp) {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="container my-4">
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>
      <h4>
        Ofertas em <span className="text-primary">{mercado.nome}</span>
        <br />
        <small className="text-secondary">
          {mercado.rua && <>{mercado.rua}, </>}
          {mercado.estado && <>{mercado.estado}, </>}
          {mercado.pais}
        </small>
      </h4>

      <form className="row g-2 mb-4" onSubmit={handleAdd}>
        <div className="col">
          <input
            className="form-control"
            placeholder="Produto/Objeto"
            value={novo.objeto}
            onChange={(e) => setNovo({ ...novo, objeto: e.target.value })}
          />
        </div>
        <div className="col">
          <input
            className="form-control"
            placeholder="Valor"
            value={novo.valor}
            onChange={(e) => setNovo({ ...novo, valor: e.target.value })}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-success" type="submit">
            Adicionar
          </button>
        </div>
      </form>

      <ul className="list-group">
        {ofertas.length === 0 && (
          <li className="list-group-item">Nenhuma oferta cadastrada.</li>
        )}
        {ofertas.map((oferta) => (
          <li
            className="list-group-item d-flex align-items-center"
            key={oferta.id}
          >
            {editando === oferta.id ? (
              <>
                <input
                  className="form-control me-2"
                  value={editInput.objeto}
                  onChange={(e) =>
                    setEditInput({ ...editInput, objeto: e.target.value })
                  }
                  style={{ maxWidth: 160 }}
                />
                <input
                  className="form-control me-2"
                  value={editInput.valor}
                  onChange={(e) =>
                    setEditInput({ ...editInput, valor: e.target.value })
                  }
                  style={{ maxWidth: 100 }}
                />
                <button
                  className="btn btn-primary btn-sm me-1"
                  onClick={() => saveEdit(oferta.id)}
                >
                  Salvar
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={cancelEdit}
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <div className="flex-grow-1">
                  <strong>{oferta.objeto}</strong> —{" "}
                  <span className="text-success">{oferta.valor}</span>
                  <br />
                  <small className="text-muted">
                    Adicionado por:{" "}
                    {oferta.usuario === user.uid
                      ? "Você"
                      : oferta.usuario.substr(0, 8)}
                    <br />
                    {oferta.criadoEm && (
                      <>
                        <span className="text-secondary">
                          {formatarDataHora(oferta.criadoEm)}
                        </span>
                      </>
                    )}
                  </small>
                </div>
                {oferta.usuario === user.uid && (
                  <>
                    <button
                      className="btn btn-outline-primary btn-sm me-2"
                      onClick={() => startEdit(oferta)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDelete(oferta.id)}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
