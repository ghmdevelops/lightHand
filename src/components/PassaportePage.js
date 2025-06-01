// src/components/PassaportePage.js
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, get, update } from "firebase/database";

export default function PassaportePage({ user, onVoltar }) {
  const [visitados, setVisitados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [conquistas, setConquistas] = useState([]);

  useEffect(() => {
    if (!user) {
      setVisitados([]);
      setConquistas([]);
      setLoading(false);
      return;
    }

    // 1) Busca "visitados" do usuário
    const visitRef = ref(db, `usuarios/${user.uid}/visitados`);
    get(visitRef)
      .then((snap) => {
        const data = snap.val() || {};
        // Converte em array e ordena por timestamp decrescente
        const arr = Object.entries(data)
          .map(([id, info]) => ({ id, ...info }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setVisitados(arr);

        // 2) Calcula progresso / conquistas
        const novasConqs = [];

        // Conquista "Explorer": >= 5 visitas totais
        if (arr.length >= 5) {
          novasConqs.push("Explorer");
        }
        // Conquista "TuristaUrbano": >= 3 estados distintos
        const estadosDiferentes = new Set(arr.map((m) => m.estado));
        if (estadosDiferentes.size >= 3) {
          novasConqs.push("TuristaUrbano");
        }

        setConquistas(novasConqs);

        // 3) Salva no Realtime DB apenas as novas conquistas como true
        if (novasConqs.length > 0) {
          const updates = {};
          novasConqs.forEach((badge) => {
            updates[`usuarios/${user.uid}/conquistas/${badge}`] = true;
          });
          // Marca apenas as conquistas atuais (não faz remoção de badges antigas aqui)
          update(ref(db), updates).catch((err) => {
            console.error("Erro ao salvar conquistas:", err);
          });
        }
      })
      .catch((err) => {
        console.error("Erro ao ler 'visitados':", err);
        setVisitados([]);
        setConquistas([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const totalVisitas = visitados.length;
  const estadosDistintosCount = new Set(visitados.map((m) => m.estado)).size;

  return (
    <div className="container my-5 px-3 px-md-4">
      {!loading && visitados.length > 0 && (
        <div className="mb-4">
          <h5>Seu Nível Atual:</h5>
          {conquistas.length === 0 ? (
            <div className="text-muted mb-2">Sem conquistas ainda</div>
          ) : (
            <ul>
              {conquistas.map((badge) => (
                <li key={badge} style={{ fontSize: "1rem" }}>
                  {badge === "Explorer"
                    ? "🏅 Explorer (visitou ≥ 5 mercados)"
                    : null}
                  {badge === "TuristaUrbano"
                    ? "🎖 Turista Urbano (visitou ≥ 3 estados diferentes)"
                    : null}
                </li>
              ))}
            </ul>
          )}
          {/* Progresso para próxima conquista */}
          {conquistas.indexOf("Explorer") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já visitou <strong>{totalVisitas}</strong> de 5 mercados para
              obter a badge “Explorer”.
            </div>
          )}
          {conquistas.indexOf("TuristaUrbano") === -1 && (
            <div style={{ fontSize: "0.95rem" }}>
              Você já visitou mercados em{" "}
              <strong>{estadosDistintosCount}</strong> de 3 estados diferentes
              para obter a badge “Turista Urbano”.
            </div>
          )}
        </div>
      )}

      <h2 className="mb-4">Passaporte de Mercados</h2>

      {loading ? (
        <div>Carregando passaporte…</div>
      ) : visitados.length === 0 ? (
        <div className="alert alert-info">
          Você ainda não visitou nenhum mercado.
        </div>
      ) : (
        <>
          {/* 2) Grid de cartões para cada mercado visitado */}
          <div className="row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3 mb-4">
            {visitados.map((m) => (
              <div key={m.id} className="col">
                <div className="card text-center h-100 border-0 shadow-sm passaporte-card">
                  {/* 2.1) Carimbo fixo no canto */}
                  <div className="passaporte-stamp">
                    <i className="fa-solid fa-stamp"></i>
                  </div>
                  <div className="card-body d-flex flex-column justify-content-center">
                    {/* 2.2) Círculo verde com iniciais */}
                    <div
                      className="mx-auto mb-3 d-flex justify-content-center align-items-center"
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        background: "#198754",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "1.5rem",
                      }}
                    >
                      {(
                        (m.nome || "XX")
                          .split(" ")
                          .map((w) => w.charAt(0))
                          .join("") || ""
                      )
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <h6
                      className="card-title mb-1"
                      style={{ fontSize: "1rem" }}
                    >
                      {m.nome}
                    </h6>
                    <small className="text-muted">
                      {m.rua}, {m.estado}
                    </small>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3) Lista de conquistas detalhada */}
          {conquistas.length > 0 && (
            <div className="mb-4">
              <h5>Conquistas Alcançadas</h5>
              <ul>
                {conquistas.map((badge) => (
                  <li key={badge} style={{ fontSize: "0.95rem" }}>
                    {badge === "Explorer"
                      ? "🏅 Explorer (visitou ≥ 5 mercados)"
                      : null}
                    {badge === "TuristaUrbano"
                      ? "🎖 Turista Urbano (visitou ≥ 3 estados diferentes)"
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* 4) Botão “Voltar” para retornar à tela anterior */}
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
