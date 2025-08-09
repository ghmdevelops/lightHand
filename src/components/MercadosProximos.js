import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from "react";
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
  faGasPump,
  faFilter,
  faSliders,
  faSort,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiMapPin } from "react-icons/fi";
import opening_hours from "opening_hours";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { db } from "../firebase";
import { ref, get, set, remove } from "firebase/database";

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

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
        const until = new Date(nextChange).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        label += ` (até ${until})`;
      }
    } else {
      if (nextChange) {
        const opens = new Date(nextChange).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        label = `Fechado. Abre em ${opens}`;
      } else {
        label = "Fechado agora";
      }
    }
    const result = { label, isOpen };
    openingCache.set(raw, result);
    return result;
  } catch {
    return { label: "Horário inválido", isOpen: null };
  }
}

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
      { enableHighAccuracy: true, maximumAge: 0, timeout: maxWait }
    );
    setTimeout(() => {
      navigator.geolocation.clearWatch(watchId);
      if (best) resolve(best);
      else reject(new Error("Não foi possível obter localização precisa"));
    }, maxWait + 100);
  });
}

function requestWithTimeout(url, options = {}, ms = 15000, controller) {
  const ctrl = controller || new AbortController();
  const id = setTimeout(() => ctrl.abort("timeout"), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(id))
    .then((r) => r);
}

function createLimiter(max) {
  let active = 0;
  const queue = [];
  const runNext = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        runNext();
      });
  };
  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      runNext();
    });
}

function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

