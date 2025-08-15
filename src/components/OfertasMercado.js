import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { db } from "../firebase";
import { Button, Offcanvas } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { ref, onValue, push, remove, update, set as firebaseSet, get, set } from "firebase/database";
import { ToastContainer, toast } from "react-toastify";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";

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

const FONTES = {
  OpenFoodFacts: "off",
  DummyJSON: "dummy",
  "Mercado Libre": "meli",
};

const PAGE_SIZE = 12;
const MAX_CARTS = 100;
const TOAST_ID = "ofertas";

export default function OfertasMercado({ mercado, user, onVoltar, setUltimaVisita }) {
  const [ofertas, setOfertas] = useState([]);
  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [fonte, setFonte] = useState("OpenFoodFacts");
  const [q, setQ] = useState("");
  const [ordem, setOrdem] = useState("relevancia");
  const [produtos, setProdutos] = useState([]);
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [produtosError, setProdutosError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [carrinho, setCarrinho] = useState([]);
  const [qtyByKey, setQtyByKey] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [salvos, setSalvos] = useState({});
  const [showSaved, setShowSaved] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const inputRef = useRef(null);
  const sugRef = useRef(null);
  const cacheRef = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    const ofertasRef = ref(db, `mercados/${mercado.id}/ofertas`);
    const unsubscribe = onValue(ofertasRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, o]) => ({ id, ...o }));
      setOfertas(arr);
    });
    return () => unsubscribe();
  }, [mercado.id]);

  useEffect(() => {
    if (!user || !mercado?.id) return;
    const visitaRef = ref(db, `usuarios/${user.uid}/visitados/${mercado.id}`);
    get(visitaRef).then((snap) => {
      if (!snap.exists()) {
        const visitaObj = {
          nome: mercado.nome,
          rua: mercado.rua || "",
          estado: mercado.estado || "",
          pais: mercado.pais || "",
          timestamp: Date.now(),
        };
        firebaseSet(visitaRef, visitaObj).then(() => {
          if (typeof setUltimaVisita === "function") setUltimaVisita(mercado.id.toString());
        }).catch(() => { });
      }
    });
  }, [mercado.id, user, setUltimaVisita]);

  useEffect(() => {
    if (!user) return;
    const savedRef = ref(db, `usuarios/${user.uid}/salvosProdutos`);
    const off = onValue(savedRef, (snap) => {
      setSalvos(snap.val() || {});
    });
    return () => off();
  }, [user]);

  const normalize = (text) => (text || "").toString().trim();

  const fetchOFF = useCallback(async (categoriaSlug, pageNum, searchTerm) => {
    const params = new URLSearchParams();
    params.set("search_simple", "1");
    params.set("action", "process");
    if (searchTerm) {
      params.set("search_terms", searchTerm);
    } else {
      params.set("tagtype_0", "categories");
      params.set("tag_contains_0", "contains");
      params.set("tag_0", categoriaSlug);
    }
    params.set("page_size", PAGE_SIZE.toString());
    params.set("page", pageNum.toString());
    params.set("json", "1");
    const url = `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("OpenFoodFacts fora do ar");
    const data = await res.json();
    const products = (data.products || []).map((p) => ({
      source: "off",
      key: p.code || (crypto?.randomUUID?.() || `${Date.now()}_${Math.random()}`),
      name: p.product_name || p.generic_name || "Produto",
      image: p.image_front_url || p.image_url || "https://via.placeholder.com/300x200?text=Sem+Imagem",
      price: Number((Math.random() * 19 + 1).toFixed(2)),
    }));
    return { products, hasMore: products.length === PAGE_SIZE };
  }, []);

  const headerVariants = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.28, when: "beforeChildren", staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0 },
  };

  const enderecoFmt = [mercado.rua, mercado.estado, mercado.pais].filter(Boolean).join(", ");

  const fetchDummy = useCallback(async (pageNum, searchTerm) => {
    const skip = (pageNum - 1) * PAGE_SIZE;
    const base = "https://dummyjson.com";
    const url = normalize(searchTerm)
      ? `${base}/products/search?q=${encodeURIComponent(searchTerm)}&limit=${PAGE_SIZE}&skip=${skip}`
      : `${base}/products?limit=${PAGE_SIZE}&skip=${skip}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("DummyJSON fora do ar");
    const data = await res.json();
    const list = data.products || [];
    const mapped = list.map((p) => ({
      source: "dummy",
      key: `dummy-${p.id}`,
      name: p.title,
      image: (p.images && p.images[0]) || p.thumbnail || "https://via.placeholder.com/300x200?text=Sem+Imagem",
      price: Number((p.price || Math.random() * 20 + 1).toFixed(2)),
    }));
    return { products: mapped, hasMore: (data.total || 0) > skip + (data.limit || mapped.length) };
  }, []);

  const fetchMeli = useCallback(async (pageNum, searchTerm, categoriaSlug) => {
    const qterm = normalize(searchTerm) || categoriaSlug || "mercado";
    const offset = (pageNum - 1) * PAGE_SIZE;
    const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(qterm)}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Mercado Libre indisponível");
    const data = await res.json();
    const mapped = (data.results || []).map((p) => ({
      source: "meli",
      key: `meli-${p.id}`,
      name: p.title,
      image: (p.thumbnail_id ? `https://http2.mlstatic.com/D_${p.thumbnail_id}-O.jpg` : p.thumbnail) || "https://via.placeholder.com/300x200?text=Sem+Imagem",
      price: Number((p.price || Math.random() * 20 + 1).toFixed(2)),
    }));
    return { products: mapped, hasMore: (data.paging?.offset || 0) + mapped.length < (data.paging?.total || 0) };
  }, []);

  const doFetchProdutos = useCallback(async (fonteKey, categoriaSlug, pageNum, searchTerm) => {
    const cacheKey = JSON.stringify({ fonteKey, categoriaSlug, pageNum, searchTerm: normalize(searchTerm) });
    if (cacheRef.current[cacheKey]) return cacheRef.current[cacheKey];
    let result;
    if (FONTES[fonteKey] === "off") result = await fetchOFF(categoriaSlug, pageNum, searchTerm);
    else if (FONTES[fonteKey] === "dummy") result = await fetchDummy(pageNum, searchTerm);
    else result = await fetchMeli(pageNum, searchTerm, categoriaSlug);
    cacheRef.current[cacheKey] = result;
    return result;
  }, [fetchOFF, fetchDummy, fetchMeli]);

  useEffect(() => {
    setProdutos([]);
    setPage(1);
    setHasMore(false);
    setProdutosError("");
  }, [fonte, categoria]);

  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      setProdutosLoading(true);
      setProdutosError("");
      try {
        const slug = CATEGORIAS[categoria];
        const { products, hasMore: more } = await doFetchProdutos(fonte, slug, page, q);
        if (cancelled) return;
        setHasMore(more);
        if (page === 1) {
          setProdutos(products);
        } else {
          setProdutos((prev) => {
            const seen = new Set(prev.map((p) => p.key));
            const merged = [...prev];
            products.forEach((p) => {
              if (!seen.has(p.key)) merged.push(p);
            });
            return merged;
          });
        }
      } catch {
        if (!cancelled) setProdutosError("Não foi possível carregar produtos agora.");
      } finally {
        if (!cancelled) setProdutosLoading(false);
      }
    }
    carregar();
    return () => {
      cancelled = true;
    };
  }, [fonte, categoria, page, q, doFetchProdutos]);

  useEffect(() => {
    const h = setTimeout(async () => {
      const term = normalize(q);
      if (term.length < 2) {
        setSuggestions([]);
        setShowSug(false);
        return;
      }
      try {
        const slug = CATEGORIAS[categoria];
        const { products } = await doFetchProdutos(fonte, slug, 1, term);
        const seen = new Set();
        const items = [];
        for (const p of products) {
          const n = normalize(p.name);
          if (n && !seen.has(n)) {
            seen.add(n);
            items.push({ name: n, image: p.image, price: p.price });
          }
          if (items.length >= 8) break;
        }
        setSuggestions(items);
        setShowSug(true);
      } catch {
        setSuggestions([]);
        setShowSug(false);
      }
    }, 220);
    return () => clearTimeout(h);
  }, [q, fonte, categoria, doFetchProdutos]);

  useEffect(() => {
    function onDocClick(e) {
      if (!sugRef.current || !inputRef.current) return;
      const inside = sugRef.current.contains(e.target) || inputRef.current.contains(e.target);
      if (!inside) setShowSug(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const addQty = (key, delta) => {
    setQtyByKey((prev) => {
      const next = Math.max(1, (prev[key] || 1) + delta);
      return { ...prev, [key]: next };
    });
  };

  const setQty = (key, val) => {
    const n = Math.max(1, parseInt(val || 1));
    setQtyByKey((prev) => ({ ...prev, [key]: n }));
  };

  const adicionar = (produto) => {
    const qtd = qtyByKey[produto.key] || 1;
    const existente = carrinho.find((p) => p.key === produto.key);
    if (existente) {
      setCarrinho((c) => c.map((p) => (p.key === produto.key ? { ...p, quantidade: p.quantidade + qtd } : p)));
    } else {
      setCarrinho((c) => [...c, { ...produto, quantidade: qtd }]);
    }
    toast.success("Adicionado ao carrinho", { containerId: TOAST_ID });
  };

  const removerItem = (key) => setCarrinho((prev) => prev.filter((item) => item.key !== key));
  const alterarQtdCarrinho = (key, delta) => setCarrinho((c) => c.map((p) => (p.key === key ? { ...p, quantidade: Math.max(1, (p.quantidade || 1) + delta) } : p)));
  const editarQuantidadeDireto = (key, val) => {
    const n = Math.max(1, parseInt(val || 1));
    setCarrinho((c) => c.map((p) => (p.key === key ? { ...p, quantidade: n } : p)));
  };

  const toggleSalvar = async (prod) => {
    if (!user) {
      toast.info("Faça login para salvar produtos", { containerId: TOAST_ID });
      return;
    }
    const path = ref(db, `usuarios/${user.uid}/salvosProdutos/${prod.key}`);
    if (salvos && salvos[prod.key]) {
      await remove(path);
      toast.info("Removido dos salvos", { containerId: TOAST_ID });
    } else {
      await set(path, {
        name: prod.name,
        image: prod.image,
        price: prod.price,
        source: prod.source,
        savedAt: Date.now(),
      });
      toast.success("Salvo para depois", { containerId: TOAST_ID });
    }
  };

  const setPriceAlert = async (prod) => {
    if (!user) {
      toast.info("Faça login para criar alerta", { containerId: TOAST_ID });
      return;
    }
    const { value: v } = await Swal.fire({
      title: `Alerta de preço para "${prod.name}"`,
      input: "number",
      inputLabel: "Avise-me quando o preço ficar abaixo de:",
      inputAttributes: { min: 0, step: "0.01" },
      inputValue: prod.price.toFixed(2),
      showCancelButton: true,
      confirmButtonText: "Salvar alerta",
      cancelButtonText: "Cancelar",
    });
    if (v === undefined) return;
    const threshold = Number(v);
    if (!(threshold >= 0)) return;
    const path = ref(db, `usuarios/${user.uid}/priceAlerts/${prod.key}`);
    await set(path, {
      name: prod.name,
      image: prod.image,
      currentPrice: prod.price,
      threshold,
      createdAt: Date.now(),
    });
    toast.success("Alerta de preço criado", { containerId: TOAST_ID });
  };

  const salvarCarrinho = async () => {
    setSaveError("");
    setSucesso("");

    if (!user) {
      setSaveError("Você precisa estar logado para salvar.");
      return;
    }
    if (carrinho.length === 0) {
      setSaveError("Carrinho vazio.");
      return;
    }

    setSalvando(true);
    try {
      const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
      const snap = await get(cartsRef);
      const existing = snap.val() || {};
      if (Object.keys(existing).length >= MAX_CARTS) {
        setSaveError(`Você já tem ${MAX_CARTS} carrinhos. Exclua um antes.`);
        return;
      }

      const newRef = push(cartsRef);
      await firebaseSet(newRef, {
        items: carrinho,
        criadoEm: Date.now(),
        mercadoId: mercado.id,
        mercadoNome: mercado.nome || "",
        mercadoRua: mercado.rua || "",
        mercadoEstado: mercado.estado || "",
        mercadoPais: mercado.pais || "",
      });

      setSucesso("Carrinho salvo com sucesso!");
      setCarrinho([]);

      const res = await Swal.fire({
        title: "Carrinho salvo!",
        text: "Deseja ir para o carrinho agora?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Ir para o carrinho",
        cancelButtonText: "Ficar aqui",
      });
      if (res.isConfirmed) navigate("/carrinho");
    } catch {
      setSaveError("Erro ao salvar o carrinho.");
    } finally {
      setSalvando(false);
    }
  };

  const fmt = (n) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;
  const total = useMemo(() => carrinho.reduce((s, it) => s + Number(it.price) * (it.quantidade || 1), 0), [carrinho]);

  const ordenar = (arr) => {
    if (ordem === "preco-asc") return [...arr].sort((a, b) => a.price - b.price);
    if (ordem === "preco-desc") return [...arr].sort((a, b) => b.price - a.price);
    return arr;
  };

  const savedList = useMemo(() => {
    return Object.entries(salvos || {})
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }, [salvos]);

  const LoadingGrid = ({ count = 12 }) => (
    <div className="row g-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-6 col-md-4 col-lg-4">
          <div className="card h-100 border-0 shadow-sm">
            <div className="ratio ratio-16x9 bg-light">
              <div className="placeholder w-100 h-100" />
            </div>
            <div className="card-body">
              <p className="placeholder-glow mb-2">
                <span className="placeholder col-8 me-2"></span>
                <span className="placeholder col-5"></span>
              </p>
              <div className="d-flex gap-2">
                <span className="placeholder col-4 btn disabled mb-0"></span>
                <span className="placeholder col-5 btn disabled mb-0"></span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const CartContent = () => (
    <div className="bg-white border rounded-4 shadow-sm p-3 p-md-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between">
        <h6 className="mb-2 mb-md-0">Carrinho ({carrinho.length} item{carrinho.length === 1 ? "" : "s"})</h6>
        <div className="fw-semibold">Total: {fmt(total)}</div>
      </div>

      {carrinho.length === 0 ? (
        <div className="alert alert-info mt-3 mb-2">Seu carrinho está vazio.</div>
      ) : (
        <div className="table-responsive mt-3">
          <table className="table align-middle mb-2">
            <thead className="table-light">
              <tr>
                <th>Produto</th>
                <th className="text-center" style={{ width: 160 }}>Qtd</th>
                <th className="text-end" style={{ width: 120 }}>Preço</th>
                <th className="text-end" style={{ width: 140 }}>Subtotal</th>
                <th style={{ width: 60 }} />
              </tr>
            </thead>
            <tbody>
              {carrinho.map((item) => (
                <tr key={item.key}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <img src={item.image} alt="" width={36} height={36} style={{ objectFit: "cover", borderRadius: 8 }} />
                      <div className="fw-semibold text-truncate" style={{ lineHeight: 1.2, maxWidth: 180 }}>{item.name}</div>
                    </div>
                  </td>
                  <td className="text-center">
                    <div className="btn-group" role="group">
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => alterarQtdCarrinho(item.key, -1)}>-</button>
                      <input
                        className="form-control form-control-sm text-center"
                        style={{ width: 56 }}
                        value={item.quantidade}
                        onChange={(e) => editarQuantidadeDireto(item.key, e.target.value)}
                        inputMode="numeric"
                      />
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => alterarQtdCarrinho(item.key, 1)}>+</button>
                    </div>
                  </td>
                  <td className="text-end">{fmt(item.price)}</td>
                  <td className="text-end">{fmt(item.price * item.quantidade)}</td>
                  <td className="text-end">
                    <button className="btn btn-outline-danger btn-sm" onClick={() => removerItem(item.key)}>
                      <i className="bi bi-trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-2">
        <div>
          {saveError && <div className="text-danger">{saveError}</div>}
          {sucesso && <div className="text-success">{sucesso}</div>}
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => setCarrinho([])} disabled={carrinho.length === 0}>Esvaziar</button>
          <button className="btn btn-primary" onClick={salvarCarrinho} disabled={salvando || carrinho.length === 0}>{salvando ? "Salvando…" : "Salvar Carrinho"}</button>
        </div>
      </div>
    </div>
  );

  const clearQ = () => {
    setQ("");
    setShowSug(false);
    setPage(1);
    inputRef.current?.focus();
  };

  const onSuggestionClick = (s) => {
    setQ(s.name);
    setShowSug(false);
    setPage(1);
  };

  return (
    <div className="container my-4" style={{ zIndex: 2, paddingTop: "80px", maxWidth: 1180 }}>
      <button className="btn btn-outline-secondary mb-3" onClick={onVoltar || (() => navigate(-1))}>&larr; Voltar</button>
      <ToastContainer position="top-right" pauseOnHover containerId={TOAST_ID} />

      <motion.div
        key={mercado.id || mercado.nome}
        className="d-flex align-items-center justify-content-between mb-3"
        variants={headerVariants}
        initial="hidden"
        animate="show"
        layout
      >
        <div className="text-dark">
          <motion.h4 className="mb-0" variants={itemVariants}>
            Ofertas em <span className="text-primary">{mercado.nome}</span>
          </motion.h4>
          <motion.div
            className="bg-primary rounded-pill"
            style={{ height: 2, width: 120 }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          />
          <motion.small className="text-muted d-flex align-items-center mt-1" variants={itemVariants}>
            <i className="bi bi-geo-alt-fill me-1" />
            {enderecoFmt}
          </motion.small>
        </div>
        <motion.div style={{ width: 140 }} variants={itemVariants} />
      </motion.div>

      {produtosLoading && page === 1 ? (
        <LoadingGrid count={PAGE_SIZE} />
      ) : (
        <>
          <div className="row g-4">
            <div className="col-12 col-lg-9">
              <div className="bg-white border rounded-4 shadow-sm p-3 p-md-4 mb-3">
                <div className="row g-3 align-items-end">
                  <div className="col-12 col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-grid-3x3-gap-fill me-1" /> Categoria
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-tags" />
                      </span>
                      <select
                        className="form-select"
                        value={categoria}
                        onChange={(e) => {
                          setCategoria(e.target.value);
                          setPage(1);
                        }}
                        aria-label="Selecionar categoria"
                      >
                        {Object.keys(CATEGORIAS).map((cat) => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-12 col-md-5 position-relative">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-search me-1" /> Buscar
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-search" />
                      </span>
                      <input
                        ref={inputRef}
                        className="form-control"
                        placeholder="produto, marca..."
                        value={q}
                        onChange={(e) => {
                          setQ(e.target.value);
                          setPage(1);
                        }}
                        onFocus={() => suggestions.length && setShowSug(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") setShowSug(false);
                          if (e.key === "Enter" && suggestions[0]) onSuggestionClick(suggestions[0]);
                        }}
                        aria-autocomplete="list"
                        aria-expanded={showSug}
                        aria-controls="sug-list"
                      />
                      {q && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={clearQ}
                          aria-label="Limpar busca"
                          title="Limpar"
                        >
                          <i className="bi bi-x-circle" />
                        </button>
                      )}
                    </div>
                    {showSug && suggestions.length > 0 && (
                      <div
                        ref={sugRef}
                        id="sug-list"
                        className="position-absolute start-0 end-0 bg-white rounded-3 shadow-sm mt-1"
                        style={{ zIndex: 10, maxHeight: 260, overflowY: "auto" }}
                        role="listbox"
                      >
                        <div className="small text-muted px-3 pt-2 pb-1 d-flex align-items-center gap-2">
                          <i className="bi bi-lightning-charge" /> Sugestões
                        </div>
                        <div className="list-group list-group-flush">
                          {suggestions.map((s, i) => (
                            <button
                              key={`${s.name}-${i}`}
                              type="button"
                              className="list-group-item list-group-item-action d-flex align-items-center gap-2"
                              onClick={() => onSuggestionClick(s)}
                              role="option"
                            >
                              <img
                                src={s.image}
                                alt=""
                                width={34}
                                height={34}
                                className="rounded"
                                style={{ objectFit: "cover" }}
                              />
                              <span className="flex-grow-1 text-truncate">{s.name}</span>
                              <span className="badge text-bg-light">{fmt(s.price)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="col-12 col-md-3">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-sliders me-1" /> Ordenar
                    </label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-sort-down" />
                      </span>
                      <select
                        className="form-select"
                        value={ordem}
                        onChange={(e) => setOrdem(e.target.value)}
                        aria-label="Ordenar resultados"
                      >
                        <option value="relevancia">Relevância</option>
                        <option value="preco-asc">Preço: menor</option>
                        <option value="preco-desc">Preço: maior</option>
                      </select>
                    </div>
                  </div>
                </div>


                <div className="mt-3">
                  <button className="btn btn-outline-primary btn-sm" onClick={() => setShowSaved((v) => !v)}>
                    <i className="bi bi-heart me-1" />
                    Salvos ({savedList.length})
                  </button>
                  {showSaved && (
                    <div className="mt-3 p-2 border rounded-3 bg-light">
                      {savedList.length === 0 ? (
                        <div className="text-muted">Nenhum produto salvo.</div>
                      ) : (
                        <div className="row g-2">
                          {savedList.map((p) => (
                            <div key={p.key} className="col-12 col-md-6 col-lg-4">
                              <div className="d-flex align-items-center p-2 bg-white border rounded-3 shadow-sm gap-2">
                                <img src={p.image} alt="" width={44} height={44} style={{ objectFit: "cover", borderRadius: 8 }} />
                                <div className="flex-grow-1">
                                  <div className="text-truncate">{p.name}</div>
                                  <small className="text-muted">{fmt(p.price)}</small>
                                </div>
                                <div className="d-flex gap-1">
                                  <button className="btn btn-outline-success btn-sm" onClick={() => adicionar({ ...p, source: p.source })}>
                                    <i className="bi bi-bag-plus" />
                                  </button>
                                  <button className="btn btn-outline-danger btn-sm" onClick={() => toggleSalvar(p)}>
                                    <i className="bi bi-trash" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {produtosError && <div className="alert alert-danger">{produtosError}</div>}

              <div className="row g-3">
                {ordenar(produtos).map((p) => {
                  const isSaved = !!(salvos && salvos[p.key]);
                  return (
                    <div key={p.key} className="col-6 col-md-4 col-lg-4">
                      <div className="card h-100 border-0 shadow-sm">
                        <div className="position-relative">
                          <img src={p.image} alt={p.name} className="card-img-top" style={{ objectFit: "cover", height: 160 }} loading="lazy" />
                          <span className="badge bg-success position-absolute" style={{ top: 10, right: 10 }}>{fmt(p.price)}</span>
                          <button
                            className={`btn btn-sm position-absolute ${isSaved ? "btn-danger" : "btn-outline-danger"}`}
                            style={{ top: 10, left: 10, borderRadius: 999 }}
                            onClick={() => toggleSalvar(p)}
                            title={isSaved ? "Remover dos salvos" : "Salvar para depois"}
                          >
                            <i className={isSaved ? "bi bi-heart-fill" : "bi bi-heart"} />
                          </button>
                        </div>
                        <div className="card-body d-flex flex-column">
                          <div className="mb-2" style={{ minHeight: 46 }}>
                            <div className="fw-semibold" style={{ lineHeight: 1.2 }}>{p.name}</div>
                          </div>
                          <div className="row g-2 mt-auto align-items-stretch">
                            <div className="col-12 col-sm-auto">
                              <div className="btn-group w-100" role="group" aria-label="Quantidade">
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => addQty(p.key, -1)}>-</button>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  className="form-control form-control-sm text-center"
                                  style={{ width: 56 }}
                                  value={qtyByKey[p.key] || 1}
                                  onChange={(e) => setQty(p.key, e.target.value)}
                                  inputMode="numeric"
                                  aria-label="Quantidade"
                                />
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => addQty(p.key, 1)}>+</button>
                              </div>
                            </div>
                            <div className="col-12 col-sm d-flex gap-2 justify-content-sm-end">
                              <button className="btn btn-outline-secondary btn-sm flex-grow-1" onClick={() => setPriceAlert(p)} title="Criar alerta de preço" aria-label="Criar alerta de preço">
                                <i className="bi bi-bell" />
                                <span className="d-none d-sm-inline ms-1">Alerta</span>
                              </button>
                              <button className="btn btn-primary btn-sm flex-grow-1" onClick={() => adicionar(p)} aria-label="Adicionar ao carrinho">
                                <i className="bi bi-bag-plus" />
                                <span className="d-none d-sm-inline ms-1">Adicionar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="text-center my-3">
                  <button className="btn btn-outline-secondary" onClick={() => setPage((p) => p + 1)} disabled={produtosLoading}>
                    {produtosLoading ? "Carregando..." : "Carregar mais"}
                  </button>
                </div>
              )}
            </div>

            <div className="col-12 col-lg-3 d-none d-lg-block">
              <div className="position-sticky" style={{ top: 90 }}>
                <CartContent />
              </div>
            </div>
          </div>
        </>
      )}

      {carrinho.length > 0 && (
        <>
          <button
            type="button"
            className="btn btn-primary d-lg-none"
            onClick={() => setCartOpen(true)}
            style={{ position: "fixed", right: 6, bottom: 10, zIndex: 1030, borderRadius: 10, boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}
            aria-label="Abrir carrinho"
          >
            <div className="d-flex flex-column align-items-center">
              <i className="bi bi-bag-plus fs-5" />
              <small>{carrinho.length} | {fmt(total)}</small>
              Ver carrinho
            </div>
          </button>
        </>
      )}

      <Offcanvas placement="end" show={cartOpen} onHide={() => setCartOpen(false)} className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Carrinho</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <CartContent />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
