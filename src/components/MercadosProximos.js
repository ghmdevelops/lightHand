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
  faStar,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { FiMapPin } from "react-icons/fi";
import opening_hours from "opening_hours";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../firebase";
import { ref, get, set, remove, onValue, off } from "firebase/database";

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
        label = `Fechado. Abre às ${opens}`;
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
        if (!best || p.coords.accuracy < best.coords.accuracy) best = p;
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
    }, maxWait + 120);
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
    <motion.div layout className="col-12 col-md-6 col-lg-4">
      <motion.div
        layout
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.9 }}
        className="card h-100 shadow-lg border-0"
        style={{ borderRadius: 16, overflow: "hidden", cursor: "pointer" }}
        onClick={() => onVisit(m)}
      >
        <div className="card-body d-flex flex-column" style={{ padding: "1.1rem" }}>
          <div className="d-flex align-items-start mb-2">
            <div className="me-3">
              {m.brand ? (
                <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#0059FF", color: "#fff", fontWeight: 700, fontSize: "1.2rem" }}>
                  {m.brand.charAt(0).toUpperCase()}
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#e8eefc", color: "#2b4fd6", fontSize: "1.2rem" }}>
                  <FontAwesomeIcon icon={faStore} />
                </div>
              )}
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title mb-1" style={{ fontSize: "1.05rem", fontWeight: 700 }}>{m.nome}</h5>
                  {m.brand && <small className="text-muted" style={{ fontSize: "0.85rem" }}>({m.brand})</small>}
                </div>
                <div className="text-end">
                  <div style={{ fontSize: "0.75rem" }}>{(m.distance / 1000).toFixed(2)} km</div>
                  <button
                    className="btn p-0"
                    onClick={(e) => { e.stopPropagation(); onToggleFavorito(m); }}
                    title={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    aria-label="Favoritar"
                    style={{ fontSize: "1.2rem", color: isFavorited ? "#dc3545" : "#94a3b8" }}
                  >
                    <FontAwesomeIcon icon={isFavorited ? faHeartSolid : faHeartRegular} />
                  </button>
                </div>
              </div>
              <div className="d-flex align-items-center gap-2 mt-1">
                <FontAwesomeIcon icon={faClock} style={{ color: isOpen === true ? "#198754" : isOpen === false ? "#dc3545" : "#64748b" }} />
                <small style={{ fontSize: "0.8rem", color: isOpen === true ? "#198754" : isOpen === false ? "#dc3545" : "#334155" }}>{openLabel}</small>
              </div>
            </div>
          </div>
          <p className="card-text flex-grow-1" style={{ fontSize: "0.92rem", lineHeight: 1.35, marginTop: 4 }}>
            <strong>Categoria:</strong> {m.tipo || "—"} <br />
            <strong>Endereço:</strong> {address || "Não disponível"}
          </p>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="mt-2"
                style={{ background: "#f8fafc", borderRadius: 10, padding: "0.75rem", fontSize: 12 }}
                onClick={(e) => e.stopPropagation()}
              >
                {m.operator && <div className="mb-1"><strong>Operador:</strong> {m.operator}</div>}
                {m.description && <div className="mb-2"><strong>Sobre:</strong> {m.description}</div>}
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={handleCopyAddress} aria-label="Copiar endereço">
                    <FontAwesomeIcon icon={faCopy} />
                    Copiar endereço
                  </button>
                  <a href={osmLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" aria-label="Abrir no OpenStreetMap">
                    <FontAwesomeIcon icon={faMapLocationDot} />
                    OSM
                  </a>
                  <a href={googleLink} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" aria-label="Abrir no Google Maps">
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Google
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-3 d-flex justify-content-between align-items-center">
            <button type="button" className="btn btn-sm btn-link p-0" onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }} aria-label="Ver mais detalhes">
              {expanded ? "Ver menos" : "Ver mais"} <FontAwesomeIcon icon={faCircleInfo} style={{ marginLeft: 4 }} />
            </button>
            <button className="btn btn-outline-primary" style={{ borderRadius: 24, fontWeight: 700, padding: "0.4rem 1rem" }} onClick={(e) => { e.stopPropagation(); onVisit(m); }} aria-label="Ver ofertas">
              Ver Ofertas
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}, (prev, next) => prev.isFavorited === next.isFavorited && prev.market === next.market && prev.user === next.user);

