import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import OfertasMercado from "./OfertasMercado";
import ProdutosPage from "./ProdutosPage";
import {
  faStore,
  faHeart as faHeartSolid,
  faClock,
  faMapLocationDot,
  faCopy,
  faExternalLinkAlt,
  faCircleInfo,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiMapPin } from "react-icons/fi";
import opening_hours from "opening_hours";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

// util Haversine para distância (metros)
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lon2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // metros
}

// interpreta opening_hours com cache simples
const openingCache = new Map();
function getOpeningStatus(raw) {
  if (!raw) return { label: "Horário não disponível", isOpen: null };
  try {
    if (openingCache.has(raw)) return openingCache.get(raw);
    const oh = new opening_hours(raw);
    const isOpen = oh.getState();
    const nextChange = oh.getNextChange();
    let label;
    if (isOpen) {
      label = "Aberto agora";
      if (nextChange) {
        const until = new Date(nextChange).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        label += ` (até ${until})`;
      }
    } else {
      if (nextChange) {
        const opens = new Date(nextChange).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        label = `Fechado. Abre em ${opens}`;
      } else {
        label = "Fechado agora";
      }
    }
    const result = { label, isOpen };
    openingCache.set(raw, result);
    return result;
  } catch (err) {
    return { label: "Horário inválido", isOpen: null };
  }
}

// obtém posição mais precisa possível em até 5s (ou até precisão desejada)
function getAccuratePosition({ desiredAccuracy = 30, maxWait = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada"));
      return;
    }
    let best = null;
    const watchId = navigator.geolocation.watchPosition(
      (p) => {
        if (!best || p.coords.accuracy < best.coords.accuracy) {
          best = p;
        }
        if (p.coords.accuracy <= desiredAccuracy) {
          navigator.geolocation.clearWatch(watchId);
          resolve(p);
        }
      },
      (e) => {
        navigator.geolocation.clearWatch(watchId);
        if (best) resolve(best);
        else reject(e);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: maxWait,
      }
    );
    const timer = setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new Error("Não foi possível obter localização precisa"));
    }, maxWait + 100); // ligeiramente acima
  });
}

