// src/components/TrocasPage.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, push, set, remove } from "firebase/database";

export default function TrocasPage({ user, onVoltar }) {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ texto: "" });
  const [error, setError] = useState("");

  // 1) Carrega todos os anúncios de trocas
  useEffect(() => {
    const trocasRef = ref(db, "trocas");
    get(trocasRef)
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([id, info]) => ({ id, ...info }));
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setAnuncios(arr);
      })
      .catch(() => {
        setAnuncios([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // 2) Publicar novo anúncio
  const handlePublicar = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.texto.trim()) {
      setError("Informe o texto da sua troca.");
      return;
    }
    const trocasRef = ref(db, "trocas");
    const newRef = push(trocasRef);
    const novoAnuncio = {
      usuario: user.uid,
      nomeUsuario: user.displayName || user.email,
      texto: form.texto.trim(),
      timestamp: Date.now(),
    };
    await set(newRef, novoAnuncio);
    setForm({ texto: "" });
    setAnuncios((prev) => [{ id: newRef.key, ...novoAnuncio }, ...prev]);
  };

  // 3) Remover anúncio próprio
  const handleRemover = async (id, autor) => {
    if (autor !== user.uid) return;
    const anuncioRef = ref(db, `trocas/${id}`);
    await remove(anuncioRef);
    setAnuncios((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div
      className="container my-5 d-flex flex-column align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <style>{`
        /* Glass container */
        .glass-container {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 1.5rem;
          border: 1.5px solid rgba(25, 135, 84, 0.19);
          backdrop-filter: blur(18px);
          box-shadow: 0 10px 36px rgba(59, 247, 135, 0.26), 0 2px 16px rgba(43, 229, 171, 0.4);
          transition: box-shadow 0.3s, transform 0.3s;
        }
        .glass-container:hover {
          box-shadow: 0 12px 54px rgba(59, 247, 135, 0.45), 0 2.5px 22px rgba(71, 255, 201, 0.75);
          transform: scale(1.01);
        }

        /* Textarea estilizado */
        .form-textarea {
          background: rgba(255, 255, 255, 0.10);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 0.75rem;
          color: #222;
        }
        .form-textarea:focus {
          border-color: #198754 !important;
          box-shadow: 0 0 8px rgba(25, 135, 84, 0.4) !important;
        }

        /* Botão neon verde */
        .btn-neon {
          background: #198754;
          color: #fff;
          border-radius: 50px !important;
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: 1px;
          transition: box-shadow 0.2s, background 0.2s, color 0.2s;
        }
        .btn-neon:hover, .btn-neon:focus {
          background: #fff !important;
          color: #198754 !important;
          box-shadow: 0 0 12px #3bf787dd, 0 0 40px #47ffc790;
        }

        /* Cartão de cada anúncio */
        .anuncio-card {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .anuncio-card:hover {
          box-shadow: 0 6px 18px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }

        .timestamp {
          font-size: 0.8rem;
          color: #666;
        }

        .nome-usuario {
          font-weight: 600;
          color: #198754;
        }
      `}</style>

      <div className="w-100 mb-3">
        <button
          className="btn btn-outline-secondary"
          onClick={onVoltar}
          style={{ borderRadius: "20px", fontWeight: 500, letterSpacing: 0.5 }}
        >
          &larr; Voltar
        </button>
      </div>

      <h2 className="mb-4">Clubinho de Trocas</h2>
      <p className="mb-4 text-center">
        Ofereça produtos em excesso e troque com outros usuários.
      </p>

      <div className="glass-container p-4 mb-5 w-100" style={{ maxWidth: 600 }}>
        <form onSubmit={handlePublicar}>
          <div className="mb-3 position-relative">
            <textarea
              className="form-control form-textarea ps-3 pt-3"
              rows="3"
              placeholder="Ex.: Tenho 5 latas de feijão, aceito trocar por 2 pacotes de macarrão"
              value={form.texto}
              onChange={(e) => setForm({ texto: e.target.value })}
              style={{ resize: "none", minHeight: "100px" }}
            />
          </div>
          {error && (
            <div className="alert alert-danger text-center mb-2">{error}</div>
          )}
          <div className="text-end">
            <button className="btn btn-neon px-4 py-2" type="submit">
              Publicar
            </button>
          </div>
        </form>
      </div>

      <hr style={{ width: "100%", maxWidth: 600, borderColor: "#e3e3e3" }} />

      {loading ? (
        <div className="mt-4">Carregando anúncios…</div>
      ) : anuncios.length === 0 ? (
        <div className="alert alert-info mt-4 w-100" style={{ maxWidth: 600 }}>
          Nenhum anúncio de troca ainda.
        </div>
      ) : (
        <div className="w-100" style={{ maxWidth: 600 }}>
          {anuncios.map((a) => (
            <div
              key={a.id}
              className="anuncio-card mb-3 p-3 d-flex justify-content-between align-items-start"
            >
              <div className="flex-grow-1">
                <div className="nome-usuario">{a.nomeUsuario}</div>
                <div className="timestamp">
                  {new Date(a.timestamp).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <p className="mt-2 mb-0" style={{ fontSize: "0.95rem" }}>
                  {a.texto}
                </p>
              </div>
              {a.usuario === user.uid && (
                <button
                  className="btn btn-outline-danger btn-sm ms-3"
                  onClick={() => handleRemover(a.id, a.usuario)}
                >
                  Excluir
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
