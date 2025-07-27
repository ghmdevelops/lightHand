import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, get, update } from "firebase/database";

export default function PassaportePage({ user, onVoltar }) {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conquistas, setConquistas] = useState([]);
  const [expandidoIds, setExpandidoIds] = useState([]);

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
        const arr = Object.entries(data).map(([id, info]) => ({
          id,
          ...info,
        }));
        setPedidos(arr);

        const novasConqs = [];

        if (arr.length >= 1) novasConqs.push("ClienteIniciante");
        if (arr.length >= 5) novasConqs.push("ClienteFiel");
        if (arr.length >= 10) novasConqs.push("CompradorAssíduo");
        if (arr.length >= 20) novasConqs.push("ClienteVIP");
        if (arr.length >= 30) novasConqs.push("ClientePremium");

        setConquistas(novasConqs);

        if (novasConqs.length > 0) {
          const updates = {};
          novasConqs.forEach((badge) => {
            updates[`usuarios/${user.uid}/conquistas/${badge}`] = true;
          });
          update(ref(db), updates).catch((err) => {
            console.error("Erro ao salvar conquistas:", err);
          });
        }
      })
      .catch((err) => {
        console.error("Erro ao ler 'pedidos':", err);
        setPedidos([]);
        setConquistas([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const toggleExpandir = (id) => {
    setExpandidoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const extrairIniciais = (nome) => {
    if (!nome) return "";
    return nome
      .split(" ")
      .map((w) => w.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Função para capitalizar cada palavra do nome
  const tituloCapitalizado = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((palavra) => palavra[0].toUpperCase() + palavra.slice(1))
      .join(" ");
  };

  // Limitar string a n caracteres com "..."
  const limitarTexto = (texto, max = 30) =>
    texto.length > max ? texto.slice(0, max - 3) + "..." : texto;

  return (
    <div
      className="container my-5 px-3 px-md-4"
      style={{
        zIndex: 2,
        paddingTop: "90px",
      }}
    >
      <h2 className="mb-4">Conquistas</h2>

      {!loading && pedidos.length > 0 && (
        <div className="mb-4">
          <h5>Seu Nível Atual</h5>
          {conquistas.length === 0 ? (
            <div className="mb-2">Sem conquistas ainda</div>
          ) : (
            <ul>
              {conquistas.map((badge) => (
                <li key={badge} style={{ fontSize: "1rem" }}>
                  {badge === "ClienteIniciante"
                    ? "🛒 Cliente Iniciante (fez 1 pedido)"
                    : null}
                  {badge === "ClienteFiel"
                    ? "🏅 Cliente Fiel (fez 5 pedidos)"
                    : null}
                  {badge === "CompradorAssíduo"
                    ? "🎖 Comprador Assíduo (fez 10 pedidos)"
                    : null}
                  {badge === "ClienteVIP" && "🎉 Cliente VIP (fez 20 pedidos)"}
                  {badge === "ClientePremium" && "👑 Cliente Premium (fez 30 pedidos)"}
                </li>
              ))}
            </ul>
          )}

          {conquistas.indexOf("ClienteFiel") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já fez <strong>{pedidos.length}</strong> de 5 pedidos para obter a badge “Cliente Fiel”.
            </div>
          )}
          {conquistas.indexOf("CompradorAssíduo") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já fez <strong>{pedidos.length}</strong> de 10 pedidos para obter a badge “Comprador Assíduo”.
            </div>
          )}
          {conquistas.indexOf("ClienteVIP") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já fez <strong>{pedidos.length}</strong> de 20 pedidos para obter a badge “Cliente VIP”.
            </div>
          )}
          {conquistas.indexOf("ClientePremium") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já fez <strong>{pedidos.length}</strong> de 30 pedidos para obter a badge “Cliente Premium”.
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div>Carregando passaporte…</div>
      ) : pedidos.length === 0 ? (
        <div className="alert alert-info">
          Você ainda não fez nenhum pedido.
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 mb-4">
          {pedidos.slice(0, 30).map((p) => {
            const estaExpandido = expandidoIds.includes(p.id);

            const totalItens = p.itens
              ? p.itens.reduce((acc, item) => acc + (item.quantidade || 1), 0)
              : 0;

            const endereco = p.endereco || {};
            const cep = endereco.cep || "N/A";
            const numero = endereco.numero || "";
            const rua = endereco.rua || "";

            const dataFormatada = p.dataHora
              ? new Date(p.dataHora).toLocaleString("pt-BR")
              : "";

            const iniciais = extrairIniciais(p.mercadoNome);
            const nomeLegal = limitarTexto(tituloCapitalizado(p.mercadoNome));

            return (
              <div key={p.id} className="col">
                <div
                  className="card h-100 border-0 shadow-sm passaporte-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleExpandir(p.id)}
                >
                  {/* Selo / carimbo no canto superior direito */}
                  <div className="passaporte-stamp">
                    <i className="fa-solid fa-stamp"></i> Entregue
                  </div>

                  <div className="card-body d-flex flex-column align-items-center text-center">
                    <div
                      className="mb-3 d-flex justify-content-center align-items-center"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#2F539B",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.5rem",
                        userSelect: "none",
                      }}
                    >
                      {iniciais || "XX"}
                    </div>

                    <h6 className="card-title">
                      Pedido #{p.id.slice(0, 6)} - {nomeLegal || "Desconhecido"}
                    </h6>

                    {estaExpandido ? (
                      <div className="mt-3 text-start w-100">
                        <p className="mb-1">
                          <strong>Data:</strong> {dataFormatada}
                        </p>
                        <p className="mb-1">
                          <strong>Endereço:</strong> {numero} - CEP: {cep}
                        </p>
                        <p className="mb-1">
                          <strong>Total de Itens:</strong> {totalItens}
                        </p>
                        <p className="mb-1">
                          <strong>Valor Total:</strong> R${" "}
                          {Number(p.total).toFixed(2).replace(".", ",")}
                        </p>
                      </div>
                    ) : (
                      <small className="text-muted mt-auto">Clique para ver detalhes</small>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {conquistas.length > 0 && (
        <div className="mb-4">
          <h5>Conquistas Alcançadas</h5>
          <ul>
            {conquistas.map((badge) => (
              <li key={badge} style={{ fontSize: "0.95rem" }}>
                {badge === "ClienteIniciante"
                  ? "🛒 Cliente Iniciante (fez 1 pedido)"
                  : null}
                {badge === "ClienteFiel"
                  ? "🏅 Cliente Fiel (fez 5 pedidos)"
                  : null}
                {badge === "CompradorAssíduo"
                  ? "🎖 Comprador Assíduo (fez 10 pedidos)"
                  : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center mt-5">
        <button
          className="btn btn-outline-secondary"
          onClick={onVoltar}
          style={{ borderRadius: "20px", fontWeight: 500, letterSpacing: 0.5 }}
        >
          &larr; Voltar
        </button>
      </div>
    </div>
  );
}
