import React, { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";

export default function FavoritosPage({ user, onVoltar }) {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("az");

  useEffect(() => {
    if (!user) return;
    const favRef = ref(db, `usuarios/${user.uid}/favoritos`);
    const unsubscribe = onValue(
      favRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const lista = Object.entries(data).map(([id, obj]) => ({
          id,
          ...obj,
        }));
        setFavoritos(lista);
        setLoading(false);
      },
      () => {
        setFavoritos([]);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = [...favoritos];
    if (term) {
      arr = arr.filter((f) => {
        const nome = String(f.nome || "").toLowerCase();
        const endereco = [
          f.rua ?? "",
          f.bairro ?? "",
          f.cidade ?? "",
          f.estado ?? "",
          f.pais ?? "",
          f.endereco ?? "",
          f.cep ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return nome.includes(term) || endereco.includes(term);
      });
    }
    if (sort === "az") {
      arr.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")));
    } else if (sort === "za") {
      arr.sort((a, b) => String(b.nome || "").localeCompare(String(a.nome || "")));
    } else if (sort === "recent") {
      arr.sort((a, b) => (b.adicionadoEm || 0) - (a.adicionadoEm || 0));
    }
    return arr;
  }, [favoritos, q, sort]);

  const initials = (name = "") => {
    const parts = String(name).trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("");
  };

  const colorFromId = (id = "") => {
    let h = 0;
    for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 360;
    return `hsl(${h}, 70%, 45%)`;
  };

  const toMapUrl = (fav) => {
    const { lat, lon, nome, rua, estado, pais, endereco } = fav || {};
    if (lat != null && lon != null) return `https://www.google.com/maps?q=${lat},${lon}`;
    const q = [nome, rua, estado, pais, endereco].filter(Boolean).join(" ");
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  };

  const handleRemove = async (marketId, nome) => {
    if (!user) return;
    const res = await Swal.fire({
      title: "Remover dos favoritos?",
      text: `Deseja remover ${nome || "este mercado"} dos seus favoritos?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc3545",
    });
    if (!res.isConfirmed) return;
    try {
      await remove(ref(db, `usuarios/${user.uid}/favoritos/${marketId}`));
      Swal.fire("Removido!", "Favorito removido com sucesso.", "success");
    } catch {
      Swal.fire("Erro", "Não foi possível remover agora.", "error");
    }
  };

  if (!user) {
    return (
      <div className="container my-5 px-3 px-md-4" style={{ paddingTop: 70 }}>
        <div className="alert alert-warning text-center">
          Você precisa estar logado para ver seus favoritos.
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4" style={{ zIndex: 2, paddingTop: 70 }}>
      <style>{`
        .fav-header {
          position: sticky;
          top: 70px;
          z-index: 3;
          background: linear-gradient(135deg,#ffffff, #f8fafc);
          border: 1px solid #eef2f7;
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 6px 20px rgba(16,24,40,.04);
          margin-bottom: 18px;
        }
        .fav-card {
          border: 1px solid #eef2f7;
          border-radius: 16px;
          box-shadow: 0 6px 18px rgba(16,24,40,.06);
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .fav-card:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(16,24,40,.10); }
        .avatar-circle {
          width: 48px; height: 48px; border-radius: 50%;
          display:flex; align-items:center; justify-content:center;
          font-weight:700; color:#fff;
        }
        .chip {
          display:inline-block; padding:4px 8px; border-radius:999px;
          font-size:.75rem; background:#f1f5f9; color:#334155; border:1px solid #e2e8f0;
        }
        .skeleton {
          position: relative; overflow: hidden; background: #eaeef3;
        }
        .skeleton::after {
          content: ""; position: absolute; inset: 0;
          transform: translateX(-100%);
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.55) 50%, rgba(255,255,255,0) 100%);
          animation: shimmer 1.6s infinite;
        }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
      `}</style>

      <div className="fav-header">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={onVoltar}
            type="button"
          >
            &larr; Voltar
          </button>
          <div className="d-flex align-items-center ms-auto gap-2" style={{ flex: 1, minWidth: 260 }}>
            <div className="input-group">
              <span className="input-group-text">
                <i className="fa-regular fa-heart"></i>
              </span>
              <input
                className="form-control"
                placeholder="Buscar por nome, endereço, CEP..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="form-select w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Ordenar"
            >
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
              <option value="recent">Mais recentes</option>
            </select>
          </div>
        </div>
      </div>

      <h2 className="mb-2 d-flex align-items-center gap-2">
        <i className="fa-solid fa-star text-warning"></i> Meus Favoritos
      </h2>
      <p className="text-muted mb-4">Gerencie seus mercados salvos e abra no mapa quando quiser.</p>

      {loading ? (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="col" key={i}>
              <div className="fav-card card h-100">
                <div className="card-body">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="avatar-circle skeleton" />
                    <div className="flex-grow-1">
                      <div className="skeleton" style={{ height: 14, width: "70%", borderRadius: 6 }} />
                      <div className="skeleton mt-2" style={{ height: 12, width: "45%", borderRadius: 6 }} />
                    </div>
                  </div>
                  <div className="skeleton" style={{ height: 12, width: "85%", borderRadius: 6 }} />
                  <div className="skeleton mt-2" style={{ height: 36, width: "100%", borderRadius: 10 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5">
          <div
            className="mx-auto mb-3 d-flex align-items-center justify-content-center"
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "#fff7ed",
              border: "1px solid #ffedd5",
              color: "#fb923c",
              fontSize: 28,
            }}
          >
            <i className="fa-regular fa-heart"></i>
          </div>
          <h5 className="mb-2">Nenhum favorito por aqui…</h5>
          <p className="text-muted mb-4">Comece marcando mercados para acessar mais rápido depois.</p>
          <button
            className="btn btn-primary"
            onClick={onVoltar}
            type="button"
          >
            Explorar mercados
          </button>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {filtered.map((fav) => {
            const nome = fav.nome || "Mercado";
            const addrParts = [
              fav.rua ?? "",
              fav.bairro ?? "",
              fav.cidade ?? "",
              fav.estado ?? "",
              fav.pais ?? "",
            ].filter(Boolean);
            const addr = addrParts.join(", ") || fav.endereco || "";
            const cep = fav.cep || "";
            const circleBg = colorFromId(fav.id);
            return (
              <div className="col" key={fav.id}>
                <div className="fav-card card h-100">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center gap-3 mb-2">
                      <div className="avatar-circle" style={{ background: circleBg }}>
                        {initials(nome)}
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="card-title mb-1" title={nome} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nome}
                        </h5>
                        {addr ? (
                          <div className="text-muted" style={{ fontSize: ".925rem" }}>
                            <i className="fa-regular fa-map me-1"></i>
                            {addr}
                          </div>
                        ) : (
                          <div className="text-muted" style={{ fontSize: ".9rem" }}>
                            <i className="fa-regular fa-map me-1"></i>
                            Endereço não informado
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {cep && <span className="chip">CEP {cep}</span>}
                      {fav.estado && <span className="chip">UF {fav.estado}</span>}
                      {fav.distanciaKm && <span className="chip">{Number(fav.distanciaKm).toFixed(2)} km</span>}
                    </div>

                    <div className="mt-auto d-flex gap-2">
                      <a
                        className="btn btn-outline-primary flex-fill"
                        href={toMapUrl(fav)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="fa-regular fa-location-dot me-1"></i>
                        Abrir no mapa
                      </a>
                      <button
                        className="btn btn-outline-danger"
                        onClick={() => handleRemove(fav.id, nome)}
                        type="button"
                        title="Remover dos Favoritos"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
