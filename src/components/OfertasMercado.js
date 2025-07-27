import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  set as firebaseSet,
  get,
} from "firebase/database";

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

export default function OfertasMercado({ mercado, user, onVoltar, setUltimaVisita }) {
  const [ofertas, setOfertas] = useState([]);
  const [novo, setNovo] = useState({ valor: "", objeto: "" });
  const [editando, setEditando] = useState(null);
  const [editInput, setEditInput] = useState({ valor: "", objeto: "" });

  const [categoria, setCategoria] = useState(Object.keys(CATEGORIAS)[0]);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [sucesso, setSucesso] = useState("");
  const navigate = useNavigate();

  const [, setMercado] = useState(null);
  const [mercadosSelecionados, setMercadosSelecionados] = useState([]);
  const [precosFixos, setPrecosFixos] = useState({});

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

  useEffect(() => {
    async function buscarProdutos() {
      setErro("");
      setLoading(true);
      try {
        const slug = CATEGORIAS[categoria];
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(slug)}&page_size=3&json=1`;
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
    buscarProdutos();
  }, [categoria]);

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
      usuario: user.uid,
      valor: novo.valor.trim(),
      objeto: novo.objeto.trim(),
      criadoEm: Date.now(),
    });

    await firebaseSet(ref(db, `usuarios/${user.uid}/mercadosAtivos/${mercado.id}`), {
      nome: mercado.nome,
      rua: mercado.rua || "",
      estado: mercado.estado || "",
      pais: mercado.pais || "",
      dataUltimaOferta: Date.now(),
      valorUltimaOferta: novo.valor.trim(),
      objetoUltimaOferta: novo.objeto.trim(),
    });

    setNovo({ valor: "", objeto: "" });
  };

  const adicionar = (produto) => {
    const qtdStr = prompt(`Quantas unidades de "${produto.name}" você deseja adicionar?`, "1");
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

  const removerItem = (i) => setCarrinho((c) => c.filter((_, idx) => idx !== i));

  const remover = (key) => {
    setCarrinho((prev) => prev.filter((item) => item.key !== key));
  };

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
    await firebaseSet(newRef, {
      items: carrinho,
      criadoEm: Date.now(),
      mercadoId: mercado.id,
      mercadoNome: mercado.nome || "",
      mercadoRua: mercado.rua || "",
      mercadoEstado: mercado.estado || "",
      mercadoPais: mercado.pais || "",
    });
    setSalvando(false);
    setSucesso(`Carrinho salvo com sucesso, ${user.displayName || user.email}!`);

    setTimeout(() => {
      const desejaCriarOutro = window.confirm("Carrinho salvo com sucesso! Deseja criar outro carrinho?");

      if (desejaCriarOutro) {
        setCarrinho([]);
        setMercado(null);
        setMercadosSelecionados([]);
        setPrecosFixos({});
        setSucesso("");
      } else {
        navigate("/");
      }
    }, 3000);
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
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  const total = carrinho.reduce(
    (sum, it) => sum + Number(it.price) * (it.quantidade || 1),
    0
  );

  const handleDelete = (ofertaId) => {
    const ofertaRef = ref(db, `mercados/${mercado.id}/ofertas/${ofertaId}`);
    remove(ofertaRef).catch((err) => {
      console.error("Erro ao excluir oferta:", err);
    });
  };

  const editarQuantidade = (key) => {
    const item = carrinho.find((p) => p.key === key);
    if (!item) return;
    const novaQtdStr = prompt(`Alterar quantidade de "${item.name}":`, item.quantidade);
    const novaQtd = parseInt(novaQtdStr);
    if (!novaQtd || novaQtd <= 0) return;
    setCarrinho((c) =>
      c.map((p) =>
        p.key === key ? { ...p, quantidade: novaQtd } : p
      )
    );
  };

  return (
    <div className="container my-4">
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

      {/* Produtos do mercado */}
      <div className="mb-4">
        <label className="form-label fw-bold me-2">Categoria:</label>
        <select className="form-select w-auto d-inline" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {Object.keys(CATEGORIAS).map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center my-4">
          <div className="spinner-border text-primary" style={{ width: 48, height: 48 }} />
          <p className="mt-2">Carregando produtos…</p>
        </div>
      ) : erro ? (
        <div className="alert alert-danger">{erro}</div>
      ) : (
        <div className="row">
          {produtos.map((p) => (
            <div key={p.key} className="col-md-4 mb-3">
              <div className="card h-100 shadow-sm">
                <img src={p.image} alt={p.name} className="card-img-top" style={{ objectFit: "cover", height: 140 }} />
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title flex-grow-1">{p.name}</h6>
                  <p className="text-success fw-bold mb-2">R$ {Number(p.price).toFixed(2).replace(".", ",")}</p>
                  <button className="btn btn-success btn-sm mt-2" onClick={() => adicionar(p)}>Adicionar ao carrinho</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr />
      <h5>
        Carrinho ({carrinho.length} itens) — Total: R$ {total.toFixed(2).replace(".", ",")}
      </h5>
      {carrinho.length === 0 ? (
        <div className="alert alert-info">Seu carrinho está vazio.</div>
      ) : (
        <ul className="list-group mb-3">
          {carrinho.map((item, idx) => (
            <li key={idx} className="d-flex justify-content-between align-items-center">
              <span>
                {item.name} — {item.quantidade} un — R${" "}
                {(item.price * item.quantidade).toFixed(2).replace(".", ",")}
              </span>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => editarQuantidade(item.key)}
                  className="me-1"
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

      <button className="btn btn-primary" onClick={handleSaveCart} disabled={salvando || carrinho.length === 0}>
        {salvando ? "Salvando…" : "Salvar Carrinho"}
      </button>
      {saveError && <div className="text-danger mt-2">{saveError}</div>}
      {sucesso && <div className="alert alert-success mt-2">{sucesso}</div>}
    </div>
  );
}