const FuelCard = React.memo(function FuelCard({ posto, onUpdatePrice, highlight }) {
  const address = [posto.rua, posto.estado, posto.pais].filter(Boolean).join(", ");
  const { label: openLabel } = useMemo(() => getOpeningStatus(posto.opening_hours), [posto.opening_hours]);
  const g = posto.prices?.gasolina;
  const e = posto.prices?.etanol;
  const d = posto.prices?.diesel;
  const updated = posto.updatedAt ? timeAgo(posto.updatedAt) : null;

  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || `${posto.lat},${posto.lon}`)}`;

  return (
    <motion.div layout className="col-12 col-md-6 col-lg-4">
      <motion.div
        layout
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 320, damping: 26, mass: 0.9 }}
        className={`card h-100 border-0 ${highlight ? "shadow-lg" : "shadow"}`}
        style={{ borderRadius: 16, overflow: "hidden", outline: highlight ? "2px solid #10b981" : "none" }}
      >
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start">
            <div className="d-flex align-items-center gap-3">
              <div className="d-flex justify-content-center align-items-center" style={{ width: 48, height: 48, borderRadius: "50%", background: "#0d6efd", color: "#fff" }}>
                <FontAwesomeIcon icon={faGasPump} />
              </div>
              <div>
                <h5 className="mb-0" style={{ fontWeight: 700 }}>{posto.nome}</h5>
                <small className="text-muted">{(posto.distance / 1000).toFixed(2)} km • {openLabel}</small>
                {updated && <div><small className="text-success">Atualizado {updated}</small></div>}
              </div>
            </div>
            <a href={maps} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary" title="Abrir no Maps">
              <FontAwesomeIcon icon={faExternalLinkAlt} />
            </a>
          </div>

          <div className="mt-3" style={{ fontSize: "0.95rem" }}>
            <strong>Endereço:</strong> {address || "Não disponível"}
          </div>

          <div className="mt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faFilter} />
              <strong>Preços</strong>
              {!g && !e && !d && <span className="badge bg-light text-dark">sem preço</span>}
              {highlight && <span className="badge bg-success"><FontAwesomeIcon icon={faStar} className="me-1" />melhor preço</span>}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <PriceChip label="Gasolina" value={g} />
              <PriceChip label="Etanol" value={e} />
              <PriceChip label="Diesel" value={d} />
            </div>
            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-sm btn-outline-primary" onClick={() => onUpdatePrice(posto)}>Atualizar preço</button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}, (prev, next) => prev.posto === next.posto && prev.highlight === next.highlight);

function PriceChip({ label, value }) {
  if (value == null) {
    return <span className="badge bg-secondary-subtle text-secondary border">{label}: —</span>;
  }
  const shade = valueToShade(value);
  return <span className="badge border" style={{ background: shade.bg, color: shade.fg, borderColor: shade.border }}>{label}: R$ {value.toFixed(3)}</span>;
}

function valueToShade(v) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const t = clamp((v - 4) / 2, 0, 1);
  const r = Math.round(16 + t * 200);
  const g = Math.round(200 - t * 120);
  const b = Math.round(16 + t * 60);
  const fg = t > 0.6 ? "#111" : "#0f172a";
  return { bg: `rgb(${r},${g},${b},0.15)`, fg, border: `rgba(${r},${g},${b},0.4)` };
}

function timeAgo(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return `há ${d} d`;
}

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
  const [hasPriceOnly, setHasPriceOnly] = useState(false);
  const [query, setQuery] = useState("");

  const debouncedRadius = useDebounced(radius, 250);
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();

  const reverseCacheRef = useRef({});
  const reverseLimiterRef = useRef(createLimiter(3));
  const overpassCacheRef = useRef(new Map());
  const fetchSeqRef = useRef(0);
  const overpassControllerRef = useRef(null);

  const [communityPrices, setCommunityPrices] = useState({});
  useEffect(() => {
    const refAll = ref(db, "fuelPrices");
    onValue(refAll, (snap) => setCommunityPrices(snap.val() || {}));
    return () => off(refAll);
  }, []);

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

  const overpassEndpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.ru/api/interpreter",
  ];

  const overpassFetch = useCallback(async (queryStr) => {
    const cacheKey = queryStr;
    const cached = overpassCacheRef.current.get(cacheKey);
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.data;
    if (overpassControllerRef.current) overpassControllerRef.current.abort("new-request");
    const controller = new AbortController();
    overpassControllerRef.current = controller;
    for (const ep of overpassEndpoints) {
      try {
        const url = `${ep}?data=${encodeURIComponent(queryStr)}`;
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

  const fetchNearbyMarkets = useCallback(async (lat, lon, rad = 4000, limit = 20) => {
    try {
      const q = `
        [out:json][timeout:25];
        (
          node["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
          way["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
          relation["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
        );
        out center;
      `;
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
            id: `${e.id}`,
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
      const withAddress = await Promise.all(markets.map(async (m) => ({ ...m, ...(await getEnderecoFromCoords(m.lat, m.lon)) })));
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
      if (lk.includes("ethanol") || lk.includes("alcohol") || lk.includes("etanol")) prices["etanol"] = Math.min(prices["etanol"] ?? Infinity, val);
      else if (lk.includes("diesel")) prices["diesel"] = Math.min(prices["diesel"] ?? Infinity, val);
      else if (lk.includes("gasoline") || lk.includes("gasolina")) prices["gasolina"] = Math.min(prices["gasolina"] ?? Infinity, val);
    }
    Object.keys(prices).forEach((k) => { if (!isFinite(prices[k])) delete prices[k]; });
    return prices;
  }, []);

  const mergeCommunity = useCallback((id, osmPrices) => {
    const c = communityPrices?.[id] || {};
    const merged = { ...osmPrices };
    let updatedAt = null;
    ["gasolina", "etanol", "diesel"].forEach((k) => {
      const r = c[k];
      if (!r) return;
      merged[k] = r.price;
      if (!updatedAt || (r.updatedAt && r.updatedAt > updatedAt)) updatedAt = r.updatedAt;
    });
    return { prices: merged, updatedAt };
  }, [communityPrices]);

  const fetchNearbyFuel = useCallback(async (lat, lon, rad = 4000, limit = 15, fuelKey = "gasolina") => {
    try {
      const q = `
        [out:json][timeout:25];
        (
          node["amenity"="fuel"](around:${rad},${lat},${lon});
          way["amenity"="fuel"](around:${rad},${lat},${lon});
          relation["amenity"="fuel"](around:${rad},${lat},${lon});
        );
        out tags center;
      `;
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
          const osmPrices = parseFuelPrices(e.tags || {});
          return {
            id: `${e.id}`,
            type: e.type,
            nome: (e.tags && (e.tags.name || e.tags.brand)) || "Posto",
            brand: e.tags?.brand || "",
            lat: lat0,
            lon: lon0,
            distance,
            opening_hours: e.tags?.opening_hours || null,
            phone: e.tags?.phone || e.tags?.["contact:phone"] || null,
            website: e.tags?.website || e.tags?.url || null,
            rawTags: e.tags || {},
            ...mergeCommunity(`${e.id}`, osmPrices),
          };
        })
        .filter(Boolean);
      const withAddress = await Promise.all(stationsRaw.map(async (s) => ({ ...s, ...(await getEnderecoFromCoords(s.lat, s.lon)) })));
      const filtered = withAddress.filter((p) => !hasPriceOnly || (p.prices && Object.keys(p.prices).length > 0));
      const sorted = filtered.sort((a, b) => {
        if (sortFuel === "distance") return a.distance - b.distance;
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
  }, [getEnderecoFromCoords, overpassFetch, parseFuelPrices, sortFuel, hasPriceOnly, mergeCommunity]);

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
          const lista = await fetchNearbyMarkets(lat, lon, r, 24);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0 || i === tryRadii.length - 1) {
            setMercados(applyMarketSortAndFilters(lista, sortMarket, deferredQuery));
            if (lista.length === 0) setErro("Nenhum mercado encontrado no raio pesquisado.");
            break;
          }
        } else if (tipoBusca === "fuel") {
          const lista = await fetchNearbyFuel(lat, lon, r, 20, fuelFilter);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0 || i === tryRadii.length - 1) {
            setPostos(applyFuelSortAndFilters(lista, sortFuel, fuelFilter, deferredQuery));
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
  }, [tipoBusca, getEnderecoFromCoords, fetchNearbyMarkets, fetchNearbyFuel, sortMarket, sortFuel, fuelFilter, deferredQuery]);

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

  const buscarCoordsPorCEP = useCallback(async (cepDigits) => {
    try {
      setErroCep("");
      const respCep = await requestWithTimeout(`https://viacep.com.br/ws/${cepDigits}/json/`, {}, 12000);
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

  const applyMarketSortAndFilters = (arr, sortKey, q) => {
    const ql = (q || "").trim().toLowerCase();
    let r = arr;
    if (ql) r = r.filter((m) => [m.nome, m.brand, m.tipo].filter(Boolean).some((s) => s.toLowerCase().includes(ql)));
    if (sortKey === "name") r = [...r].sort((a, b) => a.nome.localeCompare(b.nome));
    else r = [...r].sort((a, b) => a.distance - b.distance);
    return r;
  };

  const applyFuelSortAndFilters = (arr, sortKey, fuelKey, q) => {
    const ql = (q || "").trim().toLowerCase();
    let r = arr;
    if (ql) r = r.filter((p) => [p.nome, p.brand].filter(Boolean).some((s) => s.toLowerCase().includes(ql)));
    if (sortKey === "distance") r = [...r].sort((a, b) => a.distance - b.distance);
    else {
      r = [...r].sort((a, b) => {
        const pa = pPrice(a, fuelKey);
        const pb = pPrice(b, fuelKey);
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return a.distance - b.distance;
      });
    }
    return r;
  };

  const pPrice = (p, fuelKey) => p?.prices?.[fuelKey];

  useEffect(() => {
    if (!pos) return;
    if (tipoBusca === "market") {
      setMercados((prev) => applyMarketSortAndFilters(prev, sortMarket, deferredQuery));
    } else if (tipoBusca === "fuel") {
      setPostos((prev) => applyFuelSortAndFilters(prev, sortFuel, fuelFilter, deferredQuery));
    }
  }, [sortMarket, sortFuel, deferredQuery, fuelFilter, tipoBusca, pos]);

  useEffect(() => {
    if (!pos) return;
    if (tipoBusca === "fuel") buscarProximos(pos.lat, pos.lon, debouncedRadius);
    if (tipoBusca === "market") buscarProximos(pos.lat, pos.lon, debouncedRadius);
  }, [debouncedRadius, fuelFilter, hasPriceOnly]);

  const handleUpdatePrice = async (posto) => {
    const { value: formValues } = await Swal.fire({
      title: `Atualizar preço — ${posto.nome}`,
      html: `
        <div class="d-flex flex-column text-start" style="gap:.5rem">
          <label>Gasolina (R$)</label>
          <input id="pg" type="number" step="0.001" min="0" class="swal2-input" placeholder="ex.: 5.799" style="width:100%">
          <label>Etanol (R$)</label>
          <input id="pe" type="number" step="0.001" min="0" class="swal2-input" placeholder="ex.: 3.899" style="width:100%">
          <label>Diesel (R$)</label>
          <input id="pd" type="number" step="0.001" min="0" class="swal2-input" placeholder="ex.: 5.999" style="width:100%">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Salvar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const pg = document.getElementById("pg").value;
        const pe = document.getElementById("pe").value;
        const pd = document.getElementById("pd").value;
        return { pg, pe, pd };
      },
    });
    if (!formValues) return;
    if (!user) {
      toast.info("Faça login para informar preço");
      return;
    }
    const path = ref(db, `fuelPrices/${posto.id}`);
    const patch = {};
    const now = Date.now();
    const n = (x) => {
      const v = parseFloat(String(x).replace(",", "."));
      return isNaN(v) ? null : v;
    };
    const g = n(formValues.pg);
    const e = n(formValues.pe);
    const d = n(formValues.pd);
    if (g != null) patch["gasolina"] = { price: g, updatedAt: now, by: user.uid };
    if (e != null) patch["etanol"] = { price: e, updatedAt: now, by: user.uid };
    if (d != null) patch["diesel"] = { price: d, updatedAt: now, by: user.uid };
    if (Object.keys(patch).length === 0) return;
    await set(path, patch);
    toast.success("Preço atualizado!");
    if (pos && tipoBusca === "fuel") buscarProximos(pos.lat, pos.lon, debouncedRadius);
  };

  if (mercadoSelecionado && tipoBusca === "market") {
    return (
      <>
        <ToastContainer position="top-right" pauseOnHover />
        <AnimatePresence mode="wait">
          <motion.div
            key="ofertas"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <OfertasMercado mercado={mercadoSelecionado} user={user} onVoltar={() => setMercadoSelecionado(null)} />
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  if (mostrarCarrinho) {
    return (
      <>
        <ToastContainer position="top-right" pauseOnHover />
        <AnimatePresence mode="wait">
          <motion.div
            key="produtos"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <ProdutosPage onVoltar={() => setMostrarCarrinho(false)} />
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="container my-5 px-2 px-md-4" style={{ zIndex: 2, paddingTop: "80px" }}>
      <ToastContainer position="top-right" pauseOnHover />
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="d-flex align-items-center justify-content-center"
            style={{ minHeight: "70vh" }}
          >
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
                Localize mercados e postos próximos, veja horários e compare preços em tempo real com ajuda da comunidade.
              </p>
              <div className="d-flex flex-wrap justify-content-center gap-2">
                <button
                  className="btn btn-primary btn-lg px-4"
                  onClick={() => setShowIntro(false)}
                  style={{ borderRadius: 12 }}
                >
                  Começar
                </button>
              </div>
            </div>
          </motion.div>
        ) : !tipoBusca ? (
          <motion.div
            key="choose-type"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="text-center mt-5"
            style={{ zIndex: 2, paddingTop: 60 }}
          >
            <h3 className="fw-bold mb-4 text-primary">O que você quer encontrar?</h3>
            <div className="d-flex justify-content-center gap-4 flex-wrap" style={{ maxWidth: 600, margin: "0 auto" }}>
              <button type="button" className="btn btn-primary btn-lg d-flex align-items-center gap-3 px-5 shadow mb-4" style={{ borderRadius: 12 }} onClick={() => setTipoBusca("market")}>
                <FontAwesomeIcon icon={faStore} size="lg" />
                Mercados
              </button>
              <button type="button" className="btn btn-outline-primary btn-lg d-flex align-items-center gap-3 px-5 shadow-sm mb-4" style={{ borderRadius: 12 }} onClick={() => setTipoBusca("fuel")}>
                <FontAwesomeIcon icon={faGasPump} size="lg" />
                Postos de gasolina
              </button>
            </div>
          </motion.div>
        ) : !modoBusca ? (
          <motion.div
            key="choose-mode"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="text-center mt-5"
            style={{ zIndex: 2, paddingTop: 60 }}
          >
            <button className="btn btn-outline-secondary mb-4" onClick={() => setTipoBusca(null)}>
              <FontAwesomeIcon icon={faArrowLeft} className="me-1" /> Voltar
            </button>
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
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25 }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
              <button className="btn btn-outline-secondary" onClick={() => setModoBusca(null)}>
                <FontAwesomeIcon icon={faArrowLeft} className="me-1" /> Voltar
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

                {tipoBusca === "fuel" ? (
                  <div className="d-flex align-items-center gap-2">
                    <span>Combustível:</span>
                    <select className="form-select form-select-sm w-auto" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                      <option value="gasolina">Gasolina</option>
                      <option value="etanol">Etanol</option>
                      <option value="diesel">Diesel</option>
                    </select>
                    <div className="form-check form-switch ms-2">
                      <input className="form-check-input" type="checkbox" id="hasPrice" checked={hasPriceOnly} onChange={(e) => setHasPriceOnly(e.target.checked)} />
                      <label className="form-check-label" htmlFor="hasPrice">Somente com preço</label>
                    </div>
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
                      <input
                        type="text"
                        value={cep}
                        onChange={(e) => setCep(e.target.value)}
                        placeholder="Digite o CEP (somente números)"
                        maxLength={9}
                        style={{ padding: "0.5rem 1rem", fontSize: "1rem", borderRadius: 10, border: "1px solid #195f87ff", width: 200, textAlign: "center", marginRight: "0.5rem" }}
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
                          setPostos([]);
                          setLocalInfo({ rua: "", estado: "", pais: "" });
                          const coords = await buscarCoordsPorCEP(cepLimpo);
                          if (!coords) {
                            setBuscando(false);
                            return;
                          }
                          await buscarProximos(coords.lat, coords.lon, debouncedRadius);
                        }}
                        style={{ borderRadius: 30, padding: "0.5rem 1rem", fontWeight: 700 }}
                        aria-label="Buscar por CEP"
                      >
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
                  <div className="shadow-sm mb-4 p-4" style={{ background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(25, 135, 84, 0.3)", borderRadius: 16, backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", color: "#000", boxShadow: "0 8px 24px rgba(25, 135, 84, 0.15)" }}>
                    <h6 className="mb-2 d-flex align-items-center" style={{ fontWeight: 800, color: "#0f172a" }}>
                      <FontAwesomeIcon icon={faMapLocationDot} className="me-2" style={{ color: "#0059FF", fontSize: "1.2rem" }} />
                      Sua localização aproximada
                    </h6>
                    <div style={{ fontSize: "0.95rem" }}>
                      <strong>Endereço: </strong>
                      {[localInfo.rua, localInfo.estado, localInfo.pais].filter(Boolean).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0" style={{ fontWeight: 700 }}>
                {tipoBusca === "market"
                  ? `Mercados próximos (até ${(radius / 1000).toFixed(1)} km)`
                  : `Postos próximos (até ${(radius / 1000).toFixed(1)} km) — foco em ${fuelFilter}`}
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
              <motion.div layout className="row gy-4">
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
              </motion.div>
            )}

            {!buscando && tipoBusca === "fuel" && postos.length > 0 && (
              <>
                <BestDealBanner postos={postos} focus={fuelFilter} />
                <motion.div layout className="row gy-4">
                  {postos.map((p, idx) => (
                    <FuelCard
                      key={`${p.type}-${p.id}`}
                      posto={p}
                      onUpdatePrice={handleUpdatePrice}
                      highlight={idx === 0 && p.prices && p.prices[fuelFilter] != null}
                    />
                  ))}
                </motion.div>
              </>
            )}

            {!buscando && ((tipoBusca === "market" && mercados.length === 0) || (tipoBusca === "fuel" && postos.length === 0)) && !erro && (
              <div className="alert alert-info mt-5 text-center" style={{ borderRadius: 12, fontSize: "1rem", background: "#f0f7f5", color: "#196a87ff" }}>
                Nenhum resultado encontrado no raio atual.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BestDealBanner({ postos, focus }) {
  const best = useMemo(() => {
    const withPrice = postos.filter((p) => p?.prices?.[focus] != null);
    if (withPrice.length === 0) return null;
    const sorted = [...withPrice].sort((a, b) => a.prices[focus] - b.prices[focus]);
    return sorted[0];
  }, [postos, focus]);

  if (!best) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="alert alert-success d-flex align-items-center gap-2"
      style={{ borderRadius: 12 }}
    >
      <FontAwesomeIcon icon={faStar} className="me-2" />
      Melhor preço de <strong className="ms-1 me-1">{focus}</strong> por
      <strong className="ms-1">R$ {best.prices[focus].toFixed(3)}</strong>
      em <strong className="ms-1">{best.nome}</strong> ({(best.distance / 1000).toFixed(2)} km)
    </motion.div>
  );
}
