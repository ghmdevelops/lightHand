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
  "Frutas & Verduras": "fruits and vegetables",
};

export default function ProdutosMercadoPage({ onVoltar }) {
  const user = auth.currentUser;
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sucesso, setSucesso] = useState("");

  // Busca produtos ao mudar categoria
  useEffect(() => {
    async function buscar() {
      setErro("");
      setLoading(true);
      try {
        const slug = CATEGORIAS[categoria];
        const url =
          `https://world.openfoodfacts.org/cgi/search.pl?` +
          `search_simple=1&action=process&tagtype_0=categories&tag_contains_0=contains` +
          `&tag_0=${encodeURIComponent(slug)}` +
          `&page_size=3&json=1`;
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setProdutos(
          (data.products || []).map((p) => ({
            key: p.code,
            name: p.product_name || p.generic_name || "Sem nome",
            image: p.image_front_url || "https://via.placeholder.com/120",
            price: (Math.random() * 19 + 1).toFixed(2),
          }))
        );
      } catch {
        setErro("Não foi possível carregar produtos dessa categoria.");
        setProdutos([]);
      }
      setLoading(false);
    }
    buscar();
  }, [categoria]);

  // Adicionar e remover itens
  const adicionar = (p) => setCarrinho((c) => [...c, p]);
  const removerItem = (i) =>
    setCarrinho((c) => c.filter((_, idx) => idx !== i));

  // Salvar carrinho (máx 3)
  const handleSaveCart = async () => {
    setSaveError("");
    setSucesso("");
    if (!user) {
      setSaveError("Você precisa estar logado para salvar.");
      return;
    }
    setSalvando(true);
    const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
    const snap = await get(cartsRef);
    const existing = snap.val() || {};
    if (Object.keys(existing).length >= 3) {
      setSaveError("Você já tem 3 carrinhos. Exclua um antes.");
      setSalvando(false);
      return;
    }
    const newRef = push(cartsRef);
    await set(newRef, { items: carrinho, criadoEm: Date.now() });
    setSalvando(false);
    setSucesso(
      `Carrinho salvo com sucesso, ${user.displayName || user.email}!`
    );
    setTimeout(() => setSucesso(""), 3000);
  };

  // Cálculo do total
  const total = carrinho.reduce((sum, it) => sum + Number(it.price), 0);

  return (
    <div className="container my-4">
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>
      <h3 className="mb-4">Produtos de Mercado</h3>

      {/* Categoria */}
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

      {/* Lista de Produtos */}
      {loading ? (
        <div className="text-center my-4">
          <div
            className="spinner-border text-success"
            style={{ width: 48, height: 48 }}
          />
          <p className="mt-2">Carregando produtos…</p>
        </div>
      ) : erro ? (
        <div className="alert alert-danger">{erro}</div>
      ) : (
        <div className="row">
          {produtos.length > 0 ? (
            produtos.map((p) => (
              <div key={p.key} className="col-md-4 mb-3">
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
                    <button
                      className="btn btn-success btn-sm mt-2"
                      onClick={() => adicionar(p)}
                    >
                      Adicionar ao carrinho
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-12">
              <div className="alert alert-warning">
                Nenhum produto nessa categoria.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Carrinho e Total */}
      <hr />
      <h5>
        Carrinho ({carrinho.length} {carrinho.length !== 1 ? "itens" : "item"})
        — Total: R$ {total.toFixed(2).replace(".", ",")}
      </h5>
      {carrinho.length === 0 ? (
        <div className="alert alert-info">Seu carrinho está vazio.</div>
      ) : (
        <ul className="list-group mb-3">
          {carrinho.map((item, i) => (
            <li
              key={i}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              {item.name} — R$ {Number(item.price).toFixed(2).replace(".", ",")}
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => removerItem(i)}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Botão Salvar e Mensagens */}
      <button
        className="btn btn-primary"
        onClick={handleSaveCart}
        disabled={salvando || carrinho.length === 0}
      >
        {salvando ? "Salvando…" : "Salvar Carrinho"}
      </button>
      {saveError && <div className="text-danger mt-2">{saveError}</div>}
      {sucesso && <div className="alert alert-success mt-2">{sucesso}</div>}
    </div>
  );
}
