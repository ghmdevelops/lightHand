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
    celular: "",
    cep: "",
    localizacao: "",
  });

  const handlePrecoChange = (e) => {
    const valor = e.target.value;
    const valorFormatado = formatarPrecoInput(valor);
    setMeuAnuncio((prev) => ({
      ...prev,
      preco: valorFormatado,
    }));
  };

  const [filtroTexto, setFiltroTexto] = useState("");
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

    const precoNumero = precoFormatadoParaFloat(meuAnuncio.preco);

    const newRef = push(ref(db, "produtores"));
    await set(newRef, {
      usuarioId: user.uid,
      nomeUsuario: user.displayName || user.email,
      nomeProduto: meuAnuncio.nomeProduto,
      descricao: meuAnuncio.descricao,
      preco: precoNumero,
      imagemUrl: meuAnuncio.imagemUrl,
      celular: meuAnuncio.celular,
      cep: meuAnuncio.cep,
      localizacao: meuAnuncio.localizacao,
      timestamp: Date.now(),
    });

    setProdutores((prev) => [
      {
        id: newRef.key,
        usuarioId: user.uid,
        nomeUsuario: user.displayName || user.email,
        nomeProduto: meuAnuncio.nomeProduto,
        descricao: meuAnuncio.descricao,
        preco: precoNumero,
        imagemUrl: meuAnuncio.imagemUrl,
        celular: meuAnuncio.celular,
        cep: meuAnuncio.cep,
        localizacao: meuAnuncio.localizacao,
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

  const isNovo = (timestamp) => {
    const seteDias = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < seteDias;
  };

  const filtrados = produtores
    .filter((a) =>
      a.nomeProduto.toLowerCase().includes(filtroTexto.toLowerCase())
    )
    .sort((a, b) => {
      if (ordemPreco === "asc") return a.preco - b.preco;
      if (ordemPreco === "desc") return b.preco - a.preco;
      return b.timestamp - a.timestamp;
    });

  function formatarCelular(cel) {
    if (!cel) return "—";
    const c = cel.replace(/\D/g, "");
    if (c.length === 11) {
      return `(${c.slice(0, 2)}) ${c.slice(2, 7)}-${c.slice(7)}`;
    } else if (c.length === 10) {
      return `(${c.slice(0, 2)}) ${c.slice(2, 6)}-${c.slice(6)}`;
    }
    return cel;
  }

  function formatarCelularInput(valor) {
    let numeros = valor.replace(/\D/g, "");

    if (numeros.length > 11) numeros = numeros.slice(0, 11);

    if (numeros.length <= 2) {
      return `(${numeros}`;
    } else if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    } else if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(
        6
      )}`;
    } else {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(
        7
      )}`;
    }
  }

  function formatarPrecoInput(valor) {
    if (!valor) return "";
    let numeros = valor.replace(/\D/g, "");

    if (numeros.length > 15) numeros = numeros.slice(0, 15);
    while (numeros.length < 3) numeros = "0" + numeros;

    const parteInteira = numeros.slice(0, -2);
    const parteDecimal = numeros.slice(-2);
    const parteInteiraFormatada = parteInteira.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      "."
    );

    return `R$ ${parteInteiraFormatada},${parteDecimal}`;
  }

  function precoFormatadoParaFloat(valor) {
    if (!valor) return 0;
    const numeros = valor.replace(/[^\d,]/g, "");
    const numPonto = numeros.replace(",", ".");

    return parseFloat(numPonto) || 0;
  }

  const buscarEnderecoPorCEP = async (cep) => {
    try {
      const cepLimpo = cep.replace(/\D/g, "");
      if (cepLimpo.length !== 8) return;

      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (!data.erro) {
        const enderecoFormatado = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
        setMeuAnuncio((prev) => ({
          ...prev,
          localizacao: enderecoFormatado,
        }));
      } else {
        setMeuAnuncio((prev) => ({
          ...prev,
          localizacao: "CEP não encontrado",
        }));
      }
    } catch {
      setMeuAnuncio((prev) => ({
        ...prev,
        localizacao: "Erro ao buscar endereço",
      }));
    }
  };

  function formatarCepInput(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 8);
    if (numeros.length <= 5) return numeros;
    return `${numeros.slice(0, 5)}-${numeros.slice(5)}`;
  }

  return (
    <div className="container my-5 px-3 px-md-4">
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>

      <h2 className="mb-4">Marketplace de Pequenos Produtores</h2>
      <p className="text-muted mb-4">
        Cestas orgânicas, alimentos artesanais, e muito mais.
      </p>

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
                  type="text"
                  className="form-control"
                  placeholder="Preço (R$)"
                  value={meuAnuncio.preco}
                  onChange={handlePrecoChange}
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

            <div className="mb-3">
              <input
                type="tel"
                className="form-control"
                placeholder="Celular com DDD"
                value={meuAnuncio.celular}
                onChange={(e) =>
                  setMeuAnuncio({
                    ...meuAnuncio,
                    celular: formatarCelularInput(e.target.value),
                  })
                }
                maxLength={15}
                required
              />
            </div>

            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="CEP"
                value={meuAnuncio.cep}
                onChange={(e) =>
                  setMeuAnuncio({
                    ...meuAnuncio,
                    cep: formatarCepInput(e.target.value),
                  })
                }
                onBlur={() => buscarEnderecoPorCEP(meuAnuncio.cep)}
                maxLength={9}
                required
              />
            </div>

            <div className="mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Localização"
                value={meuAnuncio.localizacao}
                onChange={(e) =>
                  setMeuAnuncio({ ...meuAnuncio, localizacao: e.target.value })
                }
                readOnly
              />
            </div>

            <button className="btn btn-success" type="submit">
              Publicar Anúncio
            </button>
          </form>
        </div>
      </div>

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
                    {a.preco.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  <p className="text-secondary" style={{ fontSize: "0.8rem" }}>
                    Por: {a.nomeUsuario}
                    <br />
                    <small>Contato: {formatarCelular(a.celular)}</small> <br />
                    <small>Cep: {a.cep || "—"}</small> <br />
                    <small>Local: {a.localizacao || "—"}</small> <br />
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
