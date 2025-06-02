// src/components/MarketplaceProdutoresPage.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, push, set, remove } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function MarketplaceProdutoresPage({ user, onVoltar }) {
  const [produtores, setProdutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meuAnuncio, setMeuAnuncio] = useState({
    nomeProduto: "",
    descricao: "",
    preco: "",
    imagemUrl: "",
  });
  const [filtroTexto, setFiltroTexto] = useState(""); // filtro de pesquisa
  const [ordemPreco, setOrdemPreco] = useState("nenhum"); // "nenhum" | "asc" | "desc"
  const navigate = useNavigate();

  useEffect(() => {
    const prodRef = ref(db, "produtores");
    get(prodRef)
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([id, info]) => ({ id, ...info }));
        setProdutores(arr);
      })
      .catch(() => {
        setProdutores([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCadastrar = async (e) => {
    e.preventDefault();
    if (!meuAnuncio.nomeProduto || !meuAnuncio.preco) return;

    const newRef = push(ref(db, "produtores"));
    await set(newRef, {
      usuarioId: user.uid,
      nomeUsuario: user.displayName || user.email,
      nomeProduto: meuAnuncio.nomeProduto,
      descricao: meuAnuncio.descricao,
      preco: parseFloat(meuAnuncio.preco),
      imagemUrl: meuAnuncio.imagemUrl,
      timestamp: Date.now(),
    });

    setProdutores((prev) => [
      {
        id: newRef.key,
        usuarioId: user.uid,
        nomeUsuario: user.displayName || user.email,
        nomeProduto: meuAnuncio.nomeProduto,
        descricao: meuAnuncio.descricao,
        preco: parseFloat(meuAnuncio.preco),
        imagemUrl: meuAnuncio.imagemUrl,
        timestamp: Date.now(),
      },
      ...prev,
    ]);

    setMeuAnuncio({
      nomeProduto: "",
      descricao: "",
      preco: "",
      imagemUrl: "",
    });
  };

  const handleRemover = async (id, autorId) => {
    if (autorId !== user.uid) return;
    await remove(ref(db, `produtores/${id}`));
    setProdutores((prev) => prev.filter((x) => x.id !== id));
  };

  // Retorna true se o anúncio for de menos de 7 dias
  const isNovo = (timestamp) => {
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < seteDias;
  };

  // Filtra e ordena conforme estado
  const filtrados = produtores
    .filter((a) =>
      a.nomeProduto.toLowerCase().includes(filtroTexto.toLowerCase())
    )
    .sort((a, b) => {
      if (ordemPreco === "asc") return a.preco - b.preco;
      if (ordemPreco === "desc") return b.preco - a.preco;
      return b.timestamp - a.timestamp; // padrão: mais recente primeiro
    });

  return (
    <div className="container my-5 px-3 px-md-4">
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>

      <h2 className="mb-4">Marketplace de Pequenos Produtores</h2>
      <p className="text-muted mb-4">
        Cestas orgânicas, alimentos artesanais, e muito mais.
      </p>

      {/* Seção de cadastro para produtores */}
      <div className="card mb-5 shadow-sm" style={{ borderRadius: "8px" }}>
        <div className="card-body">
          <h5 className="card-title mb-3">Quero Anunciar um Produto</h5>
          <form onSubmit={handleCadastrar}>
            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Nome do produto"
                value={meuAnuncio.nomeProduto}
                onChange={(e) =>
                  setMeuAnuncio({ ...meuAnuncio, nomeProduto: e.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <textarea
                className="form-control"
                placeholder="Descrição breve"
                rows="2"
                value={meuAnuncio.descricao}
                onChange={(e) =>
                  setMeuAnuncio({ ...meuAnuncio, descricao: e.target.value })
                }
              />
            </div>
            <div className="mb-3 row gx-2">
              <div className="col">
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="Preço (R$)"
                  value={meuAnuncio.preco}
                  onChange={(e) =>
                    setMeuAnuncio({ ...meuAnuncio, preco: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col">
                <input
                  type="url"
                  className="form-control"
                  placeholder="URL da imagem (opcional)"
                  value={meuAnuncio.imagemUrl}
                  onChange={(e) =>
                    setMeuAnuncio({ ...meuAnuncio, imagemUrl: e.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn btn-success" type="submit">
              Publicar Anúncio
            </button>
          </form>
        </div>
      </div>

      {/* Filtro e ordenação */}
      <div className="row align-items-center mb-4">
        <div className="col-md-6 mb-2 mb-md-0">
          <input
            type="text"
            className="form-control"
            placeholder="Buscar por nome do produto"
            value={filtroTexto}
            onChange={(e) => setFiltroTexto(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={ordemPreco}
            onChange={(e) => setOrdemPreco(e.target.value)}
          >
            <option value="nenhum">Ordenar por</option>
            <option value="asc">Preço: menor → maior</option>
            <option value="desc">Preço: maior → menor</option>
          </select>
        </div>
        <div className="col-md-3 text-md-end">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setFiltroTexto("");
              setOrdemPreco("nenhum");
            }}
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <hr />

      {/* Lista de anúncios de produtores */}
      {loading ? (
        <div>Carregando anúncios…</div>
      ) : filtrados.length === 0 ? (
        <div className="alert alert-info">Nenhum anúncio disponível.</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filtrados.map((a) => (
            <div key={a.id} className="col">
              <div
                className="card h-100 shadow-sm"
                style={{ borderRadius: "12px" }}
              >
                {a.imagemUrl && (
                  <img
                    src={a.imagemUrl}
                    className="card-img-top"
                    alt={a.nomeProduto}
                    style={{ objectFit: "cover", height: "180px" }}
                  />
                )}
                <div className="card-body d-flex flex-column">
                  <div className="d-flex align-items-center mb-2">
                    <h5 className="card-title mb-0">{a.nomeProduto}</h5>
                    {isNovo(a.timestamp) && (
                      <span
                        className="badge bg-success ms-2"
                        style={{ fontSize: "0.75rem" }}
                      >
                        Novo
                      </span>
                    )}
                  </div>
                  <p
                    className="card-text text-muted"
                    style={{ fontSize: "0.9rem" }}
                  >
                    {a.descricao || "—"}
                  </p>
                  <p className="fw-bold mt-auto mb-2">
                    R$ {a.preco.toFixed(2)}
                  </p>
                  <p className="text-secondary" style={{ fontSize: "0.8rem" }}>
                    Por: {a.nomeUsuario}
                    <br />
                    <small>{new Date(a.timestamp).toLocaleDateString()}</small>
                  </p>
                  {a.usuarioId === user.uid && (
                    <button
                      className="btn btn-outline-danger btn-sm mt-2"
                      onClick={() => handleRemover(a.id, a.usuarioId)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-center mt-5">
        <button
          className="btn btn-outline-secondary"
          onClick={onVoltar}
          style={{ borderRadius: "20px", fontWeight: 500, letterSpacing: 0.5 }}
        >
          &larr; Voltar ao Início
        </button>
      </div>
    </div>
  );
}
