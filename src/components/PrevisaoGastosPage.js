// src/components/PrevisaoGastosPage.js
import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { ref, get } from "firebase/database";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function PrevisaoGastosPage() {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistorico() {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      // Supondo que você salve cada carrinho em: `usuarios/{uid}/carts/{cartId}` com `criadoEm` e `items`
      const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
      const snap = await get(cartsRef);
      const dados = snap.val() || {};
      // Convertendo em um array de { data: timestamp, total: número }
      const arr = Object.entries(dados).map(([id, cart]) => {
        const total = (cart.items || []).reduce(
          (soma, it) => soma + Number(it.price),
          0
        );
        return { criadoEm: cart.criadoEm, total };
      });
      // Ordena por data crescente
      arr.sort((a, b) => a.criadoEm - b.criadoEm);

      // Formata para a biblioteca Recharts: [{ name: "2023-05-01", total: 123.45 }, ...]
      const pontos = arr.map((c) => ({
        name: new Date(c.criadoEm).toLocaleDateString("pt-BR"),
        total: Number(c.total.toFixed(2)),
      }));
      setHistorico(pontos);
      setLoading(false);
    }
    fetchHistorico();
  }, []);

  if (loading) {
    return (
      <div className="container my-5">
        <p>Carregando histórico de gastos...</p>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4">
      <h2 className="mb-4">Previsão de Gastos Mensal</h2>
      {historico.length === 0 ? (
        <div className="alert alert-info">
          Nenhum histórico de carrinho encontrado. Salve pelo menos um carrinho para ver gráfico.
        </div>
      ) : (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={historico} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
              <XAxis dataKey="name" stroke="#555" />
              <YAxis stroke="#555" />
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Line type="monotone" dataKey="total" stroke="#198754" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-3 text-muted">
        O gráfico acima mostra o total gasto em cada carrinho salvo. Use essa informação para planejar seu orçamento mensal.
      </p>
    </div>
  );
}
