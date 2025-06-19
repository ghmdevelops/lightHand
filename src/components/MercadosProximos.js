// src/components/BuscarMercadosOSM.js
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ← importa useNavigate
import OfertasMercado from "./OfertasMercado";
import MercadosAtivosGlobal from "./MercadosAtivosGlobal";
import ProdutosPage from "./ProdutosPage";
import {
  faStore,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

export default function BuscarMercadosOSM({ user }) {
  const [mercados, setMercados] = useState([]);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pos, setPos] = useState(null);
  const [localInfo, setLocalInfo] = useState({ rua: "", estado: "", pais: "" });
  const [mercadoSelecionado, setMercadoSelecionado] = useState(null);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [favoritos, setFavoritos] = useState(new Set());
  const [mostrarOfertasUsuarios, setMostrarOfertasUsuarios] = useState(false);

  const navigate = useNavigate(); // ← inicializa navigate

  // Carrega favoritos do usuário
  useEffect(() => {
    if (!user) {
      setFavoritos(new Set());
      return;
    }
    const favRef = ref(db, `usuarios/${user.uid}/favoritos`);
    get(favRef)
      .then((snap) => {
        const data = snap.val() || {};
        setFavoritos(new Set(Object.keys(data)));
      })
      .catch(() => {
        setFavoritos(new Set());
      });
  }, [user]);

  // Função helper para endereço reverso
  const getEnderecoFromCoords = async (lat, lon) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`
      );
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      return {
        rua: data.address.road || "",
        estado: data.address.state || "",
        pais: data.address.country || "",
      };
    } catch {
      return { rua: "Não disponível", estado: "", pais: "" };
    }
  };

  // Busca mercados próximos via Overpass
  const handleBuscar = async () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        setPos({ lat, lon });

        // Busca endereço reverso
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`
        )
          .then((res) => res.json())
          .then((data) => {
            setLocalInfo({
              rua:
                data.address.road ||
                data.address.pedestrian ||
                data.address.cycleway ||
                data.address.footway ||
                data.address.path ||
                data.address.street ||
                data.display_name ||
                "Não encontrado",
              estado:
                data.address.state || data.address.region || "Não encontrado",
              pais: data.address.country || "Não encontrado",
            });
          });

        const delta = 0.03; // ~3km
        const url = `https://overpass-api.de/api/interpreter?data=[out:json];node["shop"~"supermarket|convenience|grocery"](${
          lat - delta
        },${lon - delta},${lat + delta},${lon + delta});out;`;

        fetch(url)
          .then((res) => res.json())
          .then(async (data) => {
            const primeiros = data.elements.slice(0, 5);
            const listaMercados = await Promise.all(
              primeiros.map(async (m) => {
                const endereco = await getEnderecoFromCoords(m.lat, m.lon);
                return {
                  id: m.id,
                  nome: m.tags.name || "Mercado",
                  tipo: m.tags.shop,
                  brand: m.tags.brand || "",
                  lat: m.lat,
                  lon: m.lon,
                  ...endereco,
                };
              })
            );
            setMercados(listaMercados);
            setBuscando(false);
          })
          .catch(() => {
            setErro("Não foi possível buscar mercados.");
            setBuscando(false);
          });
      },
      () => {
        setErro("Permita o acesso à localização.");
        setBuscando(false);
      }
    );
  };

  const toggleFavorito = async (market) => {
    if (!user) return;
    const favRef = ref(db, `usuarios/${user.uid}/favoritos/${market.id}`);
    if (favoritos.has(market.id)) {
      await remove(favRef);
      setFavoritos((prev) => {
        const nova = new Set(prev);
        nova.delete(market.id);
        return nova;
      });
    } else {
      await set(favRef, {
        nome: market.nome,
        tipo: market.tipo,
        rua: market.rua,
        estado: market.estado,
        pais: market.pais,
      });
      setFavoritos((prev) => new Set(prev).add(market.id));
    }
  };

  const registrarVisitaEVerOfertas = async (market) => {
    if (user) {
      const visitRef = ref(db, `usuarios/${user.uid}/visitados/${market.id}`);
      await set(visitRef, {
        nome: market.nome,
        rua: market.rua,
        estado: market.estado,
        pais: market.pais,
        timestamp: Date.now(),
      });
    }
    setMercadoSelecionado(market);
  };

  if (mercadoSelecionado) {
    return (
      <OfertasMercado
        mercado={mercadoSelecionado}
        user={user}
        onVoltar={() => setMercadoSelecionado(null)}
      />
    );
  }

  if (mostrarCarrinho) {
    return <ProdutosPage onVoltar={() => setMostrarCarrinho(false)} />;
  }

  return (
    <div className="container my-5 px-2 px-md-4">
      <div className="d-flex justify-content-end mb-3">
        <button
          className="btn btn-outline-primary btn-lg me-2"
          onClick={() => navigate("/produtores")}
          style={{
            borderRadius: 30,
            fontWeight: 600,
            letterSpacing: 1,
            background: "transparent",
            border: "2px solid #198754",
            color: "#198754",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#198754";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#198754";
          }}
        >
          <i className="fa-solid fa-seedling me-2"></i> Marketplace Local
          orgânicos
        </button>
      </div>

      <div className="text-center mb-5">
        <button
          className="btn btn-success btn-x px-5 py-3 my-3"
          onClick={handleBuscar}
          disabled={buscando}
          style={{
            borderRadius: 40,
            fontWeight: 700,
            fontSize: "1.15rem",
            background: "linear-gradient(135deg, #1abc9c 0%, #198754 100%)",
            border: "none",
            boxShadow: "0 8px 30px rgba(26, 188, 156, 0.3)",
          }}
        >
          <FontAwesomeIcon icon={faStore} style={{ fontSize: "1.2rem" }} />
          {buscando ? "Buscando..." : "Buscar Mercados"}
        </button>

        <button
          className="btn btn-success btn-xl px-5 py-3 my-3"
          onClick={() => setMostrarCarrinho(true)}
          style={{
            borderRadius: 30,
            fontWeight: 600,
            letterSpacing: 1.2,
            background: "linear-gradient(135deg, #198754dd 0%, #1abc9cbb 100%)",
            border: "none",
            boxShadow: "0 6px 20px rgba(25, 135, 84, 0.3)",
          }}
        >
          <FontAwesomeIcon icon={faStore} style={{ marginRight: 8 }} />
          Montar Carrinho
        </button>
      </div>

      {pos && (
        <div
          className="alert mb-5 p-4"
          style={{
            background:
              "linear-gradient(135deg, rgba(25,135,84,0.1) 0%, rgba(26,188,156,0.1) 100%)",
            borderRadius: 12,
            border: "1px solid #19875433",
            fontSize: "0.95rem",
          }}
        >
          <h6 className="mb-3" style={{ fontWeight: 600 }}>
            Sua localização atual:
          </h6>
          <div className="row gx-2">
            <div className="col-6 col-md-3">
              <strong>Latitude:</strong> {pos.lat.toFixed(6)}
            </div>
            <div className="col-6 col-md-3">
              <strong>Longitude:</strong> {pos.lon.toFixed(6)}
            </div>
            <div className="col-12 col-md-6">
              <strong>Endereço:</strong>{" "}
              {[localInfo.rua, localInfo.estado, localInfo.pais]
                .filter((s) => s)
                .join(", ")}
            </div>
          </div>
        </div>
      )}

      <h5
        className="mb-3 d-flex align-items-center"
        style={{ fontWeight: 600, cursor: "pointer", userSelect: "none" }}
        onClick={() => setMostrarOfertasUsuarios((prev) => !prev)}
      >
        <span style={{ marginRight: "8px" }}>
          Mercados com ofertas de usuários
        </span>
        <span style={{ fontSize: "1.2rem", color: "#198754" }}>
          {mostrarOfertasUsuarios ? "▼" : "▲"}
        </span>
      </h5>
      {mostrarOfertasUsuarios && (
        <MercadosAtivosGlobal onSelecionar={setMercadoSelecionado} />
      )}

      <hr className="my-5" />

      <h5 className="mb-4" style={{ fontWeight: 600 }}>
        Mercados próximos
      </h5>
      {erro && (
        <div
          className="alert alert-warning mb-4 text-center"
          style={{ borderRadius: 12 }}
        >
          {erro}
        </div>
      )}

      {buscando && (
        <div className="text-center my-5">
          <div
            className="spinner-border text-success"
            role="status"
            style={{ width: 80, height: 80 }}
          >
            <span className="visually-hidden">Buscando...</span>
          </div>
          <div className="mt-3" style={{ fontSize: "1.1rem" }}>
            Carregando mercados próximos…
          </div>
        </div>
      )}

      {!buscando && mercados.length > 0 && (
        <div className="row gy-4">
          {mercados.map((m) => (
            <div key={m.id} className="col-12 col-md-6 col-lg-4">
              <div
                className="card h-100 shadow-lg border-0"
                style={{
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.03)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 30px rgba(0, 0, 0, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  className="card-body d-flex flex-column"
                  style={{ padding: "1.25rem" }}
                >
                  <div className="d-flex align-items-center mb-3">
                    {m.brand ? (
                      <div
                        className="d-flex justify-content-center align-items-center me-3"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "#198754",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "1.2rem",
                        }}
                      >
                        {m.brand.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div
                        className="d-flex justify-content-center align-items-center me-3"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "#ddd",
                          color: "#555",
                          fontSize: "1.2rem",
                        }}
                      >
                        <FontAwesomeIcon icon={faStore} />
                      </div>
                    )}

                    <div className="flex-grow-1">
                      <h5
                        className="card-title mb-1"
                        style={{ fontSize: "1.15rem", fontWeight: 600 }}
                      >
                        {m.nome}
                      </h5>
                      {m.brand && (
                        <small
                          className="text-muted"
                          style={{ fontSize: "0.9rem" }}
                        >
                          ({m.brand})
                        </small>
                      )}
                    </div>

                    {/* Ícone de “favorito” */}
                    <button
                      className="btn p-0 ms-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorito(m);
                      }}
                      title={
                        favoritos.has(m.id)
                          ? "Remover dos favoritos"
                          : "Adicionar aos favoritos"
                      }
                      style={{
                        fontSize: "1.2rem",
                        color: favoritos.has(m.id) ? "#dc3545" : "#aaa",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!favoritos.has(m.id))
                          e.currentTarget.style.color = "#dc3545";
                      }}
                      onMouseLeave={(e) => {
                        if (!favoritos.has(m.id))
                          e.currentTarget.style.color = "#aaa";
                      }}
                    >
                      <FontAwesomeIcon
                        icon={
                          favoritos.has(m.id) ? faHeartSolid : faHeartRegular
                        }
                      />
                    </button>
                  </div>

                  <p
                    className="card-text flex-grow-1"
                    style={{ fontSize: "0.925rem", lineHeight: 1.45 }}
                  >
                    <strong>Categoria:</strong> {m.tipo} <br />
                    <strong>Endereço:</strong>{" "}
                    {[m.rua, m.estado, m.pais].filter((s) => s).join(", ")}
                  </p>

                  {/* Botão “Ver Ofertas” */}
                  <div className="mt-auto">
                    <button
                      className="btn btn-outline-success w-100"
                      style={{
                        borderRadius: "30px",
                        fontWeight: 600,
                        transition: "background 0.2s, color 0.2s",
                      }}
                      onClick={() => registrarVisitaEVerOfertas(m)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#198754";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#198754";
                      }}
                    >
                      Ver Ofertas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!buscando && mercados.length === 0 && !erro && (
        <div
          className="alert alert-info mt-5 text-center"
          style={{
            borderRadius: 12,
            fontSize: "1rem",
            background: "#f0f7f5",
            color: "#198754",
          }}
        >
          Nenhum mercado próximo encontrado.
        </div>
      )}
    </div>
  );
}
