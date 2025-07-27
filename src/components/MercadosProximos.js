import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OfertasMercado from "./OfertasMercado";
import MercadosAtivosGlobal from "./MercadosAtivosGlobal";
import ProdutosPage from "./ProdutosPage";
import {
  faStore,
  faHeart as faHeartSolid,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { FiMapPin } from "react-icons/fi";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapMarkerAlt, faKeyboard } from "@fortawesome/free-solid-svg-icons";

import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

export default function BuscarMercadosOSM({ user }) {
  const [modoBusca, setModoBusca] = useState(null); // "local" | "cep" | null
  const [mercados, setMercados] = useState([]);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pos, setPos] = useState(null);
  const [localInfo, setLocalInfo] = useState({ rua: "", estado: "", pais: "" });
  const [mercadoSelecionado, setMercadoSelecionado] = useState(null);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [favoritos, setFavoritos] = useState(new Set());
  const [mostrarOfertasUsuarios, setMostrarOfertasUsuarios] = useState(false);
  const navigate = useNavigate();
  const [cep, setCep] = useState("");
  const [erroCep, setErroCep] = useState("");

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

  const buscarMercadosProximos = async (lat, lon) => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });

    setPos({ lat, lon });

    const enderecoData = await getEnderecoFromCoords(lat, lon);
    setLocalInfo(enderecoData);

    const delta = 0.03; // ~3km
    const url = `https://overpass-api.de/api/interpreter?data=[out:json];node["shop"~"supermarket|convenience|grocery"](${lat - delta
      },${lon - delta},${lat + delta},${lon + delta});out;`;

    try {
      const res = await fetch(url);
      const data = await res.json();
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
    } catch {
      setErro("Não foi possível buscar mercados.");
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscarLocalizacao = () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });

    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        await buscarMercadosProximos(lat, lon);
      },
      () => {
        setErro("Permita o acesso à localização.");
        setBuscando(false);
      }
    );
  };

  const buscarCoordsPorCEP = async (cep) => {
    try {
      setErroCep("");

      const respCep = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!respCep.ok) throw new Error("CEP inválido");
      const dataCep = await respCep.json();
      if (dataCep.erro) throw new Error("CEP não encontrado");

      const endereco = `${dataCep.logradouro}, ${dataCep.localidade}, ${dataCep.uf}, Brasil`;

      const respCoords = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          endereco
        )}&format=json&limit=1&addressdetails=1&accept-language=pt`
      );
      if (!respCoords.ok) throw new Error("Erro ao buscar coordenadas");
      const dataCoords = await respCoords.json();
      if (dataCoords.length === 0) throw new Error("Coordenadas não encontradas");

      return {
        lat: parseFloat(dataCoords[0].lat),
        lon: parseFloat(dataCoords[0].lon),
      };
    } catch (error) {
      setErroCep(error.message || "Erro ao buscar CEP");
      return null;
    }
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

  if (!modoBusca) {
    return (
      <div className="container text-center mt-5" style={{
        zIndex: 2,
        paddingTop: "60px",
      }}>
        <h3 className="fw-bold mb-4 text-primary">
          Vamos localizar mercados próximos! Como quer fazer isso?
        </h3>

        <div className="d-flex justify-content-center gap-4 flex-wrap" style={{ maxWidth: 500, margin: "0 auto" }}>
          <button
            type="button"
            className="btn btn-primary btn-lg d-flex align-items-center gap-3 px-5 shadow"
            style={{
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              boxShadow: "0 4px 15px rgb(59 130 246 / 0.5)",
              transition: "transform 0.2s ease",
            }}
            onClick={() => {
              setModoBusca("local");
              handleBuscarLocalizacao();
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <FontAwesomeIcon icon={faMapMarkerAlt} size="lg" />
            Usar minha localização
          </button>

          <button
            type="button"
            className="btn btn-outline-primary btn-lg d-flex align-items-center gap-3 px-5 shadow-sm mb-3"
            style={{
              borderRadius: "12px",
              fontWeight: 600,
              transition: "transform 0.2s ease, background-color 0.3s ease",
            }}
            onClick={() => setModoBusca("cep")}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = "#e0e7ff";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <FontAwesomeIcon icon={faKeyboard} size="lg" />
            Digitar CEP
          </button>
        </div>
      </div>
    );
  }

  if (mercadoSelecionado) {
    return (
      <OfertasMercado
        mercado={mercadoSelecionado}
        user={user}
        onVoltar={() => setMercadoSelecionado(null)}
      />
    );
  }

  // Se mostrar carrinho
  if (mostrarCarrinho) {
    return <ProdutosPage onVoltar={() => setMostrarCarrinho(false)} />;
  }

  // Modo busca por CEP
  if (modoBusca === "cep") {
    return (
      <div className="container my-5 px-2 px-md-4">
        <button
          className="btn btn-link mb-4"
          onClick={() => {
            setModoBusca(null);
            setMercados([]);
            setErro("");
            setCep("");
            setErroCep("");
            setPos(null);
            setLocalInfo({ rua: "", estado: "", pais: "" });
          }}
        >
          ← Voltar
        </button>

        <div className="mb-4 text-center">
          <input
            type="text"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="Digite o CEP (somente números)"
            maxLength={9}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "1rem",
              borderRadius: 10,
              border: "1px solid #195f87ff",
              width: "200px",
              textAlign: "center",
              marginRight: "0.5rem",
            }}
          />
          <button
            className="btn btn-primary"
            onClick={async () => {
              const cepLimpo = cep.replace(/\D/g, "");
              if (cepLimpo.length !== 8) {
                setErroCep("Digite um CEP válido com 8 números.");
                return;
              }
              setErro("");
              setBuscando(true);
              setMercados([]);
              setLocalInfo({ rua: "", estado: "", pais: "" });

              const coords = await buscarCoordsPorCEP(cepLimpo);
              if (!coords) {
                setBuscando(false);
                return;
              }
              await buscarMercadosProximos(coords.lat, coords.lon);
            }}
            style={{
              borderRadius: 30,
              padding: "0.5rem 1rem",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            <FiMapPin size={20} />
          </button>
          {erroCep && (
            <div
              className="text-danger mt-2"
              style={{ fontWeight: "600", fontSize: "0.9rem" }}
            >
              {erroCep}
            </div>
          )}
        </div>

        {pos && (
          <div
            className="shadow-sm mb-5 p-4"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(25, 135, 84, 0.3)",
              borderRadius: "16px",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              color: "#ADDFFF",
              boxShadow: "0 8px 24px rgba(25, 135, 84, 0.15)",
            }}
          >
            <h6
              className="mb-3 d-flex align-items-center"
              style={{ fontWeight: 700, color: "#000" }}
            >
              <i
                className="fa-solid fa-location-dot me-2"
                style={{ color: "#0059FF", fontSize: "1.2rem" }}
              ></i>
              Sua localização aproximada pelo CEP
            </h6>
            <div className="row gx-2">
              <div
                className="col-12 col-md-6"
                style={{ fontSize: "0.95rem", color: "#0059FF", fontWeight: 700 }}
              >
                <strong style={{ color: "#000" }}>Endereço: </strong>
                {[localInfo.rua, localInfo.estado, localInfo.pais]
                  .filter((s) => s)
                  .join(", ")}
              </div>
            </div>
          </div>
        )}

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
              className="spinner-border text-primary"
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
                    onClick={() => registrarVisitaEVerOfertas(m)}
                  >
                    <div className="d-flex align-items-center mb-3">
                      {m.brand ? (
                        <div
                          className="d-flex justify-content-center align-items-center me-3"
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: "50%",
                            background: "#0059FF",
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

                    <div className="mt-auto">
                      <button
                        className="btn btn-outline-primary w-100"
                        style={{
                          borderRadius: "30px",
                          fontWeight: 600,
                          transition: "background 0.2s, color 0.2s",
                        }}
                        onClick={() => registrarVisitaEVerOfertas(m)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#306EFF";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#306EFF";
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
              color: "#196a87ff",
            }}
          >
            Nenhum mercado próximo encontrado.
          </div>
        )}
      </div>
    );
  }

  // Modo busca por localização (modoBusca === "local")
  return (
    <div className="container my-5 px-2 px-md-4">
      <button
        className="btn btn-link mb-4"
        onClick={() => {
          setModoBusca(null);
          setMercados([]);
          setErro("");
          setCep("");
          setErroCep("");
          setPos(null);
          setLocalInfo({ rua: "", estado: "", pais: "" });
        }}
      >
        ← Voltar
      </button>

      {pos && (
        <div
          className="shadow-sm mb-5 p-4"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(25, 135, 84, 0.3)",
            borderRadius: "16px",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            color: "#ADDFFF",
            boxShadow: "0 8px 24px rgba(25, 135, 84, 0.15)",
          }}
        >
          <h6
            className="mb-3 d-flex align-items-center"
            style={{ fontWeight: 700, color: "#000" }}
          >
            <i
              className="fa-solid fa-location-dot me-2"
              style={{ color: "#0059FF", fontSize: "1.2rem" }}
            ></i>
            Sua localização aproximada
          </h6>
          <div className="row gx-2">
            <div
              className="col-12 col-md-6"
              style={{ fontSize: "0.95rem", color: "#0059FF", fontWeight: 700 }}
            >
              <strong style={{ color: "#000" }}>Endereço: </strong>
              {[localInfo.rua, localInfo.estado, localInfo.pais]
                .filter((s) => s)
                .join(", ")}
            </div>
          </div>
        </div>
      )}

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
            className="spinner-border text-primary"
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
                  onClick={() => registrarVisitaEVerOfertas(m)}
                >
                  <div className="d-flex align-items-center mb-3">
                    {m.brand ? (
                      <div
                        className="d-flex justify-content-center align-items-center me-3"
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "#0059FF",
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

                  <div className="mt-auto">
                    <button
                      className="btn btn-outline-primary w-100"
                      style={{
                        borderRadius: "30px",
                        fontWeight: 600,
                        transition: "background 0.2s, color 0.2s",
                      }}
                      onClick={() => registrarVisitaEVerOfertas(m)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#306EFF";
                        e.currentTarget.style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#306EFF";
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
            color: "#196a87ff",
          }}
        >
          Nenhum mercado próximo encontrado.
        </div>
      )}
    </div>
  );
}

