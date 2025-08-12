import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "../firebase";
import { ref, onValue, off, push, set, update, remove, get } from "firebase/database";

export default function CuponsPage({ onVoltar }) {
  const [cupons, setCupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [novoCodigo, setNovoCodigo] = useState("");
  const [novoTipo, setNovoTipo] = useState("percentual");
  const [novoValor, setNovoValor] = useState("");
  const [novoValidade, setNovoValidade] = useState("");
  const [novoMaxUsos, setNovoMaxUsos] = useState("1");
  const [nota, setNota] = useState("");

  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [ordem, setOrdem] = useState("recentes");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }
    const cuponsRef = ref(db, `usuarios/${user.uid}/coupons`);
    const handler = (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, c]) => ({ id, ...c }));
      setCupons(arr);
      setLoading(false);
    };
    onValue(cuponsRef, handler, () => setLoading(false));
    return () => off(cuponsRef, "value", handler);
  }, []);

  const normalizeCode = (s) => (s || "").trim().toUpperCase().replace(/\s+/g, "-");
  const toNumber = (x) => {
    const n = parseFloat(String(x).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };
  const formatBRL = (n) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;

  const statusCupom = (c) => {
    const now = Date.now();
    const exp = c.expiresAt ? new Date(c.expiresAt).getTime() : null;
    const usado = Number(c.usedCount || 0) >= Number(c.maxUses || 1);
    if (exp && exp < now) return "vencido";
    if (usado) return "esgotado";
    return c.status === "usado" ? "usado" : "ativo";
  };

  const diasRestantes = (c) => {
    if (!c.expiresAt) return null;
    const diff = new Date(c.expiresAt).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const cuponsFiltrados = useMemo(() => {
    let arr = [...cupons];
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter((c) => {
        const s1 = (c.code || "").toLowerCase().includes(term);
        const s2 = (c.note || "").toLowerCase().includes(term);
        return s1 || s2;
      });
    }
    if (filtro !== "todos") {
      arr = arr.filter((c) => statusCupom(c) === filtro);
    }
    if (ordem === "recentes") {
      arr.sort((a, b) => (b.criadoEm || b.createdAt || 0) - (a.criadoEm || a.createdAt || 0));
    } else if (ordem === "valor") {
      arr.sort((a, b) => (Number(b.value || 0) - Number(a.value || 0)));
    } else if (ordem === "validade") {
      arr.sort((a, b) => {
        const ea = a.expiresAt ? new Date(a.expiresAt).getTime() : Infinity;
        const eb = b.expiresAt ? new Date(b.expiresAt).getTime() : Infinity;
        return ea - eb;
      });
    }
    return arr;
  }, [cupons, q, filtro, ordem]);

  const validarForm = () => {
    const code = normalizeCode(novoCodigo);
    if (!code) return "Informe o código do cupom.";
    if (!/^[A-Z0-9\-_.]+$/.test(code)) return "Código inválido. Use letras, números, -, _ ou .";
    const val = toNumber(novoValor);
    if (novoTipo === "percentual") {
      if (val <= 0 || val > 100) return "Percentual deve ser entre 1 e 100.";
    } else {
      if (val <= 0) return "Valor fixo deve ser maior que 0.";
    }
    const usos = parseInt(novoMaxUsos, 10);
    if (!usos || usos < 1) return "Defina um limite de usos válido.";
    if (novoValidade && isNaN(new Date(novoValidade).getTime())) return "Data de validade inválida.";
    return "";
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setErro("");
    const err = validarForm();
    if (err) {
      setErro(err);
      return;
    }
    const user = auth.currentUser;
    if (!user) return;
    const cuponsRef = ref(db, `usuarios/${user.uid}/coupons`);
    const newRef = push(cuponsRef);
    const payload = {
      code: normalizeCode(novoCodigo),
      type: novoTipo,
      value: toNumber(novoValor),
      createdAt: Date.now(),
      criadoEm: Date.now(),
      expiresAt: novoValidade ? new Date(novoValidade).toISOString() : null,
      maxUses: parseInt(novoMaxUsos, 10) || 1,
      usedCount: 0,
      note: nota || "",
      status: "ativo",
    };
    await set(newRef, payload);
    setNovoCodigo("");
    setNovoTipo("percentual");
    setNovoValor("");
    setNovoValidade("");
    setNovoMaxUsos("1");
    setNota("");
  };

  const handleUse = async (couponId) => {
    const user = auth.currentUser;
    if (!user) return;
    const cupRef = ref(db, `usuarios/${user.uid}/coupons/${couponId}`);
    const snap = await get(cupRef);
    if (!snap.exists()) return;
    const c = snap.val() || {};
    const nextUsed = Number(c.usedCount || 0) + 1;
    const max = Number(c.maxUses || 1);
    const nextStatus = nextUsed >= max ? "usado" : "ativo";
    await update(cupRef, { usedCount: nextUsed, status: nextStatus, usadoEm: Date.now() });
  };

  const handleRemove = async (couponId) => {
    if (!window.confirm("Remover este cupom?")) return;
    const user = auth.currentUser;
    if (!user) return;
    await remove(ref(db, `usuarios/${user.uid}/coupons/${couponId}`));
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      alert("Código copiado!");
    } catch { }
  };

  const shareCoupon = async (c) => {
    const texto = `Use o cupom ${c.code} no Savvy.\nTipo: ${c.type === "percentual" ? `${c.value}%` : formatBRL(c.value)}\nVálido: ${c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("pt-BR") : "sem validade"}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Cupom Savvy", text: texto });
      } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(texto);
        alert("Cupom copiado para compartilhar!");
      } catch { }
    }
  };

  const exportCSV = () => {
    const headers = ["code", "type", "value", "status", "usedCount", "maxUses", "createdAt", "expiresAt", "note"];
    const rows = cupons.map((c) => [
      c.code || "",
      c.type || "",
      c.value || 0,
      statusCupom(c),
      c.usedCount || 0,
      c.maxUses || 0,
      c.createdAt || c.criadoEm || "",
      c.expiresAt || "",
      (c.note || "").replaceAll(";", ","),
    ]);
    const csv = [headers.join(";")].concat(rows.map((r) => r.join(";"))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cupons_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gerarCodigoAmigo = async () => {
    setErro("");
    const user = auth.currentUser;
    if (!user) return;
    const base = (user.uid || "AMIGO").slice(-6).toUpperCase();
    const code = `AMIGO-${base}`;
    setNovoCodigo(code);
    setNovoTipo("percentual");
    setNovoValor("10");
    const dt = new Date();
    dt.setDate(dt.getDate() + 90);
    setNovoValidade(dt.toISOString().slice(0, 10));
    setNovoMaxUsos("50");
    setNota("Cupom de indicação");
  };

  if (loading) {
    return (
      <div className="container my-5" style={{ paddingTop: 90 }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">Carregando cupons…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4" style={{ zIndex: 2, paddingTop: 90, maxWidth: 980 }}>
        <button className="btn btn-outline-secondary mb-3" onClick={onVoltar || (() => window.history.back())}>&larr; Voltar</button>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Pagamentos & Cupons</h2>
        <div />
      </div>

      <div className="bg-white border rounded-4 shadow-sm p-4 mb-4">
        <h5 className="mb-3">Adicionar Cupom</h5>
        <form className="row g-3 align-items-end" onSubmit={handleAdd}>
          <div className="col-12 col-md-4">
            <label className="form-label">Código</label>
            <input className="form-control" type="text" placeholder="EX: PROMO10" value={novoCodigo} onChange={(e) => setNovoCodigo(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Tipo</label>
            <select className="form-select" value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)}>
              <option value="percentual">Percentual (%)</option>
              <option value="fixo">Valor fixo (R$)</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">{novoTipo === "percentual" ? "Percentual" : "Valor"}</label>
            <input className="form-control" type="number" step="0.01" min="0" value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
          </div>
          <div className="col-6 col-md-2">
            <label className="form-label">Limite de usos</label>
            <input className="form-control" type="number" min="1" value={novoMaxUsos} onChange={(e) => setNovoMaxUsos(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Validade</label>
            <input className="form-control" type="date" value={novoValidade} onChange={(e) => setNovoValidade(e.target.value)} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Observações</label>
            <input className="form-control" type="text" placeholder="Ex.: válido para 1º pedido" value={nota} onChange={(e) => setNota(e.target.value)} />
          </div>
          <div className="col-12 d-flex gap-2">
            <button className="btn btn-primary" type="submit">Adicionar</button>
            <button type="button" className="btn btn-outline-success" onClick={gerarCodigoAmigo}>Gerar código amigo</button>
          </div>
        </form>
        {erro && <div className="alert alert-danger mt-3">{erro}</div>}
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="Buscar por código ou observação" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="d-flex gap-2 align-items-center">
          <select className="form-select form-select-sm w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="ativo">Ativos</option>
            <option value="vencido">Vencidos</option>
            <option value="esgotado">Esgotados</option>
            <option value="usado">Marcados como usados</option>
          </select>
          <select className="form-select form-select-sm w-auto" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="valor">Maior valor</option>
            <option value="validade">Vencem antes</option>
          </select>
        </div>
      </div>

      {cuponsFiltrados.length === 0 ? (
        <div className="alert alert-info">Nenhum cupom encontrado.</div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-3">
          {cuponsFiltrados.map((c) => {
            const st = statusCupom(c);
            const dias = diasRestantes(c);
            const progress = Math.min(100, Math.round(((c.usedCount || 0) / (c.maxUses || 1)) * 100));
            return (
              <div className="col" key={c.id}>
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="card-title mb-0">{c.code}</h5>
                      <span className={`badge ${st === "ativo" ? "text-bg-success" : st === "vencido" ? "text-bg-warning" : st === "esgotado" ? "text-bg-secondary" : "text-bg-info"}`}>{st.toUpperCase()}</span>
                    </div>

                    <div className="mb-2">
                      <div className="d-flex flex-wrap gap-2 small text-muted">
                        <span>{c.type === "percentual" ? `${c.value}% off` : `${formatBRL(c.value)} off`}</span>
                        <span>•</span>
                        <span>Usos: {c.usedCount || 0}/{c.maxUses || 1}</span>
                        {c.expiresAt && (
                          <>
                            <span>•</span>
                            <span>Válido até {new Date(c.expiresAt).toLocaleDateString("pt-BR")}{typeof dias === "number" && dias >= 0 ? ` (${dias} dia${dias === 1 ? "" : "s"} restantes)` : ""}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {c.note && <div className="text-muted mb-2"><small>{c.note}</small></div>}

                    <div className="progress mb-3" style={{ height: 8 }}>
                      <div className="progress-bar" role="progressbar" style={{ width: `${progress}%` }} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" />
                    </div>

                    <div className="mt-auto d-flex flex-wrap gap-2">
                      <button className="btn btn-outline-primary btn-sm" onClick={() => copyCode(c.code)}>Copiar código</button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => shareCoupon(c)}>Compartilhar</button>
                      {st === "ativo" ? (
                        <button className="btn btn-success btn-sm" onClick={() => handleUse(c.id)}>Marcar uso</button>
                      ) : (
                        <button className="btn btn-outline-success btn-sm" disabled>Sem usos</button>
                      )}
                      <button className="btn btn-outline-danger btn-sm ms-auto" onClick={() => handleRemove(c.id)}>Remover</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cupons.length === 0 && (
        <p className="mt-4">Cadastre cupons de desconto, gerencie usos e compartilhe com amigos. Você também pode gerar um “código amigo” de indicação.</p>
      )}
    </div>
  );
}
