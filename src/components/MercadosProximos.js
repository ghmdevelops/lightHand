import { BiArrowBack } from "react-icons/bi";
import { TbBrandWaze } from "react-icons/tb";
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
  faWallet,
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
import { ref, get, set, remove, onValue, off, update, serverTimestamp, push } from "firebase/database";

const CONTACT_EMAIL = "savvy@suporte.com.br";

const parseAddr = (a) => {
  const rua = a.road || a.pedestrian || a.path || a.neighbourhood || a.suburb || a.locality || a.village || a.town || a.city || "";
  const cidade = a.city || a.town || a.village || a.locality || "";
  const uf = a.state || a.region || a.principalSubdivision || "";
  const estado = [cidade, uf].filter(Boolean).join(" - ");
  const pais = a.country || a.country_name || a.countryName || "";
  return { rua, estado, pais };
};

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const retry = async (fn, tries = 3, delay = 700) => {
  let err;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) { err = e; if (i < tries - 1) await sleep(delay * (i + 1)); }
  }
  throw err;
};

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

function useOpeningStatusLazy(raw) {
  const [state, setState] = useState({ label: "", isOpen: null });
  useEffect(() => {
    let done = false;
    const run = () => {
      if (!done) setState(getOpeningStatus(raw));
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 600 });
    } else {
      setTimeout(run, 0);
    }
    return () => { done = true; };
  }, [raw]);
  return state;
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

function getQuickPosition(timeout = 1500) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não suportada"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      (e) => reject(e),
      { enableHighAccuracy: false, timeout, maximumAge: 60000 }
    );
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

function addressFromTags(tags = {}) {
  const rua = [tags["addr:street"] || tags["addr:road"] || "", tags["addr:housenumber"] || ""].filter(Boolean).join(", ");
  const cidade = tags["addr:city"] || tags["addr:town"] || tags["addr:suburb"] || "";
  const uf = tags["addr:state"] || "";
  const estado = [cidade, uf].filter(Boolean).join(" - ");
  const pais = tags["addr:country"] || "";
  return { rua, estado, pais };
}

const keyOf = (x) => `${x.type}-${x.id}`;

