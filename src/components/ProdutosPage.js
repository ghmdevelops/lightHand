import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { ref, get, push, set } from "firebase/database";

const CATEGORIAS = {
  Bebidas: "beverages",
  Padaria: "breads",
  Laticínios: "dairies",
  "Frios / Embutidos": "cold-cuts",
  Cereais: "cereals",
  Snacks: "snacks",
  Limpeza: "cleaning products",
  "Frutas212 & Verduras": "fruits and vegetables",
};

export default function ProdutosMercadoPage({ onVoltar }) {
  const user = auth.currentUser;
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [page, setPage] = useState(1);
  const [totalResultados, setTotalResultados] = useState(0);

  const PAGE_SIZE = 12;
  const MAX_CARTS = 100;

  async function fetchProdutos(pg = 1, append = false) {
    const slug = CATEGORIAS[categoria];
    const url =
      `https://world.openfoodfacts.org/cgi/search.pl?` +
      `search_simple=1&action=process&tagtype_0=categories&tag_contains_0=contains` +
      `&tag_0=${encodeURIComponent(slug)}` +
      `&page_size=${PAGE_SIZE}&page=${pg}&json=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const novos = (data.products || []).map((p) => ({
      key: p.code || String(p.id) || `${pg}-${Math.random()}`,
      name: p.product_name || p.generic_name || "Sem nome",
      image: p.image_front_url || "https://via.placeholder.com/120",
      price: (Math.random() * 19 + 1).toFixed(2),
    }));
    setTotalResultados(Number(data.count || 0));
    if (append) {
      setProdutos((prev) => {
        const map = new Map(prev.map((x) => [x.key, x]));
        novos.forEach((n) => {
          if (!map.has(n.key)) map.set(n.key, n);
        });
        return Array.from(map.values());
      });
    } else {
      setProdutos(novos);
    }
  }

  useEffect(() => {
    async function buscar() {
      setErro("");
      setLoading(true);
      setPage(1);
      setTotalResultados(0);
      try {
        await fetchProdutos(1, false);
      } catch {
        setErro("Não foi possível carregar produtos dessa categoria.");
        setProdutos([]);
      }
      setLoading(false);
    }
    buscar();
  }, [categoria]);

  const adicionar = (p) => setCarrinho((c) => [...c, p]);
  const removerItem = (i) => setCarrinho((c) => c.filter((_, idx) => idx !== i));

  const handleSaveCart = async () => {
    setSaveError("");
    setSucesso("");
    if (!user) {
      setSaveError("Você precisa estar logado para salvar.");
      return;
    }
    setSalvando(true);
    try {
      const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
      const snap = await get(cartsRef);
      const existing = snap.val() || {};
      if (Object.keys(existing).length >= MAX_CARTS) {
        setSaveError(`Você já tem ${MAX_CARTS} carrinhos. Exclua um antes.`);
        setSalvando(false);
        return;
      }
      const newRef = push(cartsRef);
      await set(newRef, { items: carrinho, criadoEm: Date.now() });
      setSucesso(`Carrinho salvo com sucesso, ${user.displayName || user.email}!`);
      setTimeout(() => setSucesso(""), 3000);
    } catch {
      setSaveError("Erro ao salvar seu carrinho.");
    }
    setSalvando(false);
  };

  const total = carrinho.reduce((sum, it) => sum + Number(it.price), 0);
  const hasMore = produtos.length < totalResultados;

  async function carregarMais() {
    if (!hasMore || loadingMore) return;
    const prox = page + 1;
    setLoadingMore(true);
    try {
      await fetchProdutos(prox, true);
      setPage(prox);
    } catch {
      setErro("Não foi possível carregar mais produtos.");
    }
    setLoadingMore(false);
  }

  return (
    <div className="container my-4">
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>
      <h3 className="mb-4">Produtos de Mercado</h3>

      <div className="mb-4">
        <label className="form-label fw-bold me-2">Categoria:</label>
        <select
          className="form-select w-auto d-inline"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          {Object.keys(CATEGORIAS).map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-success" style={{ width: 48, height: 48 }} />
          <p className="mt-2">Carregando produtos…</p>
        </div>
      ) : erro ? (
        <div className="alert alert-danger">{erro}</div>
      ) : (
        <>
          <div className="row">
            {produtos.length > 0 ? (
              produtos.map((p) => (
                <div key={p.key} className="col-12 col-sm-6 col-md-4 mb-3">
                  <div className="card h-100 shadow-sm">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="card-img-top"
                      style={{ objectFit: "cover", height: 140 }}
                    />
                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title flex-grow-1">{p.name}</h6>
                      <p className="text-success fw-bold mb-2">
                        R$ {Number(p.price).toFixed(2).replace(".", ",")}
                      </p>
                      <button className="btn btn-success btn-sm mt-2" onClick={() => adicionar(p)}>
                        Adicionar ao carrinho
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-12">
                <div className="alert alert-warning">Nenhum produto nessa categoria.</div>
              </div>
            )}
          </div>

          {hasMore && produtos.length > 0 && (
            <div className="text-center mt-2">
              <button
                className="btn btn-outline-secondary"
                onClick={carregarMais}
                disabled={loadingMore}
              >
                {loadingMore ? "Carregando..." : "Ver mais"}
              </button>
              <div className="text-muted mt-1" style={{ fontSize: ".9rem" }}>
                {produtos.length} de {totalResultados}
              </div>
            </div>
          )}
        </>
      )}

      <hr />
      <h5>
        Carrinho ({carrinho.length} {carrinho.length !== 1 ? "itens" : "item"}) — Total: R$ {total
          .toFixed(2)
          .replace(".", ",")}
      </h5>
      {carrinho.length === 0 ? (
        <div className="alert alert-info">Seu carrinho está vazio.</div>
      ) : (
        <ul className="list-group mb-3">
          {carrinho.map((item, i) => (
            <li key={i} className="list-group-item d-flex justify-content-between align-items-center">
              {item.name} — R$ {Number(item.price).toFixed(2).replace(".", ",")}
              <button className="btn btn-outline-danger btn-sm" onClick={() => removerItem(i)}>
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      <button className="btn btn-primary" onClick={handleSaveCart} disabled={salvando || carrinho.length === 0}>
        {salvando ? "Salvando…" : "Salvar Carrinho"}
      </button>
      {saveError && <div className="text-danger mt-2">{saveError}</div>}
      {sucesso && <div className="alert alert-success mt-2">{sucesso}</div>}
    </div>
  );
}
