import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

export default function MercadosAtivosGlobal({ onSelecionar }) {
  const [mercados, setMercados] = useState([]);

  useEffect(() => {
    const mercadosRef = ref(db, "mercados");
    const off = onValue(mercadosRef, (snap) => {
      const data = snap.val() || {};
      const ativos = Object.entries(data)
        .filter(([id, v]) => v.ofertas)
        .map(([id, v]) => ({
          id,
          nome: v.nome || "Mercado",
          rua: v.rua || "",
          estado: v.estado || "",
          pais: v.pais || "",
        }));
      setMercados(ativos);
    });
    return () => off();
  }, []);

  if (mercados.length === 0)
    return <div className="mb-3">Nenhum mercado com ofertas ainda.</div>;

  return (
    <ul className="list-group mb-3">
      {mercados.map((m) => (
        <li
          className="list-group-item list-group-item-info"
          style={{ cursor: "pointer" }}
          key={m.id}
          onClick={() => onSelecionar(m)}
        >
          <strong>{m.nome}</strong>
          <br />
          {m.rua} {m.estado} {m.pais}
        </li>
      ))}
    </ul>
  );
}
