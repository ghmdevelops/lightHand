import React, { useEffect, useMemo, useState } from "react";
import { auth, db } from "../firebase";
import { ref, get } from "firebase/database";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";

export default function PrevisaoGastosPage() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState({});
  const [filtroAno, setFiltroAno] = useState("todos");
  const [tipoGrafico, setTipoGrafico] = useState("total");
  const navigate = useNavigate();

  const fmtBRL = (n) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n || 0));

  useEffect(() => {
    async function fetchDados() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      const snap = await get(ref(db, `usuarios/${user.uid}/pedidos`));
      const raw = snap.val() || {};
      const pedidos = Object.entries(raw).map(([id, p]) => ({
        id,
        dataHora: p.dataHora,
        total: Number(p.total),
      }));
      const map = {};
      pedidos.forEach(({ id, dataHora, total }) => {
        const dt = new Date(dataHora);
        if (isNaN(dt)) return;
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        const label = `${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
        if (!map[key]) map[key] = { key, name: label, ano: dt.getFullYear(), total: 0, quantidade: 0, pedidos: [] };
        map[key].total += total;
        map[key].quantidade += 1;
        map[key].pedidos.push({ id, total, data: dt.toLocaleDateString() });
      });
      const arr = Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
      arr.forEach((m) => {
        m.total = Number(m.total.toFixed(2));
        m.pedidos.sort((a, b) => b.total - a.total);
        m.max = m.pedidos[0]?.total ?? 0;
        m.min = m.pedidos[m.pedidos.length - 1]?.total ?? 0;
        m.ticketMedio = m.quantidade ? m.total / m.quantidade : 0;
      });
      for (let i = 0; i < arr.length; i++) {
        const prev = arr[i - 1];
        arr[i].variacao = prev ? ((arr[i].total - prev.total) / (prev.total || 1)) * 100 : 0;
      }
      setDados(arr);
      setLoading(false);
    }
    fetchDados();
  }, []);

  const anosDisponiveis = useMemo(() => {
    const s = new Set(dados.map((d) => d.ano));
    return Array.from(s).sort((a, b) => a - b);
  }, [dados]);

  const dadosFiltrados = useMemo(() => {
    if (filtroAno === "todos") return dados;
    return dados.filter((d) => String(d.ano) === String(filtroAno));
  }, [dados, filtroAno]);

  const totalPeriodo = useMemo(() => dadosFiltrados.reduce((s, m) => s + m.total, 0), [dadosFiltrados]);
  const qtdPeriodo = useMemo(() => dadosFiltrados.reduce((s, m) => s + m.quantidade, 0), [dadosFiltrados]);
  const mediaMensal = useMemo(
    () => (dadosFiltrados.length ? totalPeriodo / dadosFiltrados.length : 0),
    [dadosFiltrados, totalPeriodo]
  );
  const ticketMedioGeral = useMemo(() => (qtdPeriodo ? totalPeriodo / qtdPeriodo : 0), [qtdPeriodo, totalPeriodo]);

  const maiorMes = useMemo(
    () => dadosFiltrados.reduce((acc, m) => (m.total > (acc?.total || 0) ? m : acc), null),
    [dadosFiltrados]
  );
  const menorMes = useMemo(
    () =>
      dadosFiltrados.reduce(
        (acc, m) => (acc === null || m.total < acc.total ? m : acc),
        dadosFiltrados.length ? { total: Infinity } : null
      ),
    [dadosFiltrados]
  );

  if (loading)
    return (
      <div className="container my-5 text-center" style={{ paddingTop: 80 }}>
        <div className="mb-3">
          <div className="placeholder-wave" style={{ maxWidth: 520, margin: "0 auto" }}>
            <div className="placeholder col-12" style={{ height: 14, borderRadius: 8 }} />
            <div className="placeholder col-8 mt-2" style={{ height: 14, borderRadius: 8 }} />
          </div>
        </div>
        <div className="row row-cols-1 row-cols-md-3 g-3 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="col" key={i}>
              <div className="card shadow-sm" style={{ borderRadius: 16 }}>
                <div className="card-body">
                  <div className="placeholder col-6" style={{ height: 16, borderRadius: 8 }} />
                  <div className="placeholder col-8 mt-2" style={{ height: 28, borderRadius: 8 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 320 }} className="border rounded-3 p-3">
          <div className="placeholder col-12" style={{ height: "100%", borderRadius: 12 }} />
        </div>
        <p className="mt-3">Carregando dados de pedidos…</p>
      </div>
    );

  return (
    <div className="container my-5 px-3 px-md-4" style={{ zIndex: 2, paddingTop: 80 }}>
      <style>{`
        .card-stat{border:1px solid #eef2f7;border-radius:16px;box-shadow:0 6px 18px rgba(16,24,40,.06)}
        .stat-kpi{font-size:1.25rem;font-weight:800}
        .delta-up{color:#16a34a}
        .delta-down{color:#dc2626}
      `}</style>

      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate(-1)}>
        &larr; Voltar
      </button>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <h2 className="mb-0">Histórico de Pedidos & Gastos Mensais</h2>
        <div className="ms-auto d-flex flex-wrap gap-2">
          <select className="form-select" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)}>
            <option value="todos">Todos os anos</option>
            {anosDisponiveis.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="btn-group">
            <button
              className={`btn btn-outline-primary ${tipoGrafico === "total" ? "active" : ""}`}
              onClick={() => setTipoGrafico("total")}
            >
              Gráfico: Total
            </button>
            <button
              className={`btn btn-outline-primary ${tipoGrafico === "qtd" ? "active" : ""}`}
              onClick={() => setTipoGrafico("qtd")}
            >
              Gráfico: Qtd
            </button>
          </div>
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              const headers = ["Mes/Ano", "Quantidade", "Total(R$)", "TicketMedio(R$)"];
              const rows = dadosFiltrados.map((m) => [
                m.name,
                m.quantidade,
                m.total.toFixed(2).replace(".", ","),
                (m.ticketMedio || 0).toFixed(2).replace(".", ","),
              ]);
              const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `gastos_${filtroAno}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {dadosFiltrados.length === 0 ? (
        <div className="alert alert-info">
          Nenhum pedido encontrado no período selecionado.
        </div>
      ) : (
        <>
          <div className="row row-cols-1 row-cols-md-4 g-3 mb-4">
            <div className="col">
              <div className="card card-stat">
                <div className="card-body">
                  <div className="text-muted">Total no período</div>
                  <div className="stat-kpi">{fmtBRL(totalPeriodo)}</div>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card card-stat">
                <div className="card-body">
                  <div className="text-muted">Pedidos</div>
                  <div className="stat-kpi">{qtdPeriodo}</div>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card card-stat">
                <div className="card-body">
                  <div className="text-muted">Média mensal</div>
                  <div className="stat-kpi">{fmtBRL(mediaMensal)}</div>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="card card-stat">
                <div className="card-body">
                  <div className="text-muted">Ticket médio</div>
                  <div className="stat-kpi">{fmtBRL(ticketMedioGeral)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5" style={{ width: "100%", height: 360 }}>
            {tipoGrafico === "total" ? (
              <ResponsiveContainer>
                <BarChart data={dadosFiltrados} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#198754" stopOpacity={0.95} />
                      <stop offset="100%" stopColor="#198754" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(v, n) => (n === "total" ? fmtBRL(v) : `${v} pedido(s)`)}
                    labelFormatter={(l) => `Mês: ${l}`}
                  />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="total" name="Total Gasto" fill="url(#gTotal)" radius={[6, 6, 0, 0]} />
                  <ReferenceLine y={mediaMensal} stroke="#0d6efd" strokeDasharray="4 4" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer>
                <LineChart data={dadosFiltrados} margin={{ top: 20, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={(l) => `Mês: ${l}`} formatter={(v) => [`${v} pedido(s)`, "Qtd. Pedidos"]} />
                  <Legend verticalAlign="top" />
                  <Line type="monotone" dataKey="quantidade" name="Qtd. Pedidos" stroke="#0d6efd" strokeWidth={3} dot />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="mb-0">Resumo Mensal</h5>
            <div className="d-flex gap-2">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  const next = {};
                  dadosFiltrados.forEach((m) => (next[m.name] = true));
                  setExpandido(next);
                }}
              >
                Expandir todos
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setExpandido({})}
              >
                Recolher todos
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-striped align-middle">
              <thead className="table-light">
                <tr>
                  <th>Mês/Ano</th>
                  <th className="text-center">Qtd. Pedidos</th>
                  <th className="text-end">Total (R$)</th>
                  <th className="text-end">Ticket médio</th>
                  <th className="text-end">Variação</th>
                </tr>
              </thead>
              <tbody>
                {dadosFiltrados.map((m) => (
                  <React.Fragment key={m.name}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandido((e) => ({ ...e, [m.name]: !e[m.name] }))}>
                      <td>{m.name}</td>
                      <td className="text-center">{m.quantidade}</td>
                      <td className="text-end">{m.total.toFixed(2).replace(".", ",")}</td>
                      <td className="text-end">{(m.ticketMedio || 0).toFixed(2).replace(".", ",")}</td>
                      <td className="text-end">
                        {m.variacao === 0 ? (
                          <span className="text-muted">—</span>
                        ) : m.variacao > 0 ? (
                          <span className="delta-up">▲ {m.variacao.toFixed(1)}%</span>
                        ) : (
                          <span className="delta-down">▼ {Math.abs(m.variacao).toFixed(1)}%</span>
                        )}
                      </td>
                    </tr>
                    {expandido[m.name] && (
                      <tr>
                        <td colSpan={5} className="bg-light">
                          <table className="table mb-0">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th className="text-end">Valor (R$)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.pedidos.map((p) => (
                                <tr
                                  key={p.id}
                                  className={
                                    p.total === m.max
                                      ? "table-danger"
                                      : p.total === m.min
                                        ? "table-success"
                                        : ""
                                  }
                                >
                                  <td>{p.data}</td>
                                  <td className="text-end">{p.total.toFixed(2).replace(".", ",")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="d-flex justify-content-between px-2">
                            <small className="text-danger">Maior gasto: {fmtBRL(m.max)}</small>
                            <small className="text-success">Mais econômico: {fmtBRL(m.min)}</small>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {maiorMes && menorMes && (
            <div className="alert alert-secondary mt-3">
              Pico de gastos em <strong>{maiorMes.name}</strong> ({fmtBRL(maiorMes.total)}). Mês mais econômico:
              <strong> {menorMes.name}</strong> ({fmtBRL(menorMes.total)}).
            </div>
          )}
        </>
      )}
    </div>
  );
}
