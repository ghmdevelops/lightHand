import React, { useEffect, useState, useRef, useCallback } from "react";
import { db } from "../firebase";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  set as firebaseSet,
  get,
} from "firebase/database";
import { ToastContainer, toast } from "react-toastify";
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

export default function OfertasMercado({
  mercado,
  user,
  onVoltar,
  setUltimaVisita,
}) {
  const [ofertas, setOfertas] = useState([]);
  const [novo, setNovo] = useState({ valor: "", objeto: "" });
  const [editando, setEditando] = useState(null);
  const [editInput, setEditInput] = useState({ valor: "", objeto: "" });

  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [erro, setErro] = useState("");
  const [produtosLoading, setProdutosLoading] = useState(false);
  const [produtosError, setProdutosError] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  const cacheRef = useRef({}); // cache por categoria+page

  // Ofertas do mercado
  useEffect(() => {
    const ofertasRef = ref(db, `mercados/${mercado.id}/ofertas`);
    const unsubscribe = onValue(ofertasRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, o]) => ({ id, ...o }));
      setOfertas(arr);
    });
    return () => unsubscribe();
  }, [mercado.id]);

  // Registrar visita única
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
        firebaseSet(visitaRef, visitaObj)
          .then(() => {
            if (typeof setUltimaVisita === "function") {
              setUltimaVisita(mercado.id.toString());
            }
          })
          .catch(console.error);
      }
    });
  }, [mercado.id, user, setUltimaVisita]);

  // Busca de produtos no OpenFoodFacts com paginação
  const fetchProdutos = useCallback(
    async (categoriaSlug, pageNum) => {
      const cacheKey = `${categoriaSlug}::${pageNum}`;
      if (cacheRef.current[cacheKey]) {
        return cacheRef.current[cacheKey];
      }
      const pageSize = 10;
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(
        categoriaSlug
      )}&page_size=${pageSize}&page=${pageNum}&json=1`;
      const controller = new AbortController();
      const signal = controller.signal;
      try {
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error("Erro na API OpenFoodFacts");
        const data = await res.json();
        const products = (data.products || []).map((p) => ({
          key: p.code,
          name: p.product_name || p.generic_name || "Sem nome",
          image: p.image_front_url || "https://via.placeholder.com/120",
          price: (Math.random() * 19 + 1).toFixed(2), // placeholder de preço
        }));
        const result = {
          products,
          hasMore: products.length === pageSize,
        };
        cacheRef.current[cacheKey] = result;
        return result;
      } catch (err) {
        console.warn("Erro carregando produtos:", err);
        throw err;
      }
    },
    []
  );

  // Efeito para categoria / página
  useEffect(() => {
    let cancelled = false;
    async function carregar() {
      setProdutosError("");
      setErro("");
      setProdutosLoading(true);
      try {
        const slug = CATEGORIAS[categoria];
        const { products, hasMore: more } = await fetchProdutos(slug, page);
        if (cancelled) return;
        setHasMore(more);
        if (page === 1) {
          setProdutos(products);
        } else {
          // evitar duplicatas
          setProdutos((prev) => {
            const existingKeys = new Set(prev.map((p) => p.key));
            const merged = [...prev];
            products.forEach((p) => {
              if (!existingKeys.has(p.key)) merged.push(p);
            });
            return merged;
          });
        }
      } catch (e) {
        if (!cancelled) {
          setProdutosError("Não foi possível carregar produtos dessa categoria.");
          setProdutos([]);
        }
      } finally {
        if (!cancelled) setProdutosLoading(false);
      }
    }
    carregar();
    return () => {
      cancelled = true;
    };
  }, [categoria, page, fetchProdutos]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!novo.valor.trim() || !novo.objeto.trim()) return;

    const mercadoRef = ref(db, `mercados/${mercado.id}`);
    const snapshot = await get(mercadoRef);
    if (!snapshot.exists()) {
      await firebaseSet(mercadoRef, {
        nome: mercado.nome,
        rua: mercado.rua || "",
        estado: mercado.estado || "",
        pais: mercado.pais || "",
      });
    }

    const ofertasRef = ref(db, `mercados/${mercado.id}/ofertas`);
    await push(ofertasRef, {
      usuario: user?.uid || "anon",
      valor: novo.valor.trim(),
      objeto: novo.objeto.trim(),
      criadoEm: Date.now(),
    });

    if (user) {
      await firebaseSet(
        ref(db, `usuarios/${user.uid}/mercadosAtivos/${mercado.id}`),
        {
          nome: mercado.nome,
          rua: mercado.rua || "",
          estado: mercado.estado || "",
          pais: mercado.pais || "",
          dataUltimaOferta: Date.now(),
          valorUltimaOferta: novo.valor.trim(),
          objetoUltimaOferta: novo.objeto.trim(),
        }
      );
    }

    setNovo({ valor: "", objeto: "" });
    toast.success("Oferta adicionada");
  };

  const adicionar = async (produto) => {
    const { value: qtdStr } = await Swal.fire({
      title: `Quantas unidades de "${produto.name}" deseja adicionar?`,
      input: "number",
      inputLabel: "Quantidade",
      inputValue: 1,
      inputAttributes: {
        min: 1,
        step: 1,
      },
      showCancelButton: true,
      confirmButtonText: "Adicionar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (!value || parseInt(value) <= 0) {
          return "Insira uma quantidade válida maior que 0";
        }
      },
    });

    const qtd = parseInt(qtdStr);
    if (!qtd || qtd <= 0) return;

    const existente = carrinho.find((p) => p.key === produto.key);
    if (existente) {
      setCarrinho((c) =>
        c.map((p) =>
          p.key === produto.key
            ? { ...p, quantidade: p.quantidade + qtd }
            : p
        )
      );
    } else {
      setCarrinho((c) => [...c, { ...produto, quantidade: qtd }]);
    }
  };

  const remover = (key) => {
    setCarrinho((prev) => prev.filter((item) => item.key !== key));
  };

  const editarQuantidade = (key) => {
    const item = carrinho.find((p) => p.key === key);
    if (!item) return;
    const novaQtdStr = prompt(
      `Alterar quantidade de "${item.name}":`,
      item.quantidade
    );
    const novaQtd = parseInt(novaQtdStr);
    if (!novaQtd || novaQtd <= 0) return;
    setCarrinho((c) =>
      c.map((p) => (p.key === key ? { ...p, quantidade: novaQtd } : p))
    );
  };

  const handleSaveCart = async () => {
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
      if (Object.keys(existing).length >= 3) {
        setSaveError("Você já tem 3 carrinhos. Exclua um antes.");
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
      setSucesso(`Carrinho salvo com sucesso, ${user.displayName || user.email}!`);
      setTimeout(() => {
        setCarrinho([]);
        setSucesso("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setSaveError("Erro ao salvar o carrinho.");
    } finally {
      setSalvando(false);
    }
  };

  const saveEdit = (id) => {
    update(ref(db, `mercados/${mercado.id}/ofertas/${id}`), {
      valor: editInput.valor.trim(),
      objeto: editInput.objeto.trim(),
    }).then(() => {
      setEditando(null);
      setEditInput({ valor: "", objeto: "" });
    });
  };

  const cancelEdit = () => setEditando(null);

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

  const total = carrinho.reduce(
    (sum, it) => sum + Number(it.price) * (it.quantidade || 1),
    0
  );

  const handleDeleteOferta = (ofertaId) => {
    const ofertaRef = ref(db, `mercados/${mercado.id}/ofertas/${ofertaId}`);
    remove(ofertaRef).catch((err) => {
      console.error("Erro ao excluir oferta:", err);
      toast.error("Falha ao excluir oferta.");
    });
  };

  return (
    <div className="container my-4">
      <ToastContainer position="top-right" pauseOnHover />
      <button className="btn btn-link mb-3" onClick={onVoltar}>
        &larr; Voltar
      </button>
      <h4>
        Ofertas em <span className="text-primary">{mercado.nome}</span>
        <br />
        <small className="text-black">
          {mercado.rua && <>{mercado.rua}, </>}
          {mercado.estado && <>{mercado.estado}, </>}
          {mercado.pais}
        </small>
      </h4>

      {/* Seção de categoria / produtos */}
      <div className="mb-4 d-flex flex-wrap gap-3 align-items-center">
        <div>
          <label className="form-label fw-bold me-2">Categoria:</label>
          <select
            className="form-select d-inline w-auto"
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value);
              setPage(1);
            }}
          >
            {Object.keys(CATEGORIAS).map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          {produtosLoading && (
            <div className="d-inline-block ms-2">
              <div
                className="spinner-border text-primary"
                style={{ width: 20, height: 20 }}
                role="status"
              >
                <span className="visually-hidden">Carregando...</span>
              </div>
              <span className="ms-1">Carregando produtos…</span>
            </div>
          )}
        </div>
      </div>

      {produtosError && (
        <div className="alert alert-danger">{produtosError}</div>
      )}

      <div className="row">
        {produtos.map((p) => (
          <div key={p.key} className="col-md-4 mb-3">
            <div className="card h-100 shadow-sm">
              <img
                src={p.image}
                alt={p.name}
                className="card-img-top"
                style={{ objectFit: "cover", height: 140 }}
                loading="lazy"
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
        ))}
      </div>

      {hasMore && !produtosLoading && (
        <div className="text-center mb-4">
          <button
            className="btn btn-outline-primary"
            onClick={() => setPage((p) => p + 1)}
            aria-label="Carregar mais produtos"
          >
            Carregar mais
          </button>
        </div>
      )}

      <hr />

      {/* Carrinho */}
      <h5>
        Carrinho ({carrinho.length} itens) — Total: R${" "}
        {total.toFixed(2).replace(".", ",")}
      </h5>
      {carrinho.length === 0 ? (
        <div className="alert alert-info">Seu carrinho está vazio.</div>
      ) : (
        <ul className="list-group mb-3">
          {carrinho.map((item, idx) => (
            <li
              key={idx}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                {item.name} — {item.quantidade} un — R${" "}
                {(item.price * item.quantidade)
                  .toFixed(2)
                  .replace(".", ",")}
              </div>
              <div className="d-flex gap-1">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => editarQuantidade(item.key)}
                >
                  ✏️
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => remover(item.key)}
                >
                  🗑️
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSaveCart}
        disabled={salvando || carrinho.length === 0}
      >
        {salvando ? "Salvando…" : "Salvar Carrinho"}
      </button>
      {saveError && <div className="text-danger mt-2">{saveError}</div>}
      {sucesso && <div className="alert alert-success mt-2">{sucesso}</div>}

      {/* Adicionar oferta manual 
      <div className="mt-5">
        <h5>Adicionar oferta manual</h5>
        <form
          onSubmit={handleAdd}
          className="row g-2 align-items-end"
          aria-label="Adicionar oferta"
        >
          <div className="col-md-4">
            <label className="form-label">Objeto</label>
            <input
              type="text"
              className="form-control"
              value={novo.objeto}
              onChange={(e) =>
                setNovo((n) => ({ ...n, objeto: e.target.value }))
              }
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Valor</label>
            <input
              type="text"
              className="form-control"
              value={novo.valor}
              onChange={(e) =>
                setNovo((n) => ({ ...n, valor: e.target.value }))
              }
              required
            />
          </div>
          <div className="col-md-4">
            <button type="submit" className="btn btn-secondary w-100">
              Adicionar oferta
            </button>
          </div>
        </form>
      </div>
      <div className="mt-5">
        <h5 className="mb-3">Ofertas enviadas</h5>
        {ofertas.length === 0 ? (
          <div className="alert alert-info">Nenhuma oferta registrada.</div>
        ) : (
          <ul className="list-group">
            {ofertas
              .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0))
              .map((o) => (
                <li
                  key={o.id}
                  className="list-group-item d-flex justify-content-between align-items-start flex-wrap"
                >
                  <div style={{ flex: "1 1 65%" }}>
                    <div>
                      <strong>{o.objeto}</strong> — R$ {o.valor}{" "}
                      <small className="text-muted">
                        ({formatarDataHora(o.criadoEm)})
                      </small>
                    </div>
                    <div style={{ fontSize: 12 }}>
                      Enviado por: {o.usuario || "anônimo"}
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-2">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleDeleteOferta(o.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>*/}
    </div>
  );
}
