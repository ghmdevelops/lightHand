import React, { useEffect, useMemo, useState } from "react";
import { ref, get, remove } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Carrinho({ user }) {
  const [carts, setCarts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const navigate = useNavigate();

  const formatBRL = (n) => Number(n || 0).toFixed(2).replace(".", ",");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const cartsSnap = await get(ref(db, `usuarios/${user.uid}/carts`));
      const cartsData = cartsSnap.val() || {};
      const cartsArr = Object.entries(cartsData)
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      const sumTotalCart = (c) =>
        (c.items || []).reduce(
          (s, it) => s + Number(it.price || 0) * (it.qtd || it.quantidade || 1),
          0
        );
      const pending = cartsArr.filter((c) => !c.pedidoFeito);
      setCarts(pending);

      const pedidosSnap = await get(ref(db, `usuarios/${user.uid}/pedidos`));
      const pedidosData = pedidosSnap.val() || {};
      const ordersArr = Object.entries(pedidosData).map(([id, p]) => {
        const itens = Array.isArray(p.itens) ? p.itens : Array.isArray(p.items) ? p.items : [];
        const itemsNorm = itens.map((it) => ({
          name: it.nome ?? it.name ?? "",
          price: Number(it.preco ?? it.price ?? 0),
          qtd: Number(it.qtd ?? it.quantidade ?? 1),
        }));
        const totalCalc = itemsNorm.reduce((s, it) => s + it.price * it.qtd, 0);
        const created =
          p.criadoEm ||
          (p.dataHora ? Date.parse(p.dataHora) || Date.now() : Date.now());
        return {
          id,
          mercadoNome: p.mercadoNome || "",
          mercadoRua: p.mercadoRua || "",
          mercadoEstado: p.mercadoEstado || "",
          mercadoPais: p.mercadoPais || "",
          criadoEm: created,
          items: itemsNorm,
          total: Number(p.total ?? totalCalc),
        };
      });
      ordersArr.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      setOrders(ordersArr);
      setLoading(false);
    })();
  }, [user]);

  const handleDeleteCart = async (id) => {
    if (!window.confirm("Deseja realmente excluir este carrinho?")) return;
    await remove(ref(db, `usuarios/${user.uid}/carts/${id}`));
    setCarts((c) => c.filter((x) => x.id !== id));
    setSelected((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const filtered = useMemo(() => {
    let arr = [...carts];
    const term = q.trim().toLowerCase();
    const sumTotal = (c) =>
      (c.items || []).reduce(
        (s, it) => s + Number(it.price || 0) * (it.qtd || it.quantidade || 1),
        0
      );
    if (term) {
      arr = arr.filter((c) => {
        const inMarket = (c.mercadoNome || "").toLowerCase().includes(term);
        const inItems = (c.items || []).some((it) =>
          (it.name || "").toLowerCase().includes(term)
        );
        return inMarket || inItems;
      });
    }
    if (sort === "total") {
      arr.sort((a, b) => sumTotal(b) - sumTotal(a));
    } else if (sort === "items") {
      arr.sort((a, b) => (b.items?.length || 0) - (a.items?.length || 0));
    } else {
      arr.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    }
    return arr.map((c) => ({ cart: c, total: sumTotal(c) }));
  }, [carts, q, sort]);

  const compareNow = (ids) => {
    const cartIdSet = new Set(carts.map((c) => c.id));
    const cleaned = (ids || []).filter((id) => cartIdSet.has(id));
    const useIds = cleaned.length ? cleaned : carts.map((c) => c.id);
    if (!useIds.length) return;
    navigate(`/comparar-carrinhos?ids=${useIds.join(",")}`);
  };

  const selectedOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : null;

  return (
    <div className="container mt-5" style={{ zIndex: 2, paddingTop: "80px" }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          &larr; Voltar
        </button>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="input-group" style={{ width: 260 }}>
            <span className="input-group-text">
              <i className="fa-solid fa-search" />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por mercado ou item"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select
            className="form-select form-select-sm w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Mais recentes</option>
            <option value="total">Maior total</option>
            <option value="items">Mais itens</option>
          </select>
          <select
            className="form-select form-select-sm"
            style={{ minWidth: 320 }}
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
          >
            <option value="">Pedidos feitos</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {(o.mercadoNome || "Mercado")} • {new Date(o.criadoEm || Date.now()).toLocaleString()} • R$ {formatBRL(o.total)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedOrder && (
        <>
          <h4 className="mb-2">Pedido selecionado</h4>
          <div className="list-group mb-4">
            <div className="list-group-item p-0 border-0">
              <div className="card shadow-sm rounded-4 cart-card">
                <div className="card-body p-3 p-md-4">
                  <div className="d-flex justify-content-between align-items-start gap-3">
                    <div className="d-flex align-items-start gap-3">
                      <div className="form-check mt-1">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selected.has(selectedOrder.id)}
                          onChange={() => toggleSelect(selectedOrder.id)}
                          aria-label="Selecionar pedido"
                        />
                      </div>
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <small className="text-muted">
                            <i className="fa-regular fa-clock me-1" />
                            {new Date(selectedOrder.criadoEm || Date.now()).toLocaleString()}
                          </small>
                          <span className="badge bg-success-subtle text-success-emphasis rounded-pill">
                            <i className="fa-solid fa-check-circle me-1" />
                            Pedido feito
                          </span>
                        </div>
                        <h5 className="card-title mb-1">
                          <i className="fa-solid fa-store me-2 text-primary" />
                          {selectedOrder.mercadoNome || "Mercado não informado"}
                        </h5>
                        {selectedOrder.mercadoRua && (
                          <p className="card-text text-muted mb-2">
                            <i className="fa-solid fa-location-dot me-2" />
                            {selectedOrder.mercadoRua}
                            {selectedOrder.mercadoEstado ? `, ${selectedOrder.mercadoEstado}` : ""}
                            {selectedOrder.mercadoPais ? `, ${selectedOrder.mercadoPais}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="fw-bold" style={{ fontSize: "1.05rem" }}>
                        Total R$ {formatBRL(selectedOrder.total)}
                      </div>
                      <small className="text-muted">
                        {selectedOrder.items?.length || 0} {selectedOrder.items?.length === 1 ? "item" : "itens"}
                      </small>
                    </div>
                  </div>
                  <div className="mt-3 cart-items-scroll">
                    {(selectedOrder.items || []).map((it, idx) => (
                      <div
                        key={idx}
                        className="d-flex justify-content-between align-items-center py-1"
                        style={{ fontSize: ".95rem" }}
                      >
                        <span className="text-truncate me-2" title={it.name}>
                          {(it.qtd || 1)}x {it.name}
                        </span>
                        <span className="badge bg-light text-dark">
                          R$ {formatBRL(Number(it.price || 0) * (it.qtd || 1))}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="d-flex align-items-center gap-2">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => toggleSelect(selectedOrder.id)}
                        title={selected.has(selectedOrder.id) ? "Desmarcar" : "Selecionar para comparar"}
                      >
                        <i className={`fa-solid ${selected.has(selectedOrder.id) ? "fa-check" : "fa-plus"} me-1`} />
                        {selected.has(selectedOrder.id) ? "Selecionado" : "Selecionar"}
                      </button>
                    </div>
                    <span className="text-muted small">Pedido sincronizado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <h4 className="mb-3">Carrinhos Pendentes</h4>

      {loading ? (
        <div className="row g-3">
          {[0, 1, 2].map((i) => (
            <div className="col-12" key={i}>
              <div className="card skeleton-card" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: 68,
              height: 68,
              borderRadius: 20,
              background: "linear-gradient(135deg,#eef2ff,#f8fafc)",
              boxShadow: "0 8px 24px rgba(2,6,23,.06)",
            }}
          >
            <i className="fa-solid fa-basket-shopping text-primary" style={{ fontSize: 24 }} />
          </div>
          <h5 className="fw-bold mb-1">Nenhum carrinho pendente</h5>
          <p className="text-muted mb-3">Adicione itens para comparar e finalizar depois.</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            Explorar mercados
          </button>
        </div>
      ) : (
        <ul className="list-group mb-4">
          {filtered.map(({ cart, total }) => {
            const checked = selected.has(cart.id);
            return (
              <li key={cart.id} className="list-group-item p-0 border-0">
                <div className="card shadow-sm rounded-4 cart-card">
                  <div className="card-body p-3 p-md-4">
                    <div className="d-flex justify-content-between align-items-start gap-3">
                      <div className="d-flex align-items-start gap-3">
                        <div className="form-check mt-1">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(cart.id)}
                            aria-label="Selecionar carrinho"
                          />
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <small className="text-muted">
                              <i className="fa-regular fa-clock me-1" />
                              {new Date(cart.criadoEm || Date.now()).toLocaleString()}
                            </small>
                          </div>
                          <h5 className="card-title mb-1">
                            <i className="fa-solid fa-store me-2 text-primary" />
                            {cart.mercadoNome || "Mercado não informado"}
                          </h5>
                          {cart.mercadoRua && (
                            <p className="card-text text-muted mb-2">
                              <i className="fa-solid fa-location-dot me-2" />
                              {cart.mercadoRua}
                              {cart.mercadoEstado ? `, ${cart.mercadoEstado}` : ""}
                              {cart.mercadoPais ? `, ${cart.mercadoPais}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold" style={{ fontSize: "1.05rem" }}>
                          Total R$ {formatBRL(total)}
                        </div>
                        <small className="text-muted">
                          {cart.items?.length || 0} {cart.items?.length === 1 ? "item" : "itens"}
                        </small>
                      </div>
                    </div>
                    <div className="mt-3 cart-items-scroll">
                      {(cart.items || []).map((it, idx) => (
                        <div
                          key={idx}
                          className="d-flex justify-content-between align-items-center py-1"
                          style={{ fontSize: ".95rem" }}
                        >
                          <span className="text-truncate me-2" title={it.name}>
                            {(it.qtd || it.quantidade || 1)}x {it.name}
                          </span>
                          <span className="badge bg-light text-dark">
                            R$ {formatBRL(Number(it.price || 0) * (it.qtd || it.quantidade || 1))}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="d-flex align-items-center gap-2">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => toggleSelect(cart.id)}
                          title={checked ? "Desmarcar" : "Selecionar para comparar"}
                        >
                          <i className={`fa-solid ${checked ? "fa-check" : "fa-plus"} me-1`} />
                          {checked ? "Selecionado" : "Selecionar"}
                        </button>
                      </div>
                      <button
                        className="btn btn-outline-danger btn-sm d-flex align-items-center"
                        onClick={() => handleDeleteCart(cart.id)}
                        title="Excluir carrinho"
                      >
                        <i className="fa-solid fa-trash-can me-1" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(carts.length > 0 || selected.size > 0) && (
        <div className="text-end mt-2">
          <button
            className="btn btn-success px-4 py-2 mb-3 compare-all"
            onClick={() => compareNow([...selected])}
            disabled={loading || selected.size === 0}
          >
            <i className="fa-solid fa-scale-balanced me-2" />
            {selected.size > 0 ? `Comparar selecionados (${selected.size})` : "Selecionar para comparar"}
          </button>
        </div>
      )}

      <style>{`
        .cart-card{
          border:1px solid #eef2f7;
          transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease;
          animation:fadeUp .28s ease both;
        }
        .cart-card:hover{
          transform:translateY(-2px);
          box-shadow:0 16px 36px rgba(2,6,23,.12);
          border-color:#e5e7eb;
        }
        .cart-items-scroll{
          max-height:160px;
          overflow:auto;
          border:1px dashed #e5e7eb;
          border-radius:10px;
          padding:.5rem .75rem;
          background:#fafbff;
        }
        .compare-all{
          border-radius: 30px;
          font-weight:700;
          box-shadow:0 12px 28px rgba(34,197,94,.22);
          background:linear-gradient(135deg,#22c55e,#16a34a);
          border:none;
          transition:transform .16s ease, box-shadow .16s ease, filter .16s ease;
        }
        .compare-all:hover{
          transform:translateY(-1px);
          box-shadow:0 16px 36px rgba(22,163,74,.28);
          filter:brightness(1.03);
        }
        .skeleton-card{
          height:140px;
          border-radius:16px;
          background:linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 37%,#f3f4f6 63%);
          background-size:400% 100%;
          animation:sheen 1.2s ease-in-out infinite;
          border:1px solid #eef2f7;
        }
        @keyframes sheen{0%{background-position:100% 0}100%{background-position:-100% 0}}
        @keyframes fadeUp{from{opacity:0; transform:translateY(6px)}to{opacity:1; transform:translateY(0)}}
        @media (prefers-reduced-motion: reduce){
          *{animation:none !important; transition:none !important}
        }
      `}</style>
    </div>
  );
}
