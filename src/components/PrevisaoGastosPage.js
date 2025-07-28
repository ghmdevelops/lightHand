import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { ref, get } from "firebase/database";
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
  const [dadosMensais, setDadosMensais] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDados() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      const pedidosRef = ref(db, `usuarios/${user.uid}/pedidos`);
      const snap = await get(pedidosRef);
      const raw = snap.val() || {};

      const pedidos = Object.values(raw).map((p) => ({
        dataHora: p.dataHora,
        total: Number(p.total),
      }));

      const agrupado = {};
      pedidos.forEach(({ dataHora, total }) => {
        const dt = new Date(dataHora);
        if (isNaN(dt)) return;
        const key = `${dt.getMonth() + 1}/${dt.getFullYear()}`;
        if (!agrupado[key]) {
          agrupado[key] = { name: key, total: 0, quantidade: 0 };
        }
        agrupado[key].total += total;
        agrupado[key].quantidade += 1;
      });

      const arr = Object.values(agrupado).sort((a, b) => {
        const [d1, m1, y1] = a.name.split("/").map(Number);
        const [d2, m2, y2] = b.name.split("/").map(Number);
        const dateA = new Date(y1, m1 - 1, d1);
        const dateB = new Date(y2, m2 - 1, d2);
        return dateA - dateB;
      });

      arr.forEach((d) => {
        d.total = Number(d.total.toFixed(2));
      });

      setDadosMensais(arr);
      setLoading(false);
    }

    fetchDados();
  }, []);

  if (loading) {
    return (
      <div className="container my-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2">Carregando dados de pedidos…</p>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4" 
     style={{
        zIndex: 2,
        paddingTop: "80px",
      }}>
      <h2 className="mb-4">Histórico de Pedidos & Gastos Mensais</h2>

      {dadosMensais.length === 0 ? (
        <div className="alert alert-info">
          Nenhum pedido encontrado. Faça pelo menos um pedido para gerar o gráfico.
        </div>
      ) : (
        <>
          <div className="mb-5" style={{ width: "100%", height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={dadosMensais} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  if (name === "total") return `R$ ${value.toFixed(2)}`;
                  return `${value} pedido(s)`;
                }} />
                <Legend verticalAlign="top" />
                <Bar yAxisId="left" dataKey="quantidade" name="Qtd. Pedidos" fill="#0d6efd" />
                <Bar yAxisId="right" dataKey="total" name="Total Gasto (R$)" fill="#198754" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h5 className="mb-3">Resumo Mensal</h5>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-light">
                <tr>
                  <th>Mês/Ano</th>
                  <th className="text-center">Qtd. Pedidos</th>
                  <th className="text-end">Total Gasto (R$)</th>
                </tr>
              </thead>
              <tbody>
                {dadosMensais.map(({ name, quantidade, total }) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="text-center">{quantidade}</td>
                    <td className="text-end">{total.toFixed(2).replace(".", ",")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