const MarketCard = React.memo(function MarketCard({ market: m, user, onVisit, onToggleFavorito, isFavorited }) {
  const [expanded, setExpanded] = useState(false);
  const fallbackAddr = `${m.lat?.toFixed(4)}, ${m.lon?.toFixed(4)}`;
  const addressText = [m.rua, m.estado, m.pais].filter(Boolean).join(", ") || fallbackAddr;
  const { label: openLabel, isOpen } = useOpeningStatusLazy(m.opening_hours);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(addressText);
      toast.info("Endereço copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const osmLink = `https://www.openstreetmap.org/?mlat=${m.lat}&mlon=${m.lon}#map=18/${m.lat}/${m.lon}`;
  const googleLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`;

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
            <strong>Endereço:</strong> {addressText}
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
  const fallbackAddr = `${posto.lat?.toFixed(4)}, ${posto.lon?.toFixed(4)}`;
  const address = [posto.rua, posto.estado, posto.pais].filter(Boolean).join(", ") || fallbackAddr;
  const { label: openLabel } = useOpeningStatusLazy(posto.opening_hours);
  const g = posto.prices?.gasolina;
  const e = posto.prices?.etanol;
  const d = posto.prices?.diesel;
  const ds10 = posto.prices?.diesel_s10;
  const ds500 = posto.prices?.diesel_s500;
  const gnv = posto.prices?.gnv;
  const updated = posto.updatedAt ? timeAgo(posto.updatedAt) : null;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const est = posto.estimated || {};
  const googleRoute = `https://www.google.com/maps/dir/?api=1&destination=${posto.lat},${posto.lon}&travelmode=driving`;
  const wazeRoute = `https://waze.com/ul?ll=${posto.lat},${posto.lon}&navigate=yes`;

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
            <div className="btn-group">
              <a
                href={googleRoute}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary"
                title="Rota no Google Maps"
              >
                <FontAwesomeIcon icon={faMapLocationDot} className="me-1" />
                Maps
              </a>
              <a
                href={wazeRoute}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-secondary"
                title="Rota no Waze"
              >
                <TbBrandWaze className="me-2" style={{ fontSize: "1.25rem" }} />
                Waze
              </a>
            </div>
          </div>

          <div className="mt-3" style={{ fontSize: "0.95rem" }}>
            <strong>Endereço:</strong> {address}
          </div>

          <div className="mt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faFilter} />
              <strong>Preços</strong>
              {!g && !e && !d && !ds10 && !ds500 && !gnv && <span className="badge bg-light text-dark">sem preço</span>}
              {highlight && <span className="badge bg-success"><FontAwesomeIcon icon={faStar} className="me-1" />melhor preço</span>}
            </div>
            <div className="d-flex flex-wrap gap-2">
              <PriceChip label="Gasolina" value={g} est={!!est.gasolina} />
              <PriceChip label="Etanol" value={e} est={!!est.etanol} />
              <PriceChip label="Diesel" value={d} est={!!est.diesel} />
              {ds10 != null && <PriceChip label="Diesel S10" value={ds10} est={!!est.diesel_s10} />}
              {ds500 != null && <PriceChip label="Diesel S500" value={ds500} est={!!est.diesel_s500} />}
              {gnv != null && <PriceChip label="GNV" value={gnv} est={!!est.gnv} />}
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

const fmtBR = (v, digits = 2) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);

function PriceChip({ label, value, est }) {
  if (value == null) {
    return <span className="badge bg-secondary-subtle text-secondary border">{label}: —</span>;
  }
  const shade = valueToShade(value);
  return (
    <span className="badge border" style={{ background: shade.bg, color: shade.fg, borderColor: shade.border }}>
      {label}: R$ {fmtBR(value, 2)}{est ? " (estimado)" : ""}
    </span>
  );
}

function valueToShade(v) {
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const t = clamp((v - 4) / 2, 0, 1);
  const r = Math.round(16 + t * 200);
  const g = Math.round(200 - t * 120);
  const b = Math.round(16 + t * 60);
  const fg = t > 0.6 ? "#111" : "#0f172a";
  return { bg: `rgba(${r},${g},${b},0.15)`, fg, border: `rgba(${r},${g},${b},0.4)` };
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

function mapFuelKey(tagKeyLower) {
  const k = tagKeyLower;
  if (k.includes("ethanol") || k.includes("etanol") || k.includes("alcool") || k.includes("álcool")) return "etanol";
  if (k.includes("cng") || k.includes("gnv")) return "gnv";
  if (k.includes("diesel") && k.includes("s10")) return "diesel_s10";
  if (k.includes("diesel") && k.includes("s500")) return "diesel_s500";
  if (k.includes("diesel")) return "diesel";
  if (k.includes("gasoline") || k.includes("gasolina") || k.includes("petrol") || k.includes("octane") || k.includes("ron")) return "gasolina";
  return null;
}

function parseFuelPrices(tags = {}) {
  const prices = {};
  for (const [k, v] of Object.entries(tags)) {
    if (!/:price$/i.test(k)) continue;
    const num = parseFloat(String(v).replace(",", "."));
    if (isNaN(num)) continue;
    const mapped = mapFuelKey(k.toLowerCase());
    if (!mapped) continue;
    prices[mapped] = Math.min(prices[mapped] ?? Infinity, num);
  }
  ["price:gasoline", "price:ethanol", "price:diesel", "fuel:cng:price"].forEach((kk) => {
    if (tags[kk]) {
      const mapped = mapFuelKey(kk.toLowerCase());
      const num = parseFloat(String(tags[kk]).replace(",", "."));
      if (!isNaN(num) && mapped) prices[mapped] = Math.min(prices[mapped] ?? Infinity, num);
    }
  });
  Object.keys(prices).forEach((k) => { if (!isFinite(prices[k])) delete prices[k]; });
  return prices;
}

function getOsmUpdatedAt(tags = {}) {
  let dt = null;
  for (const [k, v] of Object.entries(tags)) {
    if (/:price:date$/i.test(k)) {
      const t = Date.parse(v);
      if (!isNaN(t)) dt = Math.max(dt ?? 0, t);
    }
  }
  return dt;
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
  const [welcome, setWelcome] = useState({ show: false, name: "", lastOrder: null });
  const debouncedRadius = useDebounced(radius, 250);
  const deferredQuery = useDeferredValue(query);
  const navigate = useNavigate();
  const reverseCacheRef = useRef({});
  const reverseLimiterRef = useRef(createLimiter(3));
  const overpassCacheRef = useRef(new Map());
  const fetchSeqRef = useRef(0);
  const overpassControllerRef = useRef(null);
  const reverseControllerRef = useRef(null);
  const reverseSeqRef = useRef(0);
  const [communityPrices, setCommunityPrices] = useState({});
  const [addrCache, setAddrCache] = useState({});

  useEffect(() => {
    const refAll = ref(db, "fuelPrices");
    onValue(refAll, (snap) => setCommunityPrices(snap.val() || {}));
    return () => off(refAll);
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoritos(new Set());
      setWelcome({ show: false, name: "", lastOrder: null });
      return;
    }
    const run = async () => {
      try {
        const favRef = ref(db, `usuarios/${user.uid}/favoritos`);
        const favSnap = await get(favRef);
        const data = favSnap.val() || {};
        setFavoritos(new Set(Object.keys(data)));
      } catch {
        setFavoritos(new Set());
      }
      try {
        const uRef = ref(db, `usuarios/${user.uid}`);
        const pRef = ref(db, `usuarios/${user.uid}/pedidos`);
        const [uSnap, pSnap] = await Promise.all([get(uRef), get(pRef)]);
        const u = uSnap.val() || {};
        const pedidos = pSnap.val() || {};
        const name =
          user.displayName ||
          u.nome ||
          u.name ||
          (u.profile && (u.profile.firstName || u.profile.name)) ||
          (u.perfil && (u.perfil.nome || u.perfil.nomeCompleto)) ||
          "";
        let last = null;
        Object.entries(pedidos).forEach(([pid, p]) => {
          const t = Date.parse(p.dataHora || p.createdAt || p.timestamp || 0) || 0;
          if (!last || t > last._t) last = { id: pid, ...p, _t: t };
        });
        const firstName = (name || "").split(" ")[0] || "";
        setWelcome({ show: !!last, name: firstName, lastOrder: last });
      } catch {
        setWelcome({ show: false, name: "", lastOrder: null });
      }
    };
    run();
  }, [user]);

  const getEnderecoFromCoords = useCallback(async (lat, lon, controller) => {
    const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    if (reverseCacheRef.current[key]) return reverseCacheRef.current[key];
    const fn = async () => {
      try {
        const r1 = await retry(
          () => requestWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&accept-language=pt-BR`,
            { headers: { "Accept-Language": "pt-BR", "Referrer-Policy": "strict-origin-when-cross-origin" } },
            12000,
            controller
          ),
          2,
          700
        );
        if (r1.ok) {
          const j1 = await r1.json();
          const a1 = j1?.address ? parseAddr(j1.address) : null;
          if (a1 && (a1.rua || a1.estado || a1.pais)) {
            reverseCacheRef.current[key] = a1;
            return a1;
          }
        }
      } catch { }
      try {
        const r2 = await retry(
          () => requestWithTimeout(
            `https://geocode.maps.co/reverse?lat=${lat}&lon=${lon}&accept-language=pt-BR`,
            {},
            12000,
            controller
          ),
          2,
          700
        );
        if (r2.ok) {
          const j2 = await r2.json();
          const a2 = j2?.address ? parseAddr(j2.address) : null;
          if (a2 && (a2.rua || a2.estado || a2.pais)) {
            reverseCacheRef.current[key] = a2;
            return a2;
          }
        }
      } catch { }
      try {
        const r3 = await retry(
          () => requestWithTimeout(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`,
            {},
            12000,
            controller
          ),
          2,
          700
        );
        if (r3.ok) {
          const j3 = await r3.json();
          const a3 = parseAddr(j3 || {});
          if (a3 && (a3.rua || a3.estado || a3.pais)) {
            reverseCacheRef.current[key] = a3;
            return a3;
          }
        }
      } catch { }
      const fallback = { rua: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, estado: "", pais: "" };
      reverseCacheRef.current[key] = fallback;
      return fallback;
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
    if (cached && Date.now() - cached.ts < 15 * 60 * 1000) return cached.data;
    if (overpassControllerRef.current) overpassControllerRef.current.abort("new-request");
    const controller = new AbortController();
    overpassControllerRef.current = controller;
    for (const ep of overpassEndpoints) {
      try {
        const url = `${ep}?data=${encodeURIComponent(queryStr)}`;
        const res = await requestWithTimeout(url, {}, 15000, controller);
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
        [out:json][timeout:15];
        (
          node["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
          way["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
          relation["shop"~"supermarket|convenience|grocery"](around:${rad},${lat},${lon});
        );
        out body center qt;
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
          const tags = e.tags || {};
          const addr = addressFromTags(tags);
          const distance = haversine(lat, lon, lat0, lon0);
          return {
            id: `${e.id}`,
            type: e.type,
            nome: tags.name || "Mercado",
            tipo: tags.shop || "",
            brand: tags.brand || "",
            lat: lat0,
            lon: lon0,
            distance,
            rawTags: tags,
            opening_hours: tags.opening_hours || null,
            phone: tags.phone || tags["contact:phone"] || null,
            website: tags.website || tags.url || null,
            operator: tags.operator || null,
            description: tags.description || null,
            ...addr,
            _needsReverse: !(addr.rua || addr.estado || addr.pais),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
      return markets;
    } catch {
      return [];
    }
  }, [overpassFetch]);

  const mergeCommunity = useCallback((id, osmPrices, updatedAtOSM = null) => {
    const c = communityPrices?.[id] || {};
    const merged = { ...osmPrices };
    let updatedAt = updatedAtOSM || null;
    ["gasolina", "etanol", "diesel", "gnv", "diesel_s10", "diesel_s500"].forEach((k) => {
      const r = c[k];
      if (!r) return;
      merged[k] = r.price;
      if (!updatedAt || (r.updatedAt && r.updatedAt > updatedAt)) updatedAt = r.updatedAt;
    });
    return { prices: merged, updatedAt };
  }, [communityPrices]);

  const pPrice = (p, fuelKey) => p?.prices?.[fuelKey];
  const PRICE_RANGES = {
    gasolina: [5.10, 7.10],
    etanol: [3.20, 5.00],
    diesel: [5.40, 7.60],
    diesel_s10: [5.50, 7.80],
    diesel_s500: [5.30, 7.40],
    gnv: [3.80, 5.40],
  };

  function seededRand(seed) {
    const n = typeof seed === "number" ? seed : Array.from(String(seed)).reduce((a, c) => a + c.charCodeAt(0), 0);
    const x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function fakePrice(key, seed) {
    const [min, max] = PRICE_RANGES[key] || [4.50, 7.50];
    const v = min + seededRand(seed) * (max - min);
    return Math.round(v * 100) / 100;
  }

  const fetchNearbyFuel = useCallback(async (lat, lon, rad = 4000, limit = 15, fuelKey = "gasolina") => {
    try {
      const q = `
        [out:json][timeout:15];
        (
          node["amenity"="fuel"](around:${rad},${lat},${lon});
          way["amenity"="fuel"](around:${rad},${lat},${lon});
          relation["amenity"="fuel"](around:${rad},${lat},${lon});
        );
        out tags center qt;
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
          const tags = e.tags || {};
          const osmPrices = parseFuelPrices(tags);
          const updatedAtOSM = getOsmUpdatedAt(tags);
          const addr = addressFromTags(tags);
          const merged = mergeCommunity(`${e.id}`, osmPrices, updatedAtOSM);
          const prices = { ...(merged.prices || {}) };
          const estimated = {};
          if (prices[fuelKey] == null) {
            prices[fuelKey] = fakePrice(fuelKey, Number(e.id));
            estimated[fuelKey] = true;
          }
          return {
            id: `${e.id}`,
            type: e.type,
            nome: (tags.name || tags.brand) || "Posto",
            brand: tags.brand || "",
            lat: lat0,
            lon: lon0,
            distance,
            opening_hours: tags.opening_hours || null,
            phone: tags.phone || tags["contact:phone"] || null,
            website: tags.website || tags.url || null,
            rawTags: tags,
            prices,
            estimated,
            updatedAt: merged.updatedAt || Date.now(),
            ...addr,
            _needsReverse: !(addr.rua || addr.estado || addr.pais),
          };
        })
        .filter(Boolean);
      const filtered = stationsRaw.filter((p) => !hasPriceOnly || (p.prices && Object.keys(p.prices).length > 0));
      const sorted = filtered.sort((a, b) => {
        if (sortFuel === "distance") return a.distance - b.distance;
        const pa = pPrice(a, fuelKey);
        const pb = pPrice(b, fuelKey);
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return a.distance - b.distance;
      });
      return sorted.slice(0, limit);
    } catch {
      return [];
    }
  }, [overpassFetch, hasPriceOnly, sortFuel, mergeCommunity]);

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
      let found = false;
      for (let i = 0; i < tryRadii.length; i++) {
        const r = tryRadii[i];
        if (tipoBusca === "market") {
          const lista = await fetchNearbyMarkets(lat, lon, r, 24);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0) {
            setMercados(applyMarketSortAndFilters(lista, sortMarket, deferredQuery));
            setErro("");
            found = true;
            break;
          }
        } else if (tipoBusca === "fuel") {
          const lista = await fetchNearbyFuel(lat, lon, r, 20, fuelFilter);
          if (seq !== fetchSeqRef.current) return;
          if (lista.length > 0) {
            setPostos(applyFuelSortAndFilters(lista, sortFuel, fuelFilter, deferredQuery));
            setErro("");
            found = true;
            break;
          }
        }
      }
      if (!found) {
        if (tipoBusca === "market") setErro("Nenhum mercado encontrado no raio pesquisado.");
        else if (tipoBusca === "fuel") setErro("Nenhum posto encontrado no raio pesquisado.");
      }
    } catch {
      if (seq !== fetchSeqRef.current) return;
      setErro("Não foi possível buscar locais.");
    } finally {
      if (seq === fetchSeqRef.current) setBuscando(false);
    }
  }, [tipoBusca, getEnderecoFromCoords, fetchNearbyMarkets, fetchNearbyFuel, sortMarket, sortFuel, fuelFilter, deferredQuery]);

  useEffect(() => {
    if (!pos) return;
    const seq = ++reverseSeqRef.current;
    if (reverseControllerRef.current) reverseControllerRef.current.abort("new-reverse-batch");
    const controller = new AbortController();
    reverseControllerRef.current = controller;
    const list = tipoBusca === "market" ? mercados : postos;
    const need = list.filter((x) => x._needsReverse && !addrCache[keyOf(x)]).slice(0, 8);
    let cancelled = false;
    (async () => {
      for (const it of need) {
        const a = await getEnderecoFromCoords(it.lat, it.lon, controller);
        if (cancelled || seq !== reverseSeqRef.current) return;
        setAddrCache((prev) => ({ ...prev, [keyOf(it)]: a }));
      }
    })();
    return () => {
      cancelled = true;
      controller.abort("cleanup");
    };
  }, [mercados, postos, tipoBusca, pos, getEnderecoFromCoords, addrCache]);

  const handleBuscarLocalizacao = useCallback(async () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setPostos([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    try {
      let quick = null;
      try {
        quick = await getQuickPosition(1500);
      } catch { }
      if (quick) {
        await buscarProximos(quick.coords.latitude, quick.coords.longitude, debouncedRadius);
      }
      const posObj = await retry(() => getAccuratePosition({ desiredAccuracy: 30, maxWait: 5000 }), 2, 500);
      if (posObj) {
        const hadQuick = !!quick;
        if (!hadQuick) {
          await buscarProximos(posObj.coords.latitude, posObj.coords.longitude, debouncedRadius);
        } else {
          const d = haversine(quick.coords.latitude, quick.coords.longitude, posObj.coords.latitude, posObj.coords.longitude);
          if (d > 250) {
            await buscarProximos(posObj.coords.latitude, posObj.coords.longitude, debouncedRadius);
          }
        }
      }
    } catch {
      try {
        const resp = await retry(() => requestWithTimeout("https://ipapi.co/json/", {}, 12000), 3, 800);
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        if (data?.latitude && data?.longitude) {
          await buscarProximos(data.latitude, data.longitude, debouncedRadius);
        } else {
          throw new Error();
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

  useEffect(() => {
    if (!pos) return;
    if (tipoBusca === "market") {
      setMercados((prev) => {
        const merged = prev.map((m) => ({ ...m, ...(addrCache[keyOf(m)] || {}) }));
        return applyMarketSortAndFilters(merged, sortMarket, deferredQuery);
      });
    } else if (tipoBusca === "fuel") {
      setPostos((prev) => {
        const merged = prev.map((p) => ({ ...p, ...(addrCache[keyOf(p)] || {}) }));
        return applyFuelSortAndFilters(merged, sortFuel, fuelFilter, deferredQuery);
      });
    }
  }, [sortMarket, sortFuel, deferredQuery, fuelFilter, tipoBusca, pos, addrCache]);

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
    const n = (x) => {
      const v = parseFloat(String(x).replace(",", "."));
      return isNaN(v) ? null : v;
    };
    const g = n(formValues.pg);
    const e = n(formValues.pe);
    const d = n(formValues.pd);
    if (g != null) patch["gasolina"] = { price: g, updatedAt: serverTimestamp(), by: user.uid };
    if (e != null) patch["etanol"] = { price: e, updatedAt: serverTimestamp(), by: user.uid };
    if (d != null) patch["diesel"] = { price: d, updatedAt: serverTimestamp(), by: user.uid };
    if (Object.keys(patch).length === 0) return;
    await update(path, patch);
    toast.success("Preço atualizado!");
    if (pos && tipoBusca === "fuel") buscarProximos(pos.lat, pos.lon, debouncedRadius);
  };

  const handleRepetirUltimaCompra = useCallback(async () => {
    if (!user || !welcome.lastOrder) {
      toast.info("Não encontramos uma compra anterior.");
      return;
    }
    try {
      const itens = (welcome.lastOrder.itens || []).map((it) => ({
        name: it.nome,
        price: it.preco || 0,
        qtd: it.qtd || it.quantidade || 1,
      }));
      if (itens.length === 0) {
        toast.info("Sua última compra não possui itens.");
        return;
      }
      const novo = { criadoEm: Date.now(), items: itens };
      const cartsRef = ref(db, `usuarios/${user.uid}/carts`);
      const newRef = await push(cartsRef, novo);
      const newId = newRef.key;
      setWelcome((w) => ({ ...w, show: false }));
      navigate(`/comparar-carrinhos?ids=${newId}&selected=${newId}`);
    } catch {
      toast.error("Não foi possível preparar sua última compra.");
    }
  }, [user, welcome]);

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

  const approxText = pos ? ([localInfo.rua, localInfo.estado, localInfo.pais].filter(Boolean).join(", ") || `${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`) : "";

  return (
    <div className="container my-5 px-2 px-md-4" style={{ zIndex: 2, paddingTop: "5px" }}>
      <ToastContainer position="top-right" pauseOnHover />
      <AnimatePresence mode="wait">
        {showIntro ? (
          <motion.section
            key="intro"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, when: "beforeChildren", staggerChildren: 0.06 }
              }
            }}
            className="d-flex align-items-center justify-content-center text-center"
            style={{ minHeight: "80vh", padding: "2rem" }}
            role="region"
            aria-labelledby="intro-title"
            tabIndex={0}
            onKeyDown={(e) => {
              const k = e.key.toLowerCase();
              if (k === "enter" || k === " ") setShowIntro(false);
            }}
          >
            <motion.div
              className="p-4 p-md-5 shadow-sm"
              style={{
                maxWidth: 820,
                borderRadius: 24,
                background: "linear-gradient(135deg,#f8fafc 0%, #eef2ff 100%)",
                border: "1px solid #e5e7eb",
                boxShadow: "0 16px 40px rgba(2,6,23,.12)"
              }}
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
            >
              <motion.div
                className="d-flex justify-content-center gap-3 mb-4"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
              >
                {[
                  { bg: "#0d6efd", icon: faStore },
                  { bg: "#10b981", icon: faGasPump },
                  { bg: "#6366f1", icon: faMapLocationDot }
                ].map((it, i) => (
                  <motion.div
                    key={i}
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 70, height: 70, borderRadius: "50%", background: it.bg, color: "#fff" }}
                    variants={{ hidden: { opacity: 0, y: 8, scale: .9 }, show: { opacity: 1, y: 0, scale: 1 } }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <FontAwesomeIcon icon={it.icon} size="lg" />
                  </motion.div>
                ))}
              </motion.div>

              <motion.h2
                id="intro-title"
                className="fw-bold mb-3"
                style={{ color: "#0f172a", fontSize: "1.4rem" }}
                variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
              >
                Compare e economize perto de você
              </motion.h2>

              <motion.p
                className="mb-2"
                style={{ color: "#334155", fontSize: "1rem" }}
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              >
                Mercados e postos próximos, preços atualizados e comparador inteligente.
                Tudo em uma experiência rápida, prática e feita para você.
              </motion.p>

              <motion.div
                className="d-flex flex-column flex-md-row justify-content-center gap-3 mb-3"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              >
                <div className="d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faClock} className="text-primary" />
                  <span>Economize tempo</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faWallet} className="text-success" />
                  <span>Gaste menos</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <FontAwesomeIcon icon={faMapLocationDot} className="text-info" />
                  <span>Veja o que está perto</span>
                </div>
              </motion.div>

              <motion.div
                className="d-flex flex-wrap justify-content-center gap-3 mb-3"
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              >
                <motion.button
                  className="btn btn-lg px-5"
                  onClick={() => setShowIntro(false)}
                  aria-label="Começar agora"
                  style={{
                    borderRadius: 16,
                    background: "linear-gradient(135deg,#0ea5e9,#2563eb)",
                    color: "#fff",
                    border: "none",
                    boxShadow: "0 10px 28px rgba(37,99,235,.3)",
                    fontWeight: 700
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Começar
                </motion.button>
              </motion.div>

              <motion.p
                className="mt-4 text-muted"
                style={{ fontSize: ".95rem" }}
                variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: .1 } } }}
              >
                +500 usuários já estão economizando com a gente 💙
              </motion.p>
            </motion.div>
          </motion.section>
        ) : !tipoBusca ? (
          <motion.section
            key="choose-type"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.25, when: "beforeChildren", staggerChildren: 0.06 } }
            }}
            className="text-center mt-5"
            style={{ zIndex: 2, paddingTop: 60 }}
            role="region"
            aria-labelledby="choose-type-title"
            onKeyDown={(e) => {
              if (e.key.toLowerCase() === "m") setTipoBusca("market");
              if (["p", "f"].includes(e.key.toLowerCase())) setTipoBusca("fuel");
            }}
            tabIndex={0}
          >
            {welcome.show && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="card border-0 shadow-lg mb-4 mx-auto"
                style={{
                  maxWidth: 720,
                  borderRadius: 20,
                  background: "linear-gradient(135deg,#f0f9ff 0%, #ffffff 100%)",
                  border: "1px solid #e2e8f0",
                  width: "100%",
                }}
              >
                <div className="card-body d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-3 p-3 p-md-4">
                  <div className="text-start flex-grow-1">
                    <div
                      className="fw-bold"
                      style={{ fontSize: "1.125rem", color: "#0f172a", lineHeight: 1.4 }}
                    >
                      👋 Olá{welcome.name ? `, ${welcome.name}` : ""}!
                    </div>
                    <div className="text-muted" style={{ fontSize: "1rem", lineHeight: 1.5 }}>
                      Que bom te ver de novo. Deseja continuar normalmente e fazer novas escolhas
                      ou repetir sua última compra?
                    </div>
                  </div>

                  <div className="d-grid d-md-flex gap-2 w-100 w-md-auto">
                    <button
                      className="btn btn-light border fw-semibold px-3 py-2"
                      onClick={() => setWelcome((w) => ({ ...w, show: false }))}
                      style={{
                        borderRadius: 14,
                        borderColor: "#cbd5e1",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                    >
                      Continuar normalmente
                    </button>
                    <button
                      className="btn fw-semibold px-3 py-2"
                      onClick={handleRepetirUltimaCompra}
                      style={{
                        borderRadius: 14,
                        background: "linear-gradient(135deg,#3b82f6,#2563eb)",
                        color: "white",
                        boxShadow: "0 2px 6px rgba(37, 99, 235, 0.4)",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                    >
                      🔄 Repetir última compra
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {!welcome.show && (
              <>
                <motion.h3
                  id="choose-type-title"
                  className="fw-bold mb-4"
                  style={{ color: "#0d6efd" }}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                >
                  O que você quer encontrar?
                </motion.h3>

                <div className="d-flex justify-content-center gap-3 gap-md-4 flex-wrap" style={{ maxWidth: 680, margin: "0 auto" }}>
                  <motion.button
                    type="button"
                    onClick={() => setTipoBusca("market")}
                    aria-label="Procurar mercados próximos"
                    variants={{ hidden: { opacity: 0, y: 10, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-lg d-flex align-items-center justify-content-center shadow"
                    style={{
                      borderRadius: 16,
                      padding: "1rem 1.5rem",
                      minWidth: 260,
                      background: "linear-gradient(135deg,#2563eb,#3b82f6)",
                      color: "#fff",
                      border: "none"
                    }}
                  >
                    <FontAwesomeIcon icon={faStore} size="lg" className="me-3" />
                    <div className="text-start">
                      <div className="fw-bold" style={{ fontSize: "1.05rem" }}>Mercados</div>
                      <div className="opacity-90" style={{ fontSize: ".9rem" }}>Supermercados e mercearias perto de você</div>
                    </div>
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setTipoBusca("fuel")}
                    aria-label="Procurar postos de gasolina próximos"
                    variants={{ hidden: { opacity: 0, y: 10, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn btn-lg d-flex align-items-center justify-content-center"
                    style={{
                      borderRadius: 16,
                      padding: "1rem 1.5rem",
                      minWidth: 240,
                      background: "#fff",
                      color: "#0d6efd",
                      border: "2px solid #cfe0ff",
                      boxShadow: "0 6px 18px rgba(13,110,253,.10)"
                    }}
                  >
                    <FontAwesomeIcon icon={faGasPump} size="lg" className="me-3" />
                    <div className="text-start">
                      <div className="fw-bold" style={{ fontSize: "1.05rem" }}>Postos de gasolina</div>
                      <div className="text-muted" style={{ fontSize: ".9rem" }}>Encontre preços e distância rapidamente</div>
                    </div>
                  </motion.button>
                </div>
              </>
            )}

            <motion.p
              className="mt-3 text-muted"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.2 } } }}
              style={{ fontSize: ".9rem" }}
            >
            </motion.p>
          </motion.section>

        ) : !modoBusca ? (
          <motion.section
            key="choose-mode"
            initial="hidden"
            animate="show"
            exit="hidden"
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.25, when: "beforeChildren", staggerChildren: 0.06 }
              }
            }}
            className="text-center mt-5"
            style={{ zIndex: 2, paddingTop: 60 }}
            role="region"
            aria-labelledby="choose-mode-title"
            tabIndex={0}
          >

            <motion.h3
              id="choose-mode-title"
              className="fw-bold mb-3"
              style={{ color: "#0d6efd" }}
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            >
              {tipoBusca === "market"
                ? "Vamos localizar mercados próximos!"
                : "Vamos localizar os melhores postos próximos!"}
            </motion.h3>

            {tipoBusca === "fuel" && (
              <motion.div
                className="mb-3 d-flex justify-content-center align-items-center gap-2"
                variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              >
                <span className="text-muted">Combustível:</span>

                <div className="d-none d-md-inline-flex btn-group" role="group" aria-label="Escolher tipo de combustível">
                  {["gasolina", "etanol", "diesel", "diesel_s10", "diesel_s500", "gnv"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn btn-sm ${fuelFilter === t ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setFuelFilter(t)}
                    >
                      {t === "diesel_s10" ? "Diesel S10" : t === "diesel_s500" ? "Diesel S500" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <select
                  className="form-select w-auto d-md-none"
                  value={fuelFilter}
                  onChange={(e) => setFuelFilter(e.target.value)}
                  aria-label="Selecionar combustível"
                >
                  <option value="gasolina">Gasolina</option>
                  <option value="etanol">Etanol</option>
                  <option value="diesel">Diesel</option>
                  <option value="diesel_s10">Diesel S10</option>
                  <option value="diesel_s500">Diesel S500</option>
                  <option value="gnv">GNV</option>
                </select>
              </motion.div>
            )}

            <div className="d-flex justify-content-center gap-3 gap-md-4 flex-wrap" style={{ maxWidth: 520, margin: "0 auto" }}>
              <motion.button
                type="button"
                onClick={() => { setModoBusca("local"); handleBuscarLocalizacao(); }}
                aria-label="Usar minha localização atual"
                variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-lg d-flex align-items-center justify-content-center shadow"
                style={{
                  borderRadius: 16,
                  padding: "1rem 1.5rem",
                  minWidth: 240,
                  background: "linear-gradient(135deg,#0ea5e9,#2563eb)",
                  color: "#fff",
                  border: "none"
                }}
              >
                <FontAwesomeIcon icon={faMapLocationDot} size="lg" className="me-3" />
                <div className="text-start">
                  <div className="fw-bold" style={{ fontSize: "1.05rem" }}>Usar minha localização</div>
                  <div className="opacity-90" style={{ fontSize: ".9rem" }}>Mais rápido e preciso</div>
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setModoBusca("cep")}
                aria-label="Digitar CEP manualmente"
                variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-lg d-flex align-items-center justify-content-center"
                style={{
                  borderRadius: 16,
                  padding: "1rem 1.5rem",
                  minWidth: 240,
                  background: "#fff",
                  color: "#0d6efd",
                  border: "2px solid #cfe0ff",
                  boxShadow: "0 6px 18px rgba(13,110,253,.10)"
                }}
              >
                <FiMapPin size={22} className="me-3" />
                <div className="text-start">
                  <div className="fw-bold" style={{ fontSize: "1.05rem" }}>Digitar CEP</div>
                  <div className="text-muted" style={{ fontSize: ".9rem" }}>Buscar por endereço</div>
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setTipoBusca(null)}
                aria-label="Voltar para a etapa anterior"
                variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, show: { opacity: 1, y: 0, scale: 1 } }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="btn btn-lg d-flex align-items-center justify-content-center shadow"
                style={{
                  borderRadius: 16,
                  padding: "1rem 1.5rem",
                  minWidth: 240,
                  background: "linear-gradient(135deg,#0ea5e9,#2563eb)",
                  color: "#fff",
                  border: "none"
                }}
              >
                <BiArrowBack className="me-3" />
                <div className="text-start">
                  <div className="fw-bold" style={{ fontSize: "1.05rem" }}>Voltar</div>
                </div>
              </motion.button>
            </div>

            <motion.p
              className="mt-3 text-muted"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.15 } } }}
              style={{ fontSize: ".9rem" }}
            >
            </motion.p>
          </motion.section>

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

              <div className="row g-2 align-items-center">
                <div className="col-12 col-md-4 col-lg-4">
                  <div className="input-group w-100">
                    <span className="input-group-text">
                      <FontAwesomeIcon icon={faSearch} />
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={tipoBusca === "market" ? "Buscar mercado/brand" : "Buscar posto/brand"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-4 col-lg-3">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-muted d-none d-md-inline">
                      <FontAwesomeIcon icon={faSliders} />
                    </span>
                    <input
                      type="range"
                      className="form-range flex-grow-1"
                      min={1000}
                      max={10000}
                      step={500}
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                    />
                    <span className="text-nowrap" style={{ minWidth: 72, textAlign: "right" }}>
                      {(radius / 1000).toFixed(1)} km
                    </span>
                  </div>
                </div>
                {tipoBusca === "fuel" ? (
                  <div className="col-12 col-sm-6 col-md-4 col-lg-5">
                    <div className="row g-2 align-items-center">
                      <div className="col-6 col-lg-4">
                        <select
                          className="form-select form-select-sm w-100"
                          value={fuelFilter}
                          onChange={(e) => setFuelFilter(e.target.value)}
                        >
                          <option value="gasolina">Gasolina</option>
                          <option value="etanol">Etanol</option>
                          <option value="diesel">Diesel</option>
                          <option value="diesel_s10">Diesel S10</option>
                          <option value="diesel_s500">Diesel S500</option>
                          <option value="gnv">GNV</option>
                        </select>
                      </div>

                      <div className="col-6 col-lg-4">
                        <div className="form-check form-switch d-flex align-items-center">
                          <input
                            className="form-check-input me-2"
                            type="checkbox"
                            id="hasPrice"
                            checked={hasPriceOnly}
                            onChange={(e) => setHasPriceOnly(e.target.checked)}
                          />
                          <label className="form-check-label text-truncate" htmlFor="hasPrice">
                            Só com preço
                          </label>
                        </div>
                      </div>

                      <div className="col-12 col-lg-4">
                        <div className="d-flex align-items-center gap-2">
                          <span className="d-none d-lg-inline">
                            <FontAwesomeIcon icon={faSort} /> Ordenar:
                          </span>
                          <select
                            className="form-select form-select-sm w-100"
                            value={sortFuel}
                            onChange={(e) => setSortFuel(e.target.value)}
                          >
                            <option value="price">Preço</option>
                            <option value="distance">Distância</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="col-12 col-sm-6 col-md-4 col-lg-5">
                    <div className="d-flex align-items-center gap-2">
                      <span className="d-none d-lg-inline">
                        <FontAwesomeIcon icon={faSort} /> Ordenar:
                      </span>
                      <select
                        className="form-select form-select-sm w-auto"
                        value={sortMarket}
                        onChange={(e) => setSortMarket(e.target.value)}
                      >
                        <option value="distance">Distância</option>
                        <option value="name">Nome</option>
                      </select>
                    </div>
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
                      {approxText}
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
                {mercados.map((m) => {
                  const addr = addrCache[keyOf(m)];
                  return (
                    <MarketCard
                      key={`${m.type}-${m.id}`}
                      market={{ ...m, ...(addr || {}) }}
                      user={user}
                      onVisit={registrarVisitaEVerOfertas}
                      onToggleFavorito={toggleFavorito}
                      isFavorited={favoritos.has(m.id)}
                    />
                  );
                })}
              </motion.div>
            )}

            {!buscando && tipoBusca === "fuel" && postos.length > 0 && (
              <>
                <BestDealBanner postos={postos.map((p) => ({ ...p, ...(addrCache[keyOf(p)] || {}) }))} focus={fuelFilter} />
                <motion.div layout className="row gy-4">
                  {postos.map((p, idx) => {
                    const addr = addrCache[keyOf(p)];
                    return (
                      <FuelCard
                        key={`${p.type}-${p.id}`}
                        posto={{ ...p, ...(addr || {}) }}
                        onUpdatePrice={handleUpdatePrice}
                        highlight={idx === 0 && p.prices && p.prices[fuelFilter] != null}
                      />
                    );
                  })}
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
    const items = postos
      .filter((p) => p?.prices?.[focus] != null)
      .map((p) => ({ p, est: !!(p.estimated && p.estimated[focus]) }));
    if (items.length === 0) return null;
    const real = items.filter((x) => !x.est);
    const pool = real.length ? real : items;
    pool.sort((a, b) => a.p.prices[focus] - b.p.prices[focus]);
    return pool[0];
  }, [postos, focus]);

  if (!best) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="alert alert-success d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-2"
      style={{ borderRadius: 12 }}
    >
      <div className="d-flex align-items-center gap-2 flex-wrap">
        <FontAwesomeIcon icon={faStar} className="me-1 flex-shrink-0" />

        <div className="d-flex flex-wrap align-items-center gap-1 text-wrap">
          <span>Melhor preço de</span>
          <strong className="text-capitalize">{focus}</strong>
          <span>por</span>
          <span className="badge bg-light text-dark border fw-semibold">
            R$ {fmtBR(best.p.prices[focus], 2)}
          </span>
          {best.est && <span className="text-muted">(estimado)</span>}

          <span className="d-block d-sm-inline">
            em{" "}
            <strong
              className="text-truncate d-inline-block"
              style={{ maxWidth: "70vw" }}
              title={best.p.nome}
            >
              {best.p.nome}
            </strong>
          </span>
        </div>
      </div>

      <div className="mt-1 mt-sm-0">
        <span className="badge bg-success-subtle text-success border">
          {(best.p.distance / 1000).toFixed(2)} km
        </span>
      </div>
    </motion.div>
  );
}
