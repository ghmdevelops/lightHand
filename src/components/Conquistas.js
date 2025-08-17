import React, { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { ref, get, update } from "firebase/database";

export default function PassaportePage({ user, onVoltar }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conquistas, setConquistas] = useState([]);
  const [expandidoIds, setExpandidoIds] = useState([]);

  const BADGE_DEF = useMemo(
    () => [
      { key: "ClienteIniciante", min: 1, label: "🛒 Cliente Iniciante", desc: "fez 1 pedido" },
      { key: "ClienteFiel", min: 5, label: "🏅 Cliente Fiel", desc: "fez 5 pedidos" },
      { key: "CompradorAssíduo", min: 10, label: "🎖 Comprador Assíduo", desc: "fez 10 pedidos" },
      { key: "ClienteVIP", min: 20, label: "🎉 Cliente VIP", desc: "fez 20 pedidos" },
      { key: "ClientePremium", min: 30, label: "👑 Cliente Premium", desc: "fez 30 pedidos" },
    ],
    []
  );

  useEffect(() => {
    if (!user) {
      setPedidos([]);
      setConquistas([]);
      setLoading(false);
      return;
    }
    const pedidosRef = ref(db, `usuarios/${user.uid}/pedidos`);
    get(pedidosRef)
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data)
          .map(([id, info]) => ({ id, ...info }))
          .sort((a, b) => {
            const ta = a.dataHora ? new Date(a.dataHora).getTime() : 0;
            const tb = b.dataHora ? new Date(b.dataHora).getTime() : 0;
            return tb - ta;
          });
        setPedidos(arr);
        const novas = BADGE_DEF.filter((b) => arr.length >= b.min).map((b) => b.key);
        setConquistas(novas);
        if (novas.length > 0) {
          const updates = {};
          novas.forEach((badge) => {
            updates[`usuarios/${user.uid}/conquistas/${badge}`] = true;
          });
          update(ref(db), updates).catch(() => { });
        }
      })
      .catch(() => {
        setPedidos([]);
        setConquistas([]);
      })
      .finally(() => setLoading(false));
  }, [user, BADGE_DEF]);

  const toggleExpandir = (id) => {
    setExpandidoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const extrairIniciais = (nome) => {
    if (!nome) return "";
    return nome
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const tituloCapitalizado = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1))
      .join(" ");
  };

  const limitarTexto = (texto, max = 28) => (texto && texto.length > max ? texto.slice(0, max - 1) + "…" : texto || "");

  const fmtBRL = (v) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(Number(v || 0));

  const proximaBadge = useMemo(() => {
    const total = pedidos.length;
    return BADGE_DEF.find((b) => total < b.min) || null;
  }, [BADGE_DEF, pedidos.length]);

  const progressoPercentual = useMemo(() => {
    const total = pedidos.length;
    const atualIdx = BADGE_DEF.reduce((acc, b, idx) => (total >= b.min ? idx : acc), -1);
    const atualMin = atualIdx >= 0 ? BADGE_DEF[atualIdx].min : 0;
    const proxMin = proximaBadge ? proximaBadge.min : BADGE_DEF[BADGE_DEF.length - 1].min;
    const span = Math.max(1, proxMin - atualMin);
    const dentro = Math.min(span, Math.max(0, total - atualMin));
    return Math.round((dentro / span) * 100);
  }, [BADGE_DEF, pedidos.length, proximaBadge]);

  return (
    <div className="container my-5 px-3 px-md-4" style={{ zIndex: 2, paddingTop: "90px" }}>
      <style>{`
        .pp-header{display:flex;align-items:center;justify-content:space-between;gap:1rem}
        .pp-title{font-weight:800;letter-spacing:.2px;margin:0}
        .pp-sub{color:#64748b}
        .pp-chip{display:inline-flex;align-items:center;gap:.5rem;border:1px solid #e5e7eb;padding:.35rem .6rem;border-radius:999px;background:#fff;font-weight:600}
        .pp-card{border:0;background:linear-gradient(180deg,#ffffff,#f8fafc);box-shadow:0 8px 24px rgba(2,6,23,.06);border-radius:16px}
        .pp-card .card-body{padding:1rem 1rem}
        .pp-stamp{position:absolute;top:10px;right:10px;background:rgba(16,185,129,.12);color:#065f46;border:1px solid rgba(16,185,129,.25);padding:.25rem .5rem;border-radius:999px;font-size:.8rem;font-weight:700;backdrop-filter:blur(6px)}
        .pp-avatar{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 30% 20%,#3b82f6,#1d4ed8);color:#fff;font-weight:800;font-size:1.35rem;box-shadow:0 10px 22px rgba(37,99,235,.35)}
        .pp-order{transition:transform .2s ease, box-shadow .2s ease}
        .pp-order:hover{transform:translateY(-2px);box-shadow:0 16px 34px rgba(2,6,23,.12)}
        .pp-kpi{display:flex;gap:1rem;flex-wrap:wrap}
        .pp-kpi .k{flex:1;min-width:160px;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:.75rem 1rem}
        .pp-kpi .k .t{font-size:.8rem;color:#64748b}
        .pp-kpi .k .v{font-size:1.1rem;font-weight:800}
        .pp-skeleton{background:linear-gradient(90deg,#eee,#f7f7f7,#eee);background-size:200% 100%;animation:shimmer 1.2s infinite}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .pp-badge{display:inline-flex;align-items:center;gap:.5rem;border-radius:10px;padding:.45rem .6rem;background:#ecfeff;border:1px solid #bae6fd;color:#0369a1;font-weight:700}
        .pp-progress{height:8px;border-radius:999px;overflow:hidden;background:#e2e8f0}
        .pp-progress>span{display:block;height:100%;background:linear-gradient(90deg,#22d3ee,#6366f1)}
      `}</style>

      <button className="btn btn-outline-secondary mb-4" onClick={onVoltar}>&larr; Voltar</button>

      <div className="pp-header mb-3">
        <div>
          <h2 className="pp-title">Passaporte & Conquistas</h2>
          <div className="pp-sub">Acompanhe seus pedidos e desbloqueios</div>
        </div>
        <div className="pp-chip">
          <i className="fa-solid fa-box-archive"></i>
          {pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-8">
          <div className="card pp-card">
            <div className="card-body">
              <div className="pp-kpi mb-3">
                <div className="k">
                  <div className="t">Nível atual</div>
                  <div className="v">
                    {conquistas.length > 0
                      ? BADGE_DEF.filter((b) => conquistas.includes(b.key))
                        .map((b) => b.label.split(" ")[0] + " " + b.label.split(" ").slice(1).join(" "))
                        .slice(-1)
                      : "—"}
                  </div>
                </div>
                <div className="k">
                  <div className="t">Conquistas</div>
                  <div className="v">{conquistas.length}/{BADGE_DEF.length}</div>
                </div>
                <div className="k">
                  <div className="t">Próxima meta</div>
                  <div className="v">
                    {proximaBadge ? `${proximaBadge.label} • faltam ${Math.max(0, proximaBadge.min - pedidos.length)}` : "Máximo alcançado"}
                  </div>
                </div>
              </div>

              <div className="pp-progress mb-2">
                <span style={{ width: `${progressoPercentual}%` }} />
              </div>
              <div className="small text-muted">
                {proximaBadge
                  ? `Você está ${progressoPercentual}% do caminho para ${proximaBadge.label.toLowerCase()}.`
                  : "Você já conquistou todos os níveis disponíveis."}
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="card pp-card h-100">
            <div className="card-body d-flex flex-column gap-2">
              <div className="fw-bold mb-1">Conquistas alcançadas</div>
              {conquistas.length === 0 ? (
                <div className="text-muted">Sem conquistas ainda</div>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {BADGE_DEF.filter((b) => conquistas.includes(b.key)).map((b) => (
                    <span key={b.key} className="pp-badge">{b.label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="col" key={i}>
              <div className="card pp-card">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3">
                    <div className="pp-avatar pp-skeleton" />
                    <div className="flex-grow-1">
                      <div className="pp-skeleton" style={{ height: 14, width: "70%", borderRadius: 6 }} />
                      <div className="pp-skeleton mt-2" style={{ height: 12, width: "55%", borderRadius: 6 }} />
                    </div>
                  </div>
                  <div className="pp-skeleton mt-3" style={{ height: 10, width: "100%", borderRadius: 6 }} />
                  <div className="pp-skeleton mt-2" style={{ height: 10, width: "85%", borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div className="alert alert-info">Você ainda não fez nenhum pedido.</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mb-4">
          {pedidos.slice(0, 30).map((p) => {
            const estaExpandido = expandidoIds.includes(p.id);
            const totalItens = Array.isArray(p.itens)
              ? p.itens.reduce((acc, item) => acc + (item.qtd || item.quantidade || 1), 0)
              : 0;
            const endereco = p.endereco || {};
            const cep = endereco.cep || "N/A";
            const numero = endereco.numero || "";
            const rua = endereco.rua || "";
            const dataFormatada = p.dataHora ? new Date(p.dataHora).toLocaleString("pt-BR") : "";
            const nomeBase = p.mercadoNome || (p.multiMercado ? "Multi-mercados" : "Pedido");
            const iniciais = extrairIniciais(nomeBase) || "XX";
            const nomeLegal = limitarTexto(tituloCapitalizado(nomeBase));
            const totalCalculado =
              p.total != null
                ? p.total
                : Math.max(0, (p.subtotal || 0) - (p.descontoCupom || 0) + (p.freteRota || p.frete || 0));
            const entregaTipo = p.retiradaEmLoja ? "Retirada" : "Entrega";
            const lojaEnd = p.lojaEndereco || "";
            return (
              <div key={p.id} className="col">
                <div className="card pp-card pp-order h-100 position-relative" role="button" onClick={() => toggleExpandir(p.id)}>
                  <div className="pp-stamp"><i className="fa-solid fa-stamp me-1"></i>Entregue</div>
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center gap-3">
                      <div className="pp-avatar">{iniciais}</div>
                      <div className="flex-grow-1">
                        <div className="fw-bold">Pedido #{p.id.slice(0, 6)} • {nomeLegal || "Desconhecido"}</div>
                        <div className="text-muted small">{dataFormatada}</div>
                      </div>
                      <div className="text-end">
                        <div className="fw-bold">{fmtBRL(totalCalculado)}</div>
                        <div className="text-muted small">{totalItens} {totalItens === 1 ? "item" : "itens"}</div>
                      </div>
                    </div>

                    {estaExpandido ? (
                      <div className="mt-3">
                        <div className="row g-2">
                          <div className="col-12">
                            <span className="badge text-bg-light me-2">{entregaTipo}</span>
                            {p.janelaEntrega ? <span className="badge text-bg-light">Janela: {p.janelaEntrega}</span> : null}
                          </div>
                          {p.retiradaEmLoja ? (
                            <div className="col-12">
                              <div className="small text-muted">Endereço da loja</div>
                              <div className="fw-semibold">{lojaEnd || "—"}</div>
                            </div>
                          ) : (
                            <div className="col-12">
                              <div className="small text-muted">Endereço de entrega</div>
                              <div className="fw-semibold">{rua || "—"} {numero ? `, ${numero}` : ""} {cep ? `• CEP ${cep}` : ""}</div>
                            </div>
                          )}
                          <div className="col-6">
                            <div className="small text-muted">Desconto</div>
                            <div className="fw-semibold">{fmtBRL(p.descontoCupom || 0)}</div>
                          </div>
                          <div className="col-6">
                            <div className="small text-muted">Frete</div>
                            <div className="fw-semibold">{fmtBRL(p.freteRota || p.frete || 0)}</div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small mt-3">Toque para ver detalhes</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card pp-card">
        <div className="card-body">
          <div className="fw-bold mb-2">Todos os níveis</div>
          <div className="d-flex flex-wrap gap-2">
            {BADGE_DEF.map((b) => {
              const ativo = conquistas.includes(b.key);
              return (
                <span
                  key={b.key}
                  className="pp-chip"
                  style={{
                    background: ativo ? "#ecfeff" : "#fff",
                    borderColor: ativo ? "#bae6fd" : "#e5e7eb",
                    color: ativo ? "#0369a1" : "#0f172a",
                  }}
                >
                  {b.label} • {b.desc}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
