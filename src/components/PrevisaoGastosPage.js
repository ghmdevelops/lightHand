import React, { useState, useEffect } from "react";
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
} from "recharts";

export default function PrevisaoGastosPage() {
  const [dados, setDados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState({});
  const navigate = useNavigate();

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

      const agrupado = {};
      pedidos.forEach(({ id, dataHora, total }) => {
        const dt = new Date(dataHora);
        if (isNaN(dt)) return;
        const key = `${dt.getMonth() + 1}/${dt.getFullYear()}`;
        if (!agrupado[key])
          agrupado[key] = { name: key, total: 0, quantidade: 0, pedidos: [] };
        agrupado[key].total += total;
        agrupado[key].quantidade += 1;
        agrupado[key].pedidos.push({ id, total, data: dt.toLocaleDateString() });
      });

      const arr = Object.values(agrupado).sort((a, b) => {
        const [m1, y1] = a.name.split("/").map(Number);
        const [m2, y2] = b.name.split("/").map(Number);
        return new Date(y1, m1 - 1) - new Date(y2, m2 - 1);
      });

      arr.forEach((m) => {
        m.total = Number(m.total.toFixed(2));
        m.pedidos.sort((a, b) => b.total - a.total);
        m.max = m.pedidos[0]?.total ?? 0;
        m.min = m.pedidos[m.pedidos.length - 1]?.total ?? 0;
      });

      setDados(arr);
      setLoading(false);
    }

    fetchDados();
  }, []);

  if (loading)
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Carregando dados de pedidos…</p>
      </div>
    );

  return (
    <div
      className="container my-5 px-3 px-md-4"
      style={{ zIndex: 2, paddingTop: "80px" }}
    >
      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate(-1)}>
        &larr; Voltar
      </button>
      <h2 className="mb-4">Histórico de Pedidos & Gastos Mensais</h2>

      {dados.length === 0 ? (
        <div className="alert alert-info">
          Nenhum pedido encontrado. Faça pelo menos um pedido para gerar o gráfico.
        </div>
      ) : (
        <>
          <div className="mb-5" style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={dados} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(v, n) => (n === "total" ? `R$ ${v.toFixed(2)}` : `${v} pedido(s)`)}
                />
                <Legend verticalAlign="top" />
                <Bar yAxisId="left" dataKey="quantidade" name="Qtd. Pedidos" fill="#0d6efd" />
                <Bar yAxisId="right" dataKey="total" name="Total Gasto (R$)" fill="#198754" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h5 className="mb-3">Resumo Mensal</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-light">
                <tr>
                  <th>Mês/Ano</th>
                  <th className="text-center">Qtd. Pedidos</th>
                  <th className="text-end">Total Gasto (R$)</th>
                </tr>
              </thead>
              <tbody>
                {dados.map((m) => (
                  <React.Fragment key={m.name}>
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setExpandido((e) => ({ ...e, [m.name]: !e[m.name] }))
                      }
                    >
                      <td>{m.name}</td>
                      <td className="text-center">{m.quantidade}</td>
                      <td className="text-end">{m.total.toFixed(2).replace(".", ",")}</td>
                    </tr>
                    {expandido[m.name] && (
                      <tr>
                        <td colSpan={3} className="bg-light">
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
                                  <td className="text-end">
                                    {p.total.toFixed(2).replace(".", ",")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="d-flex justify-content-between px-2">
                            <small className="text-danger">
                              Maior gasto: R$ {m.max.toFixed(2).replace(".", ",")}
                            </small>
                            <small className="text-success">
                              Mais econômico: R$ {m.min.toFixed(2).replace(".", ",")}
                            </small>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