function MarketCard({
  market: m,
  user,
  onVisit,
  onToggleFavorito,
  isFavorited,
}) {
  const [expanded, setExpanded] = useState(false);
  const address = [m.rua, m.estado, m.pais].filter(Boolean).join(", ");
  const { label: openLabel, isOpen } = useMemo(
    () => getOpeningStatus(m.opening_hours),
    [m.opening_hours]
  );

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.info("Endereço copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const osmLink = `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`;
  const googleLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address || `${m.lat},${m.lon}`
  )}`;

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div
        className="card h-100 shadow-lg border-0"
        style={{
          borderRadius: "16px",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s",
          overflow: "hidden",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.02)";
          e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.17)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <div
          className="card-body d-flex flex-column"
          style={{ padding: "1.25rem" }}
          onClick={() => onVisit(m)}
        >
          <div className="d-flex align-items-start mb-2">
            <div className="me-3">
              {m.brand ? (
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#0059FF",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "1.2rem",
                  }}
                  aria-label="Avatar do mercado"
                >
                  {m.brand.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div
                  className="d-flex justify-content-center align-items-center"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#ddd",
                    color: "#555",
                    fontSize: "1.2rem",
                  }}
                  aria-label="Ícone do mercado"
                >
                  <FontAwesomeIcon icon={faStore} />
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between">
                <div>
                  <h5
                    className="card-title mb-1"
                    style={{ fontSize: "1.15rem", fontWeight: 600 }}
                  >
                    {m.nome}
                  </h5>
                  {m.brand && (
                    <small className="text-muted" style={{ fontSize: "0.85rem" }}>
                      ({m.brand})
                    </small>
                  )}
                </div>
                <div className="text-end">
                  <div style={{ fontSize: "0.7rem" }}>
                    {(m.distance / 1000).toFixed(2)} km
                  </div>
                  <button
                    className="btn p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorito(m);
                    }}
                    title={
                      isFavorited
                        ? "Remover dos favoritos"
                        : "Adicionar aos favoritos"
                    }
                    aria-label="Favoritar"
                    style={{
                      fontSize: "1.2rem",
                      color: isFavorited ? "#dc3545" : "#aaa",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!isFavorited) e.currentTarget.style.color = "#dc3545";
                    }}
                    onMouseLeave={(e) => {
                      if (!isFavorited) e.currentTarget.style.color = "#aaa";
                    }}
                  >
                    <FontAwesomeIcon icon={isFavorited ? faHeartSolid : faHeartRegular} />
                  </button>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-1">
                <FontAwesomeIcon
                  icon={faClock}
                  style={{
                    color:
                      isOpen === true
                        ? "#198754"
                        : isOpen === false
                          ? "#dc3545"
                          : "#666",
                    marginRight: 4,
                  }}
                  title="Status de funcionamento"
                />
                <small
                  style={{
                    fontSize: "0.75rem",
                    color:
                      isOpen === true
                        ? "#198754"
                        : isOpen === false
                          ? "#dc3545"
                          : "#444",
                  }}
                >
                  {openLabel}
                </small>
              </div>
            </div>
          </div>

          <p
            className="card-text flex-grow-1"
            style={{ fontSize: "0.9rem", lineHeight: 1.35, marginTop: 4 }}
          >
            <strong>Categoria:</strong> {m.tipo || "—"} <br />
            <strong>Endereço:</strong> {address || "Não disponível"}
          </p>

          <div className="mt-2 d-flex gap-2 flex-wrap" style={{ fontSize: 12 }}>
            {m.phone && (
              <div className="d-flex align-items-center">
                <strong>Tel:</strong>&nbsp;
                <a
                  href={`tel:${m.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: "none" }}
                >
                  {m.phone}
                </a>
              </div>
            )}
            {m.website && (
              <div className="d-flex align-items-center">
                <strong>Site:</strong>&nbsp;
                <a
                  href={
                    m.website.startsWith("http")
                      ? m.website
                      : `https://${m.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ textDecoration: "none" }}
                >
                  {m.website.replace(/^https?:\/\//, "")}
                  &nbsp;
                  <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
                </a>
              </div>
            )}
          </div>

          {expanded && (
            <div
              className="mt-3"
              style={{
                background: "#f9f9f9",
                borderRadius: 8,
                padding: "0.75rem",
                fontSize: 12,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {m.operator && (
                <div style={{ marginBottom: 4 }}>
                  <strong>Operador:</strong> {m.operator}
                </div>
              )}
              {m.description && (
                <div style={{ marginBottom: 4 }}>
                  <strong>Sobre:</strong> {m.description}
                </div>
              )}
              <div className="d-flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyAddress();
                  }}
                  aria-label="Copiar endereço"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  Copiar endereço
                </button>
                <a
                  href={osmLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                  aria-label="Abrir no OpenStreetMap"
                >
                  <FontAwesomeIcon icon={faMapLocationDot} />
                  OSM
                </a>
                <a
                  href={googleLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                  aria-label="Abrir no Google Maps"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  Google
                </a>
              </div>
            </div>
          )}

          <div className="mt-3 d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-sm btn-link p-0"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              aria-label="Ver mais detalhes"
            >
              {expanded ? "Ver menos" : "Ver mais"}{" "}
              <FontAwesomeIcon icon={faCircleInfo} style={{ marginLeft: 4 }} />
            </button>
            <button
              className="btn btn-outline-primary"
              style={{
                borderRadius: "30px",
                fontWeight: 600,
                padding: "0.4rem 1rem",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onVisit(m);
              }}
              aria-label="Ver ofertas"
            >
              Ver Ofertas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [cep, setCep] = useState("");
  const [erroCep, setErroCep] = useState("");
  const navigate = useNavigate();

  const reverseCacheRef = useRef({});

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
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (reverseCacheRef.current[key]) return reverseCacheRef.current[key];
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`
      );
      if (!resp.ok) throw new Error();
      const data = await resp.json();
      const result = {
        rua: data.address.road || "",
        estado: data.address.state || "",
        pais: data.address.country || "",
      };
      reverseCacheRef.current[key] = result;
      return result;
    } catch {
      return { rua: "Não disponível", estado: "", pais: "" };
    }
  };

  // busca fixa em raio de 4000m, retorna até 15 mais próximos
  const fetchNearbyMarkets = async (lat, lon, radius = 4000, limit = 15) => {
    try {
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
          way["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
          relation["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
        );
        out center;`;
      const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
        overpassQuery
      )}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro Overpass");
      const data = await res.json();
      const elements = data.elements || [];

      const markets = elements
        .map((e) => {
          const lat0 = e.type === "node" ? e.lat : e.center?.lat;
          const lon0 = e.type === "node" ? e.lon : e.center?.lon;
          if (lat0 == null || lon0 == null) return null;
          const distance = haversine(lat, lon, lat0, lon0);
          return {
            id: e.id,
            type: e.type,
            nome: (e.tags && e.tags.name) || "Mercado",
            tipo: (e.tags && e.tags.shop) || "",
            brand: (e.tags && e.tags.brand) || "",
            lat: lat0,
            lon: lon0,
            distance,
            rawTags: e.tags || {},
            opening_hours: e.tags?.opening_hours || null,
            phone: e.tags?.phone || e.tags?.["contact:phone"] || null,
            website: e.tags?.website || e.tags?.url || null,
            operator: e.tags?.operator || null,
            description: e.tags?.description || null,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      // completar com endereço
      const withAddress = await Promise.all(
        markets.map(async (m) => {
          const endereco = await getEnderecoFromCoords(m.lat, m.lon);
          return {
            ...m,
            ...endereco,
          };
        })
      );
      return withAddress;
    } catch (err) {
      console.warn("fetchNearbyMarkets erro:", err);
      return [];
    }
  };

  const buscarMercadosProximos = async (lat, lon) => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    setPos({ lat, lon });

    try {
      const enderecoData = await getEnderecoFromCoords(lat, lon);
      setLocalInfo(enderecoData);
      const lista = await fetchNearbyMarkets(lat, lon, 4000, 15);
      if (!lista || lista.length === 0) {
        setErro("Nenhum mercado encontrado dentro de 4km.");
      }
      setMercados(lista);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível buscar mercados.");
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscarLocalizacao = async () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });

    try {
      const posObj = await getAccuratePosition({ desiredAccuracy: 30, maxWait: 5000 });
      const lat = posObj.coords.latitude;
      const lon = posObj.coords.longitude;
      await buscarMercadosProximos(lat, lon);
    } catch {
      // fallback por IP
      try {
        const resp = await fetch("https://ipapi.co/json/");
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        if (data && data.latitude && data.longitude) {
          await buscarMercadosProximos(data.latitude, data.longitude);
        } else {
          setErro("Não foi possível obter localização.");
          setBuscando(false);
        }
      } catch {
        setErro("Não foi possível obter localização.");
        setBuscando(false);
      }
    }
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
      toast.info("Removido dos favoritos");
    } else {
      await set(favRef, {
        nome: market.nome,
        tipo: market.tipo,
        rua: market.rua,
        estado: market.estado,
        pais: market.pais,
        distance: market.distance,
      });
      setFavoritos((prev) => new Set(prev).add(market.id));
      toast.success("Adicionado aos favoritos");
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

  const resetBusca = () => {
    setModoBusca(null);
    setMercados([]);
    setErro("");
    setCep("");
    setErroCep("");
    setPos(null);
    setLocalInfo({ rua: "", estado: "", pais: "" });
  };

  if (!modoBusca) {
    return (
      <div
        className="container text-center mt-5"
        style={{ zIndex: 2, paddingTop: "60px" }}
      >
        <ToastContainer position="top-right" pauseOnHover />
        <h3 className="fw-bold mb-4 text-primary">
          Vamos localizar mercados próximos! Como quer fazer isso?
        </h3>

        <div
          className="d-flex justify-content-center gap-4 flex-wrap"
          style={{ maxWidth: 500, margin: "0 auto" }}
        >
          <button
            type="button"
            className="btn btn-primary btn-lg d-flex align-items-center gap-3 px-5 shadow"
            style={{
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.5)",
              transition: "transform 0.2s ease, backgroundColor  ' #e0e7ff'",
            }}
            onClick={() => {
              setModoBusca("local");
              handleBuscarLocalizacao();
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <FontAwesomeIcon icon={faStore} size="lg" />
            Usar minha localização
          </button>

          <button
            type="button"
            className="btn btn-outline-primary btn-lg d-flex align-items-center gap-3 px-5 shadow-sm mb-3"
            style={{
              borderRadius: "12px",
              fontWeight: 600,
              transition: "transform 0.2s ease, backgroundColor  ' #e0e7ff'",
            }}
            onClick={() => setModoBusca("cep")}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#e0e7ff";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <FiMapPin size={24} />
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

  if (mostrarCarrinho) {
    return <ProdutosPage onVoltar={() => setMostrarCarrinho(false)} />;
  }

  return (
    <div className="container my-5 px-2 px-md-4">
      <ToastContainer position="top-right" pauseOnHover />
      <button className="btn btn-link mb-4" onClick={resetBusca}>
        ← Voltar
      </button>

      {(modoBusca === "cep" || pos) && (
        <div className="mb-4 text-center">
          {modoBusca === "cep" && (
            <>
              <div className="d-flex justify-content-center flex-wrap gap-2 mb-3">
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
              </div>
              {erroCep && (
                <div
                  className="text-danger mt-2"
                  style={{ fontWeight: "600", fontSize: "0.9rem" }}
                >
                  {erroCep}
                </div>
              )}
            </>
          )}

          {pos && (
            <div
              className="shadow-sm mb-4 p-4"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(25, 135, 84, 0.3)",
                borderRadius: "16px",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
                color: "#000",
                boxShadow: "0 8px 24px rgba(25, 135, 84, 0.15)",
              }}
            >
              <h6
                className="mb-3 d-flex align-items-center"
                style={{ fontWeight: 700, color: "#000" }}
              >
                <FontAwesomeIcon
                  icon={faMapLocationDot}
                  className="me-2"
                  style={{ color: "#0059FF", fontSize: "1.2rem" }}
                />
                Sua localização aproximada
              </h6>
              <div className="row gx-2">
                <div
                  className="col-12 col-md-6"
                  style={{
                    fontSize: "0.95rem",
                    color: "#0059FF",
                    fontWeight: 700,
                  }}
                >
                  <strong style={{ color: "#000" }}>Endereço: </strong>
                  {[localInfo.rua, localInfo.estado, localInfo.pais]
                    .filter((s) => s)
                    .join(", ")}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0" style={{ fontWeight: 600 }}>
          Mercados próximos (até 4km)
        </h5>
        {modoBusca !== "local" && (
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setModoBusca("local");
              handleBuscarLocalizacao();
            }}
          >
            Usar localização atual
          </button>
        )}
      </div>

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
            <MarketCard
              key={`${m.type}-${m.id}`}
              market={m}
              user={user}
              onVisit={registrarVisitaEVerOfertas}
              onToggleFavorito={toggleFavorito}
              isFavorited={favoritos.has(m.id)}
            />
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
          Nenhum mercado próximo encontrado dentro de 4km.
        </div>
      )}
    </div>
  );
}