const MarketCard = React.memo(function MarketCard({ market: m, user, onVisit, onToggleFavorito, isFavorited }) {
  const [expanded, setExpanded] = useState(false);
  const address = [m.rua, m.estado, m.pais].filter(Boolean).join(", ");
  const { label: openLabel, isOpen } = useMemo(() => getOpeningStatus(m.opening_hours), [m.opening_hours]);
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.info("Endereço copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };
  const osmLink = `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`;
  const googleLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${m.lat},${m.lon}`)}`;
  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="card h-100 shadow-lg border-0" style={{ borderRadius: "16px", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", overflow: "hidden", position: "relative" }} onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.17)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}>
        <div className="card-body d-flex flex-column" style={{ padding: "1.25rem" }} onClick={() => onVisit(m)}>
          <div className="d-flex align-items-start mb-2">
            <div className="me-3">
              {m.brand ? (
                <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#0059FF", color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>
                  {m.brand.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#ddd", color: "#555", fontSize: "1.2rem" }}>
                  <FontAwesomeIcon icon={faStore} />
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title mb-1" style={{ fontSize: "1.15rem", fontWeight: 600 }}>{m.nome}</h5>
                  {m.brand && <small className="text-muted" style={{ fontSize: "0.85rem" }}>({m.brand})</small>}
                </div>
                <div className="text-end">
                  <div style={{ fontSize: "0.7rem" }}>{(m.distance / 1000).toFixed(2)} km</div>
                  <button className="btn p-0" onClick={(e) => { e.stopPropagation(); onToggleFavorito(m); }} title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"} aria-label="Favoritar" style={{ fontSize: "1.2rem", color: isFavorited ? "#dc3545" : "#aaa", transition: "color 0.2s" }} onMouseEnter={(e) => { if (!isFavorited) e.currentTarget.style.color = "#dc3545"; }} onMouseLeave={(e) => { if (!isFavorited) e.currentTarget.style.color = "#aaa"; }}>
                    <FontAwesomeIcon icon={isFavorited ? faHeartSolid : faHeartRegular} />
                  </button>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-1">
                <FontAwesomeIcon icon={faClock} style={{ color: isOpen === true ? "#198754" : isOpen === false ? "#dc3545" : "#666", marginRight: 4 }} title="Status de funcionamento" />
                <small style={{ fontSize: "0.75rem", color: isOpen === true ? "#198754" : isOpen === false ? "#dc3545" : "#444" }}>{openLabel}</small>
              </div>
            </div>
          </div>
          <p className="card-text flex-grow-1" style={{ fontSize: "0.9rem", lineHeight: 1.35, marginTop: 4 }}>
            <strong>Categoria:</strong> {m.tipo || "—"} <br />
            <strong>Endereço:</strong> {[m.rua, m.estado, m.pais].filter(Boolean).join(", ") || "Não disponível"}
          </p>
          <div className="mt-2 d-flex gap-2 flex-wrap" style={{ fontSize: 12 }}>
            {m.phone && (
              <div className="d-flex align-items-center">
                <strong>Tel:</strong>&nbsp;
                <a href={`tel:${m.phone}`} onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                  {m.phone}
                </a>
              </div>
            )}
            {m.website && (
              <div className="d-flex align-items-center">
                <strong>Site:</strong>&nbsp;
                <a href={m.website.startsWith("http") ? m.website : `https://${m.website}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ textDecoration: "none" }}>
                  {m.website.replace(/^https?:\/\//, "")}
                  &nbsp;
                  <FontAwesomeIcon icon={faExternalLinkAlt} style={{ fontSize: 10 }} />
                </a>
              </div>
            )}
          </div>
          {expanded && (
            <div className="mt-3" style={{ background: "#f9f9f9", borderRadius: 8, padding: "0.75rem", fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
              {m.operator && <div style={{ marginBottom: 4 }}><strong>Operador:</strong> {m.operator}</div>}
              {m.description && <div style={{ marginBottom: 4 }}><strong>Sobre:</strong> {m.description}</div>}
              <div className="d-flex gap-2 flex-wrap">
                <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={(e) => { e.stopPropagation(); handleCopyAddress(); }} aria-label="Copiar endereço">
                  <FontAwesomeIcon icon={faCopy} />
                  Copiar endereço
                </button>
                <a href={osmLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" aria-label="Abrir no OpenStreetMap">
                  <FontAwesomeIcon icon={faMapLocationDot} />
                  OSM
                </a>
                <a href={googleLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" aria-label="Abrir no Google Maps">
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  Google
                </a>
              </div>
            </div>
          )}
          <div className="mt-3 d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-sm btn-link p-0" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} aria-label="Ver mais detalhes">
              {expanded ? "Ver menos" : "Ver mais"} <FontAwesomeIcon icon={faCircleInfo} style={{ marginLeft: 4 }} />
            </button>
            <button className="btn btn-outline-primary" style={{ borderRadius: "30px", fontWeight: 600, padding: "0.4rem 1rem" }} onClick={(e) => { e.stopPropagation(); onVisit(m); }} aria-label="Ver ofertas">
              Ver Ofertas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.isFavorited === next.isFavorited && prev.market === next.market && prev.user === next.user);

const FuelCard = React.memo(function FuelCard({ posto }) {
  const address = [posto.rua, posto.estado, posto.pais].filter(Boolean).join(", ");
  const { label: openLabel } = useMemo(() => getOpeningStatus(posto.opening_hours), [posto.opening_hours]);
  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className="card h-100 shadow-lg border-0" style={{ borderRadius: 16 }}>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#0d6efd", color: "#fff" }}>
                <FontAwesomeIcon icon={faGasPump} />
              </div>
              <div>
                <h5 className="mb-0" style={{ fontWeight: 600 }}>{posto.nome}</h5>
                <small className="text-muted">{(posto.distance / 1000).toFixed(2)} km • {openLabel}</small>
              </div>
            </div>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${posto.lat},${posto.lon}`)}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary" title="Abrir no Maps">
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </a>
          </div>
          <div className="mt-3" style={{ fontSize: "0.9rem" }}>
            <strong>Endereço:</strong> {address || "Não disponível"}
          </div>
          {Object.keys(posto.prices || {}).length > 0 ? (
            <div className="mt-3">
              <div className="d-flex align-items-center gap-1 mb-2">
                <FontAwesomeIcon icon={faFilter} />
                <strong>Preços informados</strong>
              </div>
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Combustível</th>
                    <th>Preço</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(posto.prices).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ textTransform: "capitalize" }}>{k}</td>
                      <td>R$ {Number(v).toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-light mt-3 mb-0">Sem preços cadastrados no OSM para este posto.</div>
          )}
        </div>
      </div>
    </div>
  );
}, (prev, next) => prev.posto === next.posto);

export default function BuscarMercadosOSM({ user }) {
  const [showIntro, setShowIntro] = useState(true);
  const [tipoBusca, setTipoBusca] = useState(null);
  const [modoBusca, setModoBusca] = useState(null);
  const [mercados, setMercados] = useState([]);
  const [postos, setPostos] = useState([]);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pos, setPos] = useState(null);
  const [localInfo, setLocalInfo] = useState({ rua: "", estado: "", pais: "" });
  const [mercadoSelecionado, setMercadoSelecionado] = useState(null);
  const [mostrarCarrinho, setMostrarCarrinho] = useState(false);
  const [favoritos, setFavoritos] = useState(new Set());
  const [cep, setCep] = useState("");
  const [erroCep, setErroCep] = useState("");
  const [fuelFilter, setFuelFilter] = useState("gasolina");
  const [radius, setRadius] = useState(4000);
  const [sortMarket, setSortMarket] = useState("distance");
  const [sortFuel, setSortFuel] = useState("price");
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedRadius = useDebounced(radius, 250);
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();
  const reverseCacheRef = useRef({});
  const reverseLimiterRef = useRef(createLimiter(3));
  const overpassCacheRef = useRef(new Map());
  const fetchSeqRef = useRef(0);
  const overpassControllerRef = useRef(null);

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

  const getEnderecoFromCoords = useCallback(async (lat, lon) => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (reverseCacheRef.current[key]) return reverseCacheRef.current[key];
    const fn = async () => {
      try {
        const resp = await requestWithTimeout(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`,
          { headers: { "Accept-Language": "pt-BR" } },
          12000
        );
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        const result = { rua: data.address.road || "", estado: data.address.state || "", pais: data.address.country || "" };
        reverseCacheRef.current[key] = result;
        return result;
      } catch {
        const result = { rua: "Não disponível", estado: "", pais: "" };
        reverseCacheRef.current[key] = result;
        return result;
      }
    };
    return reverseLimiterRef.current(fn);
  }, []);

  const overpassEndpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.openstreetmap.ru/api/interpreter"];

  const overpassFetch = useCallback(async (query) => {
    const cacheKey = query;
    const cached = overpassCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;
    if (overpassControllerRef.current) overpassControllerRef.current.abort("new-request");
    const controller = new AbortController();
    overpassControllerRef.current = controller;
    for (const ep of overpassEndpoints) {
      try {
        const url = `${ep}?data=${encodeURIComponent(query)}`;
        const res = await requestWithTimeout(url, {}, 20000, controller);
        if (!res.ok) throw new Error("overpass-fail");
        const data = await res.json();
        overpassCacheRef.current.set(cacheKey, { ts: Date.now(), data });
        return data;
      } catch (e) {
        if (controller.signal.aborted) throw e;
        continue;
      }
    }
    throw new Error("overpass-all-failed");
  }, []);

  const fetchNearbyMarkets = useCallback(async (lat, lon, radius = 4000, limit = 15) => {
    try {
      const q = `
        [out:json][timeout:25];
        (
          node["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
          way["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
          relation["shop"~"supermarket|convenience|grocery"](around:${radius},${lat},${lon});
        );
        out center;`;
      const data = await overpassFetch(q);
      const elements = data.elements || [];
      const seen = new Set();
      const markets = elements
        .map((e) => {
          const lat0 = e.type === "node" ? e.lat : e.center?.lat;
          const lon0 = e.type === "node" ? e.lon : e.center?.lon;
          if (lat0 == null || lon0 == null) return null;
          const k = `${e.type}-${e.id}`;
          if (seen.has(k)) return null;
          seen.add(k);
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
      const withAddress = await Promise.all(
        markets.map(async (m) => {
          const endereco = await getEnderecoFromCoords(m.lat, m.lon);
          return { ...m, ...endereco };
        })
      );
      return withAddress;
    } catch {
      return [];
    }
  }, [getEnderecoFromCoords, overpassFetch]);

  const parseFuelPrices = useCallback((tags = {}) => {
    const prices = {};
    const addIf = (key, dest) => {
      const v = tags[key];
      if (!v) return;
      const num = parseFloat(String(v).replace(",", "."));
      if (!isNaN(num)) prices[dest] = num;
    };
    addIf("fuel:gasoline:price", "gasolina");
    addIf("fuel:ethanol:price", "etanol");
    addIf("fuel:diesel:price", "diesel");
    addIf("price:gasoline", "gasolina");
    addIf("price:ethanol", "etanol");
    addIf("price:diesel", "diesel");
    for (const [k, v] of Object.entries(tags)) {
      if (!/:price$/i.test(k)) continue;
      const val = parseFloat(String(v).replace(",", "."));
      if (isNaN(val)) continue;
      const lk = k.toLowerCase();
      if (lk.includes("ethanol") || lk.includes("alcohol") || lk.includes("etanol")) {
        prices["etanol"] = Math.min(prices["etanol"] ?? Infinity, val);
      } else if (lk.includes("diesel")) {
        prices["diesel"] = Math.min(prices["diesel"] ?? Infinity, val);
      } else if (lk.includes("gasoline") || lk.includes("gasolina")) {
        prices["gasolina"] = Math.min(prices["gasolina"] ?? Infinity, val);
      }
    }
    Object.keys(prices).forEach((k) => {
      if (!isFinite(prices[k])) delete prices[k];
    });
    return prices;
  }, []);

  const fetchNearbyFuel = useCallback(async (lat, lon, radius = 4000, limit = 15, fuelKey = "gasolina") => {
    try {
      const q = `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](around:${radius},${lat},${lon});
          way["amenity"="fuel"](around:${radius},${lat},${lon});
          relation["amenity"="fuel"](around:${radius},${lat},${lon});
        );
        out tags center;`;
      const data = await overpassFetch(q);
      const elements = data.elements || [];
      const seen = new Set();
      const stationsRaw = elements
        .map((e) => {
          const lat0 = e.type === "node" ? e.lat : e.center?.lat;
          const lon0 = e.type === "node" ? e.lon : e.center?.lon;
          if (lat0 == null || lon0 == null) return null;
          const k = `${e.type}-${e.id}`;
          if (seen.has(k)) return null;
          seen.add(k);
          const distance = haversine(lat, lon, lat0, lon0);
          const prices = parseFuelPrices(e.tags || {});
          return {
            id: e.id,
            type: e.type,
            nome: (e.tags && (e.tags.name || e.tags.brand)) || "Posto",
            brand: e.tags?.brand || "",
            lat: lat0,
            lon: lon0,
            distance,
            opening_hours: e.tags?.opening_hours || null,
            phone: e.tags?.phone || e.tags?.["contact:phone"] || null,
            website: e.tags?.website || e.tags?.url || null,
            prices,
            rawTags: e.tags || {},
          };
        })
        .filter(Boolean);
      const withAddress = await Promise.all(
        stationsRaw.map(async (s) => {
          const endereco = await getEnderecoFromCoords(s.lat, s.lon);
          return { ...s, ...endereco };
        })
      );
      const sorted = withAddress.sort((a, b) => {
        const pa = a.prices?.[fuelKey];
        const pb = b.prices?.[fuelKey];
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return a.distance - b.distance;
      });
      return sorted.slice(0, limit);
    } catch {
      return [];
    }
  }, [getEnderecoFromCoords, overpassFetch, parseFuelPrices]);

  const buscarProximos = useCallback(async (lat, lon, baseRadius) => {
    const seq = ++fetchSeqRef.current;
    setErro("");
    setBuscando(true);
    setMercados([]);
    setPostos([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    setPos({ lat, lon });
    try {
      const enderecoData = await getEnderecoFromCoords(lat, lon);
      if (seq !== fetchSeqRef.current) return;
      setLocalInfo(enderecoData);
      const tryRadii = [baseRadius, Math.min(baseRadius + 2000, 8000), Math.min(baseRadius + 4000, 10000)];
      for (let i = 0; i < tryRadii.length; i++) {
        const r = tryRadii[i];
        if (tipoBusca === "market") {
          const lista = await fetchNearbyMarkets(lat, lon, r, 20);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0 || i === tryRadii.length - 1) {
            setMercados(applyMarketSortAndFilters(lista, sortMarket, deferredQuery, onlyOpen));
            if (lista.length === 0) setErro("Nenhum mercado encontrado no raio pesquisado.");
            break;
          }
        } else if (tipoBusca === "fuel") {
          const lista = await fetchNearbyFuel(lat, lon, r, 15, fuelFilter);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0 || i === tryRadii.length - 1) {
            setPostos(applyFuelSortAndFilters(lista, sortFuel, fuelFilter, deferredQuery, onlyOpen));
            if (lista.length === 0) setErro("Nenhum posto encontrado no raio pesquisado.");
            break;
          }
        }
      }
    } catch {
      if (seq !== fetchSeqRef.current) return;
      setErro("Não foi possível buscar locais.");
    } finally {
      if (seq === fetchSeqRef.current) setBuscando(false);
    }
  }, [tipoBusca, getEnderecoFromCoords, fetchNearbyMarkets, fetchNearbyFuel, sortMarket, sortFuel, fuelFilter, deferredQuery, onlyOpen]);

  const handleBuscarLocalizacao = useCallback(async () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setPostos([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    try {
      const posObj = await getAccuratePosition({ desiredAccuracy: 30, maxWait: 5000 });
      await buscarProximos(posObj.coords.latitude, posObj.coords.longitude, debouncedRadius);
    } catch {
      try {
        const resp = await requestWithTimeout("https://ipapi.co/json/", {}, 12000);
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        if (data?.latitude && data?.longitude) {
          await buscarProximos(data.latitude, data.longitude, debouncedRadius);
        } else {
          setErro("Não foi possível obter localização.");
          setBuscando(false);
        }
      } catch {
        setErro("Não foi possível obter localização.");
        setBuscando(false);
      }
    }
  }, [buscarProximos, debouncedRadius]);

  const buscarCoordsPorCEP = useCallback(async (cep) => {
    try {
      setErroCep("");
      const respCep = await requestWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, {}, 12000);
      if (!respCep.ok) throw new Error("CEP inválido");
      const dataCep = await respCep.json();
      if (dataCep.erro) throw new Error("CEP não encontrado");
      const endereco = `${dataCep.logradouro}, ${dataCep.localidade}, ${dataCep.uf}, Brasil`;
      const respCoords = await requestWithTimeout(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&limit=1&addressdetails=1&accept-language=pt`,
        { headers: { "Accept-Language": "pt-BR" } },
        12000
      );
      if (!respCoords.ok) throw new Error("Erro ao buscar coordenadas");
      const dataCoords = await respCoords.json();
      if (dataCoords.length === 0) throw new Error("Coordenadas não encontradas");
      return { lat: parseFloat(dataCoords[0].lat), lon: parseFloat(dataCoords[0].lon) };
    } catch (error) {
      setErroCep(error.message || "Erro ao buscar CEP");
      return null;
    }
  }, []);

  const toggleFavorito = useCallback(async (market) => {
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
      await set(favRef, { nome: market.nome, tipo: market.tipo, rua: market.rua, estado: market.estado, pais: market.pais, distance: market.distance });
      setFavoritos((prev) => new Set(prev).add(market.id));
      toast.success("Adicionado aos favoritos");
    }
  }, [user, favoritos]);

  const registrarVisitaEVerOfertas = useCallback(async (market) => {
    if (user) {
      const visitRef = ref(db, `usuarios/${user.uid}/visitados/${market.id}`);
      await set(visitRef, { nome: market.nome, rua: market.rua, estado: market.estado, pais: market.pais, timestamp: Date.now() });
    }
    setMercadoSelecionado(market);
  }, [user]);

  const resetTelaInicial = useCallback(() => {
    setShowIntro(true);
    setTipoBusca(null);
    setModoBusca(null);
    setMercados([]);
    setPostos([]);
    setErro("");
    setCep("");
    setErroCep("");
    setPos(null);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    setQuery("");
  }, []);

  const applyMarketSortAndFilters = (arr, sortKey, q, onlyOpenFlag) => {
    const ql = (q || "").trim().toLowerCase();
    let r = arr;
    if (ql) r = r.filter((m) => [m.nome, m.brand, m.tipo].filter(Boolean).some((s) => s.toLowerCase().includes(ql)));
    if (onlyOpenFlag) r = r.filter((m) => getOpeningStatus(m.opening_hours).isOpen === true);
    if (sortKey === "name") r = [...r].sort((a, b) => a.nome.localeCompare(b.nome));
    else r = [...r].sort((a, b) => a.distance - b.distance);
    return r;
  };

  const applyFuelSortAndFilters = (arr, sortKey, fuelKey, q, onlyOpenFlag) => {
    const ql = (q || "").trim().toLowerCase();
    let r = arr;
    if (ql) r = r.filter((p) => [p.nome, p.brand].filter(Boolean).some((s) => s.toLowerCase().includes(ql)));
    if (onlyOpenFlag) r = r.filter((p) => getOpeningStatus(p.opening_hours).isOpen === true);
    if (sortKey === "distance") r = [...r].sort((a, b) => a.distance - b.distance);
    else {
      r = [...r].sort((a, b) => {
        const pa = a.prices?.[fuelKey];
        const pb = b.prices?.[fuelKey];
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return a.distance - b.distance;
      });
    }
    return r;
  };

  useEffect(() => {
    if (!pos) return;
    if (tipoBusca === "market") {
      setMercados((prev) => applyMarketSortAndFilters(prev, sortMarket, deferredQuery, onlyOpen));
    } else if (tipoBusca === "fuel") {
      setPostos((prev) => applyFuelSortAndFilters(prev, sortFuel, fuelFilter, deferredQuery, onlyOpen));
    }
  }, [sortMarket, sortFuel, deferredQuery, onlyOpen, fuelFilter, tipoBusca, pos]);

  useEffect(() => {
    if (!pos) return;
    buscarProximos(pos.lat, pos.lon, debouncedRadius);
  }, [debouncedRadius, fuelFilter]);

  if (showIntro) {
    return (
      <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: "80vh" }}>
        <ToastContainer position="top-right" pauseOnHover />
        <div className="text-center p-4 p-md-5 shadow-sm" style={{ maxWidth: 720, borderRadius: 16, background: "linear-gradient(135deg,#f8fafc 0%, #eef2ff 100%)", border: "1px solid #e5e7eb" }}>
          <div className="d-flex justify-content-center gap-3 mb-3">
            <div className="d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, borderRadius: "50%", background: "#0d6efd", color: "#fff" }}>
              <FontAwesomeIcon icon={faStore} />
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, borderRadius: "50%", background: "#10b981", color: "#fff" }}>
              <FontAwesomeIcon icon={faGasPump} />
            </div>
            <div className="d-flex align-items-center justify-content-center" style={{ width: 56, height: 56, borderRadius: "50%", background: "#6366f1", color: "#fff" }}>
              <FontAwesomeIcon icon={faMapLocationDot} />
            </div>
          </div>
          <h2 className="fw-bold mb-2" style={{ color: "#0f172a" }}>Encontre e compare perto de você</h2>
          <p className="mb-3" style={{ color: "#334155", fontSize: "1.05rem" }}>
            O app localiza mercados e postos mais próximos, mostra horários, contatos e permite comparar preços para achar as melhores opções na sua região.
          </p>
          <p className="mb-4" style={{ color: "#475569" }}>
            Para resultados mais precisos, habilite sua localização. Você também pode pesquisar por CEP.
          </p>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            <button
              className="btn btn-primary btn-lg px-4"
              onClick={() => {
                if (navigator.geolocation) {
                  try { navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: true, timeout: 2000, maximumAge: 0 }); } catch {}
                }
                setShowIntro(false);
              }}
              style={{ borderRadius: 12 }}
            >
              OK, ir para a escolha
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tipoBusca) {
    return (
      <div className="container text-center mt-5" style={{ zIndex: 2, paddingTop: 60 }}>
        <ToastContainer position="top-right" pauseOnHover />
        <h3 className="fw-bold mb-4 text-primary">O que você quer encontrar?</h3>
        <div className="d-flex justify-content-center gap-4 flex-wrap" style={{ maxWidth: 600, margin: "0 auto" }}>
          <button type="button" className="btn btn-primary btn-lg d-flex align-items-center gap-3 px-5 shadow" style={{ borderRadius: 12 }} onClick={() => setTipoBusca("market")}>
            <FontAwesomeIcon icon={faStore} size="lg" />
            Mercados
          </button>
          <button type="button" className="btn btn-outline-primary btn-lg d-flex align-items-center gap-3 px-5 shadow-sm" style={{ borderRadius: 12 }} onClick={() => setTipoBusca("fuel")}>
            <FontAwesomeIcon icon={faGasPump} size="lg" />
            Postos de gasolina
          </button>
        </div>
      </div>
    );
  }

  if (!modoBusca) {
    return (
      <div className="container text-center mt-5" style={{ zIndex: 2, paddingTop: 60 }}>
        <ToastContainer position="top-right" pauseOnHover />
        <h3 className="fw-bold mb-3 text-primary">{tipoBusca === "market" ? "Vamos localizar mercados próximos!" : "Vamos localizar os melhores postos próximos!"}</h3>
        {tipoBusca === "fuel" && (
          <div className="mb-3 d-flex justify-content-center align-items-center gap-2">
            <span>Combustível:</span>
            <select className="form-select w-auto" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
              <option value="gasolina">Gasolina</option>
              <option value="etanol">Etanol</option>
              <option value="diesel">Diesel</option>
            </select>
          </div>
        )}
        <div className="d-flex justify-content-center gap-4 flex-wrap" style={{ maxWidth: 500, margin: "0 auto" }}>
          <button type="button" className="btn btn-primary btn-lg d-flex align-items-center gap-3 px-5 shadow" style={{ borderRadius: 12 }} onClick={() => { setModoBusca("local"); handleBuscarLocalizacao(); }}>
            <FontAwesomeIcon icon={faMapLocationDot} size="lg" />
            Usar minha localização
          </button>
          <button type="button" className="btn btn-outline-primary btn-lg d-flex align-items-center gap-3 px-5 shadow-sm mb-3" style={{ borderRadius: 12, fontWeight: 600 }} onClick={() => setModoBusca("cep")}>
            <FiMapPin size={24} />
            Digitar CEP
          </button>
        </div>
      </div>
    );
  }

  if (mercadoSelecionado && tipoBusca === "market") {
    return <OfertasMercado mercado={mercadoSelecionado} user={user} onVoltar={() => setMercadoSelecionado(null)} />;
  }

  if (mostrarCarrinho) {
    return <ProdutosPage onVoltar={() => setMostrarCarrinho(false)} />;
  }

  return (
    <div className="container my-5 px-2 px-md-4" style={{ zIndex: 2, paddingTop: "80px" }}>
      <ToastContainer position="top-right" pauseOnHover />
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
          <button className="btn btn-outline-secondary mb-4" onClick={resetTelaInicial}>
            &larr; Voltar
          </button>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="input-group" style={{ width: 260 }}>
            <span className="input-group-text"><FontAwesomeIcon icon={faSearch} /></span>
            <input type="text" className="form-control" placeholder={tipoBusca === "market" ? "Buscar mercado/brand" : "Buscar posto/brand"} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="d-flex align-items-center gap-2">
            <FontAwesomeIcon icon={faSliders} />
            <input type="range" min={1000} max={10000} step={500} value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
            <span style={{ width: 72, textAlign: "right" }}>{(radius / 1000).toFixed(1)} km</span>
          </div>
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="onlyOpen" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
            <label className="form-check-label" htmlFor="onlyOpen">Apenas abertos</label>
          </div>
          {tipoBusca === "fuel" ? (
            <div className="d-flex align-items-center gap-2">
              <span>Combustível:</span>
              <select className="form-select form-select-sm w-auto" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                <option value="gasolina">Gasolina</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
              </select>
              <span><FontAwesomeIcon icon={faSort} /> Ordenar:</span>
              <select className="form-select form-select-sm w-auto" value={sortFuel} onChange={(e) => setSortFuel(e.target.value)}>
                <option value="price">Preço</option>
                <option value="distance">Distância</option>
              </select>
            </div>
          ) : (
            <div className="d-flex align-items-center gap-2">
              <span><FontAwesomeIcon icon={faSort} /> Ordenar:</span>
              <select className="form-select form-select-sm w-auto" value={sortMarket} onChange={(e) => setSortMarket(e.target.value)}>
                <option value="distance">Distância</option>
                <option value="name">Nome</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {(modoBusca === "cep" || pos) && (
        <div className="mb-4 text-center">
          {modoBusca === "cep" && (
            <>
              <div className="d-flex justify-content-center flex-wrap gap-2 mb-3">
                <input type="text" value={cep} onChange={(e) => setCep(e.target.value)} placeholder="Digite o CEP (somente números)" maxLength={9} style={{ padding: "0.5rem 1rem", fontSize: "1rem", borderRadius: 10, border: "1px solid #195f87ff", width: 200, textAlign: "center", marginRight: "0.5rem" }} />
                <button className="btn btn-primary" onClick={async () => {
                  const cepLimpo = cep.replace(/\D/g, "");
                  if (cepLimpo.length !== 8) {
                    setErroCep("Digite um CEP válido com 8 números.");
                    return;
                  }
                  setErro("");
                  setBuscando(true);
                  setMercados([]);
                  setPostos([]);
                  setLocalInfo({ rua: "", estado: "", pais: "" });
                  const coords = await buscarCoordsPorCEP(cepLimpo);
                  if (!coords) {
                    setBuscando(false);
                    return;
                  }
                  await buscarProximos(coords.lat, coords.lon, debouncedRadius);
                }} style={{ borderRadius: 30, padding: "0.5rem 1rem", fontWeight: 600, fontSize: "1rem" }}>
                  <FiMapPin size={20} />
                </button>
              </div>
              {erroCep && (
                <div className="text-danger mt-2" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  {erroCep}
                </div>
              )}
            </>
          )}
          {pos && (
            <div className="shadow-sm mb-4 p-4" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(25, 135, 84, 0.3)", borderRadius: "16px", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", color: "#000", boxShadow: "0 8px 24px rgba(25, 135, 84, 0.15)" }}>
              <h6 className="mb-3 d-flex align-items-center" style={{ fontWeight: 700, color: "#000" }}>
                <FontAwesomeIcon icon={faMapLocationDot} className="me-2" style={{ color: "#0059FF", fontSize: "1.2rem" }} />
                Sua localização aproximada
              </h6>
              <div className="row gx-2">
                <div className="col-12 col-md-6" style={{ fontSize: "0.95rem", color: "#0059FF", fontWeight: 700 }}>
                  <strong style={{ color: "#000" }}>Endereço: </strong>
                  {[localInfo.rua, localInfo.estado, localInfo.pais].filter((s) => s).join(", ")}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0" style={{ fontWeight: 600 }}>
          {tipoBusca === "market" ? `Mercados próximos (até ${(radius / 1000).toFixed(1)} km)` : `Postos próximos (até ${(radius / 1000).toFixed(1)} km) — foco em ${fuelFilter}`}
        </h5>
        {modoBusca !== "local" && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setModoBusca("local"); handleBuscarLocalizacao(); }}>
            Usar localização atual
          </button>
        )}
      </div>

      {erro && (
        <div className="alert alert-warning mb-4 text-center" style={{ borderRadius: 12 }}>
          {erro}
        </div>
      )}

      {buscando && (
        <div className="text-center my-5">
          <div className="spinner-border text-primary" role="status" style={{ width: 80, height: 80 }}>
            <span className="visually-hidden">Buscando...</span>
          </div>
          <div className="mt-3" style={{ fontSize: "1.1rem" }}>
            Carregando {tipoBusca === "market" ? "mercados" : "postos"} próximos…
          </div>
        </div>
      )}

      {!buscando && tipoBusca === "market" && mercados.length > 0 && (
        <div className="row gy-4">
          {mercados.map((m) => (
            <MarketCard key={`${m.type}-${m.id}`} market={m} user={user} onVisit={registrarVisitaEVerOfertas} onToggleFavorito={toggleFavorito} isFavorited={favoritos.has(m.id)} />
          ))}
        </div>
      )}

      {!buscando && tipoBusca === "fuel" && postos.length > 0 && (
        <div className="row gy-4">
          {postos.map((p) => (
            <FuelCard key={`${p.type}-${p.id}`} posto={p} />
          ))}
        </div>
      )}

      {!buscando && ((tipoBusca === "market" && mercados.length === 0) || (tipoBusca === "fuel" && postos.length === 0)) && !erro && (
        <div className="alert alert-info mt-5 text-center" style={{ borderRadius: 12, fontSize: "1rem", background: "#f0f7f5", color: "#196a87ff" }}>
          Nenhum resultado encontrado no raio atual.
        </div>
      )}
    </div>
  );
}
