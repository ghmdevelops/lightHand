import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, get, push, update } from "firebase/database";
import Swal from "sweetalert2";

function useQuery() {
  return new URLSearchParams(window.location.search);
}

function haversine(a, o, n, r) {
  const t = (e) => (e * Math.PI) / 180;
  const s = 6371;
  const c = t(n - a);
  const i = t(r - o);
  const d = Math.sin(c / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(n)) * Math.sin(i / 2) ** 2;
  return (2 * Math.atan2(Math.sqrt(d), Math.sqrt(1 - d))) * s * 1000;
}

async function fetchNearbyMarkets(a, o, n = 4000, r = 15) {
  const c = `[out:json][timeout:25];
(
  node["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
  way["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
  relation["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
);
out center;`;
  const i = await fetch("https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(c));
  const d = await i.json();
  const s = d.elements || [];
  return s
    .map((l) => {
      const e = l.type === "node" ? l.lat : l.center?.lat;
      const t = l.type === "node" ? l.lon : l.center?.lon;
      if (e == null || t == null) return null;
      const u = l.tags || {};
      const m = u.name || "Mercado";
      const p = haversine(a, o, e, t);
      const b = u["addr:street"] || "";
      const g = u["addr:housenumber"] || "";
      const f = u["addr:city"] || u["addr:town"] || "";
      const h = u["addr:state"] || "";
      const y = u["addr:postcode"] || "";
      const v = `${b}${g ? ", " + g : ""}${f ? " - " + f : ""}${h ? "/" + h : ""}${y ? " - CEP " + y : ""}`;
      return { id: l.id.toString(), nome: m, distance: p, lat: e, lon: t, endereco: v, cep: y };
    })
    .filter(Boolean)
    .sort((l, x) => l.distance - x.distance)
    .slice(0, r);
}

const CARD_STORAGE_KEY = "savvy_payment_card";
const PIX_STORAGE_KEY = "savvy_payment_pix";

function loadCardFromStorage() {
  try {
    const raw = localStorage.getItem(CARD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { holder: "", number: "", expiry: "", cvv: "" };
  } catch {
    return { holder: "", number: "", expiry: "", cvv: "" };
  }
}

function loadPixFromStorage() {
  try {
    const raw = localStorage.getItem(PIX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { type: "cpf", key: "" };
  } catch {
    return { type: "cpf", key: "" };
  }
}

function saveCardToStorage(card) {
  try {
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(card));
  } catch {}
}

function savePixToStorage(pix) {
  try {
    localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify(pix));
  } catch {}
}

function sanitizeCardForDB(card) {
  const digits = String(card.number || "").replace(/\D/g, "");
  const last4 = digits.slice(-4);
  return { holder: card.holder || "", last4, expiry: card.expiry || "" };
}

function maskPixKey(key) {
  if (!key) return "";
  const k = String(key);
  if (k.length <= 6) return k[0] + "***" + k[k.length - 1];
  return k.slice(0, 3) + "****" + k.slice(-3);
}

function formatCardNumber(val) {
  const digits = val.replace(/\D/g, "").slice(0, 19);
  const groups = digits.match(/.{1,4}/g) || [];
  return groups.join(" ");
}

function detectBrand(digits) {
  if (/^4/.test(digits)) return "Visa";
  if (/^5[1-5]/.test(digits) || /^2(2|3|4|5|6|7|8|9)/.test(digits)) return "Mastercard";
  if (/^3[47]/.test(digits)) return "Amex";
  if (/^6(011|5)/.test(digits)) return "Discover";
  return "Cartão";
}

async function askPayment(totalBRL = "", pixKeyPrefill = "") {
  const cachedCard = loadCardFromStorage();
  const cachedPix = loadPixFromStorage();
  const initialBrand = detectBrand(String(cachedCard.number || "").replace(/\D/g, ""));
  const { value: data, isConfirmed } = await Swal.fire({
    title: "Pagamento",
    html: `
<style>
.pay-wrap{font-family:Inter,system-ui,Arial,sans-serif;text-align:left}
.pay-tabs{display:flex;gap:.5rem;margin-bottom:12px}
.pay-tab{flex:1;padding:.6rem 1rem;border:1px solid #e5e7eb;background:#fff;border-radius:12px;cursor:pointer;font-weight:600}
.pay-tab.active{background:linear-gradient(180deg,#0ea5e9,#0284c7);color:#fff;border-color:#0284c7}
.pay-note{font-size:.85rem;color:#64748b;margin-bottom:10px}
.card-preview{position:relative;width:100%;border-radius:16px;padding:18px;background:linear-gradient(135deg,#111827,#0b1e3a);color:#e5e7eb;box-shadow:0 12px 30px rgba(2,132,199,.25);margin-bottom:12px}
.card-chip{width:34px;height:24px;border-radius:6px;background:linear-gradient(135deg,#f1c40f,#f39c12)}
.card-row{display:flex;justify-content:space-between;align-items:center;margin-top:10px}
.card-num{letter-spacing:2px;font-size:1.1rem;font-weight:600}
.card-meta{display:flex;justify-content:space-between;gap:1rem;font-size:.9rem;color:#cbd5e1}
.pay-grid{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.pay-grid-1{display:grid;grid-template-columns:1fr;gap:.6rem}
.pay-input{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.7rem .9rem;font-size:1rem}
.pay-input:focus{outline:none;border-color:#0284c7;box-shadow:0 0 0 3px rgba(2,132,199,.15)}
.pill-group{display:flex;flex-wrap:wrap;gap:.4rem;margin:.2rem 0 .6rem}
.pill{padding:.45rem .8rem;border:1px solid #e5e7eb;border-radius:999px;cursor:pointer;font-size:.9rem;background:#fff}
.pill.active{background:#ecfeff;border-color:#06b6d4;color:#0369a1}
.qr-box{border:1px dashed #cbd5e1;border-radius:12px;padding:12px;text-align:center;color:#475569;background:#f8fafc}
.save-row{display:flex;align-items:center;gap:.5rem;margin-top:.6rem}
.amount-tag{font-size:.9rem;font-weight:700;color:#0f172a;background:#e0f2fe;border:1px solid #bae6fd;padding:.25rem .5rem;border-radius:8px;display:inline-block}
</style>
<div class="pay-wrap">
<div class="pay-tabs">
<button type="button" class="pay-tab active" data-tab="card">Cartão</button>
<button type="button" class="pay-tab" data-tab="pix">PIX</button>
</div>
<div class="pay-note">Total ${totalBRL ? `<span class="amount-tag">${totalBRL}</span>` : ""}</div>
<div id="tab-card" class="tab-panel">
<div class="card-preview">
<div class="card-chip"></div>
<div class="card-row" style="margin-top:10px">
<div class="card-brand" style="font-weight:700">${initialBrand}</div>
<div class="card-num" id="cv-num">${formatCardNumber(cachedCard.number || "") || "•••• •••• •••• ••••"}</div>
</div>
<div class="card-meta" style="margin-top:14px">
<div><div style="opacity:.7;font-size:.75rem">TITULAR</div><div id="cv-holder" style="text-transform:uppercase">${cachedCard.holder || "NOME SOBRENOME"}</div></div>
<div><div style="opacity:.7;font-size:.75rem">VALIDADE</div><div id="cv-exp">${cachedCard.expiry || "MM/AA"}</div></div>
</div>
</div>
<input id="card_holder" class="pay-input" placeholder="Nome impresso no cartão" value="${cachedCard.holder || ""}" />
<div class="pay-grid">
<input id="card_number" class="pay-input" placeholder="Número do cartão" value="${formatCardNumber(cachedCard.number || "")}" inputmode="numeric" autocomplete="cc-number" />
<input id="card_expiry" class="pay-input" placeholder="Validade (MM/AA)" value="${cachedCard.expiry || ""}" inputmode="numeric" autocomplete="cc-exp" />
</div>
<div class="pay-grid-1" style="margin-top:.6rem">
<input id="card_cvv" class="pay-input" placeholder="CVV" value="${cachedCard.cvv || ""}" inputmode="numeric" type="password" autocomplete="cc-csc" />
</div>
<div class="save-row">
<input id="save_card" type="checkbox" ${cachedCard.number ? "checked" : ""}/>
<label for="save_card" style="font-size:.9rem;color:#334155">Salvar dados deste cartão neste dispositivo</label>
</div>
</div>
<div id="tab-pix" class="tab-panel" style="display:none">
<div class="pill-group" id="pix_types">
<span class="pill ${cachedPix.type === "cpf" ? "active" : ""}" data-type="cpf">CPF</span>
<span class="pill ${cachedPix.type === "cnpj" ? "active" : ""}" data-type="cnpj">CNPJ</span>
<span class="pill ${cachedPix.type === "email" ? "active" : ""}" data-type="email">E-mail</span>
<span class="pill ${cachedPix.type === "celular" ? "active" : ""}" data-type="celular">Celular</span>
<span class="pill ${cachedPix.type === "aleatoria" ? "active" : ""}" data-type="aleatoria">Aleatória</span>
</div>
<input id="pix_key" class="pay-input" placeholder="Chave PIX" value='${pixKeyPrefill || cachedPix.key || ""}' />
<div class="save-row">
<input id="save_pix" type="checkbox" ${cachedPix.key ? "checked" : ""}/>
<label for="save_pix" style="font-size:.9rem;color:#334155">Salvar chave PIX neste dispositivo</label>
</div>
<div class="qr-box" style="margin-top:10px">
<div style="font-weight:700;margin-bottom:6px">PIX Copia e Cola</div>
<div id="pix_copy" style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace;word-break:break-all;font-size:.85rem">${pixKeyPrefill || cachedPix.key || "sua-chave-pix-aqui"} | valor=${totalBRL || ""}</div>
<button type="button" id="btn_copy_pix" class="swal2-confirm swal2-styled" style="margin-top:10px;padding:.45rem .8rem">Copiar chave</button>
</div>
</div>
</div>
`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Pagar",
    cancelButtonText: "Cancelar",
    didOpen: () => {
      const tabButtons = Swal.getHtmlContainer().querySelectorAll(".pay-tab");
      const tabCard = Swal.getHtmlContainer().querySelector("#tab-card");
      const tabPix = Swal.getHtmlContainer().querySelector("#tab-pix");
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          tabButtons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          const isCard = btn.dataset.tab === "card";
          tabCard.style.display = isCard ? "block" : "none";
          tabPix.style.display = isCard ? "none" : "block";
        });
      });
      const numEl = Swal.getHtmlContainer().querySelector("#card_number");
      const holdEl = Swal.getHtmlContainer().querySelector("#card_holder");
      const expEl = Swal.getHtmlContainer().querySelector("#card_expiry");
      const cvvEl = Swal.getHtmlContainer().querySelector("#card_cvv");
      const cvNum = Swal.getHtmlContainer().querySelector("#cv-num");
      const cvHold = Swal.getHtmlContainer().querySelector("#cv-holder");
      const cvExp = Swal.getHtmlContainer().querySelector("#cv-exp");
      const cvBrand = Swal.getHtmlContainer().querySelector(".card-brand");
      function syncBrand() {
        const digits = numEl.value.replace(/\D/g, "");
        cvBrand.textContent = detectBrand(digits);
      }
      numEl.addEventListener("input", () => {
        const f = formatCardNumber(numEl.value);
        numEl.value = f;
        cvNum.textContent = f || "•••• •••• •••• ••••";
        syncBrand();
      });
      holdEl.addEventListener("input", () => {
        cvHold.textContent = holdEl.value ? holdEl.value.toUpperCase() : "NOME SOBRENOME";
      });
      expEl.addEventListener("input", () => {
        let v = expEl.value.replace(/\D/g, "").slice(0, 4);
        if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
        expEl.value = v;
        cvExp.textContent = v || "MM/AA";
      });
      cvvEl.addEventListener("input", () => {
        cvvEl.value = cvvEl.value.replace(/\D/g, "").slice(0, 4);
      });
      const pillGroup = Swal.getHtmlContainer().querySelector("#pix_types");
      const pixKey = Swal.getHtmlContainer().querySelector("#pix_key");
      pillGroup.querySelectorAll(".pill").forEach((p) => {
        p.addEventListener("click", () => {
          pillGroup.querySelectorAll(".pill").forEach((q) => q.classList.remove("active"));
          p.classList.add("active");
        });
      });
      const btnCopy = Swal.getHtmlContainer().querySelector("#btn_copy_pix");
      const pixCopy = Swal.getHtmlContainer().querySelector("#pix_copy");
      btnCopy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(pixKey.value || pixCopy.textContent);
          btnCopy.textContent = "Copiado!";
          setTimeout(() => (btnCopy.textContent = "Copiar chave"), 1200);
        } catch {}
      });
    },
    preConfirm: () => {
      const activeTab = Swal.getHtmlContainer().querySelector(".pay-tab.active")?.dataset.tab || "card";
      if (activeTab === "card") {
        const holder = Swal.getHtmlContainer().querySelector("#card_holder").value.trim();
        const number = Swal.getHtmlContainer().querySelector("#card_number").value.replace(/\s+/g, "");
        const expiry = Swal.getHtmlContainer().querySelector("#card_expiry").value.trim();
        const cvv = Swal.getHtmlContainer().querySelector("#card_cvv").value.trim();
        const save = Swal.getHtmlContainer().querySelector("#save_card").checked;
        const nd = number.replace(/\D/g, "");
        const expiryOk = /^(\d{2})\/(\d{2})$/.test(expiry);
        if (!holder) {
          Swal.showValidationMessage("Informe o nome do titular");
          return;
        }
        if (nd.length < 12 || nd.length > 19) {
          Swal.showValidationMessage("Número do cartão inválido");
          return;
        }
        if (!expiryOk) {
          Swal.showValidationMessage("Validade inválida (use MM/AA)");
          return;
        }
        if (cvv.length < 3 || cvv.length > 4) {
          Swal.showValidationMessage("CVV inválido");
          return;
        }
        if (save) saveCardToStorage({ holder, number: nd, expiry, cvv: "" });
        return { method: "card", payload: { holder, number: nd, expiry, cvv } };
      } else {
        const type = Swal.getHtmlContainer().querySelector("#pix_types .pill.active")?.dataset.type || "cpf";
        const key = Swal.getHtmlContainer().querySelector("#pix_key").value.trim();
        const save = Swal.getHtmlContainer().querySelector("#save_pix").checked;
        if (!key) {
          Swal.showValidationMessage("Informe a chave PIX");
          return;
        }
        if (save) savePixToStorage({ type, key });
        return { method: "pix", payload: { type, key } };
      }
    },
    didClose: () => {
      try {
        const c = loadCardFromStorage();
        if (c && typeof c === "object") saveCardToStorage({ ...c, cvv: "" });
      } catch {}
    },
  });
  if (!isConfirmed) return null;
  return data;
}

export default function CompararCarrinhosPage({ user }) {
  const q = useQuery();
  const navigate = useNavigate();
  const carrinhoIds = q.get("ids")?.split(",") || [];
  const selectedIdQuery = q.get("selected") || "";
  const userId = user?.uid || null;
  const carrinhoIdsKey = carrinhoIds.join(",");
  const [ruaCompleta, setRuaCompleta] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [carrinhos, setCarrinhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carrinhoSelecionadoId, setCarrinhoSelecionadoId] = useState(selectedIdQuery);
  const [mostrarItens, setMostrarItens] = useState(false);
  const [mercadosProximos, setMercadosProximos] = useState([]);
  const [mercadosSelecionados, setMercadosSelecionados] = useState([]);
  const [precosFixos, setPrecosFixos] = useState({});
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [mercadoSelecionadoPedido, setMercadoSelecionadoPedido] = useState("");
  const [ordenarPor, setOrdenarPor] = useState("distancia");
  const [retirarNaLoja, setRetirarNaLoja] = useState(false);
  const [enderecoLoja, setEnderecoLoja] = useState("");
  const [incluirFrete, setIncluirFrete] = useState(true);
  const [fretePorKmBase, setFretePorKmBase] = useState(2);
  const [freteFaixa1Max, setFreteFaixa1Max] = useState(3);
  const [freteFaixa2Max, setFreteFaixa2Max] = useState(7);
  const [freteExtraFaixa1, setFreteExtraFaixa1] = useState(0);
  const [freteExtraFaixa2, setFreteExtraFaixa2] = useState(5);
  const [freteExtraFaixa3, setFreteExtraFaixa3] = useState(10);
  const [descontoRetiradaPercent, setDescontoRetiradaPercent] = useState(10);
  const [cupomCodigo, setCupomCodigo] = useState("BEMVINDO10");
  const [cupomTipo, setCupomTipo] = useState("percentual");
  const [cupomValor, setCupomValor] = useState("10");
  const [cupomInput, setCupomInput] = useState("BEMVINDO10");
  const [raioAtendimentoKm, setRaioAtendimentoKm] = useState(7);
  const [janelaEntrega, setJanelaEntrega] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [sugestoesRecompra, setSugestoesRecompra] = useState([]);
  const [alertasAtivos, setAlertasAtivos] = useState({});
  const [userLat, setUserLat] = useState(null);
  const [userLon, setUserLon] = useState(null);
  const [selecionados, setSelecionados] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const steps = ["Comparação de Carrinhos", "Comparar preços por mercado", "Comparativo de Preços", "Totais por Mercado", "Opções", "Pedido"];
  const [transitionDir, setTransitionDir] = useState("forward");
  const [mostrarPedidos, setMostrarPedidos] = useState(false);
  const [pedidoFiltro, setPedidoFiltro] = useState("todos");
  const [pedidosUsuario, setPedidosUsuario] = useState([]);
  const [mostrarTodosCarrinhos, setMostrarTodosCarrinhos] = useState(false);
  const [filtroCarrinhos, setFiltroCarrinhos] = useState("todos");
  const refCarrinho = useRef(null);
  const refMercados = useRef(null);
  const refTabela = useRef(null);
  const refOpcoes = useRef(null);
  const refPedido = useRef(null);

  const parseNum = (x) => {
    const n = parseFloat(String(x).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const stepDescriptions = {
    0: "Escolha um carrinho para comparar e, se quiser, visualize ou reutilize pedidos anteriores.",
    1: "Selecione os mercados próximos e defina como deseja ordenar a comparação.",
    2: "Veja os preços por item em cada mercado e escolha onde comprar cada produto.",
    3: "Confira o total por mercado com frete e descontos considerados.",
    4: "Compare a melhor compra em um único mercado versus um pedido personalizado.",
    5: "Cole um cupom, defina entrega ou retirada, endereço e finalize o pagamento."
  };

  const slotsEntrega = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000);
    const slots = [];
    for (let i = 0; i < 16; i++) {
      const d = new Date(start.getTime() + i * 30 * 60 * 1000);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 992);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      try {
        setUserLat(latitude);
        setUserLon(longitude);
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pt`);
        const d = await r.json();
        const c = d.address?.postcode;
        if (c) setCep(c);
        const n = await fetchNearbyMarkets(latitude, longitude);
        setMercadosProximos(n);
      } catch {}
    });
  }, []);

  useEffect(() => {
    if (cep.length >= 8) buscarEnderecoPorCEP(cep);
  }, [cep]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const s = await get(ref(db, `usuarios/${userId}/carts`));
      if (cancelled) return;
      const a = s.val() || {};
      const all = Object.entries(a).map(([id, v]) => ({ id, ...v })).filter((c) => c?.items);
      const base = mostrarTodosCarrinhos || carrinhoIds.length === 0 ? all : carrinhoIds.map((id) => ({ id, ...a[id] })).filter((c) => c?.items);
      setCarrinhos(base);
      if (base.length) {
        if (selectedIdQuery && !base.some((c) => c.id === selectedIdQuery)) {
          setCarrinhoSelecionadoId(base[0].id);
        } else if (!selectedIdQuery && !carrinhoSelecionadoId) {
          setCarrinhoSelecionadoId(base[0].id);
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, carrinhoIdsKey, selectedIdQuery, mostrarTodosCarrinhos]);

  useEffect(() => {
    if (!carrinhoSelecionadoId || !mercadosSelecionados.length) return;
    const carrinho = carrinhos.find((c) => c.id === carrinhoSelecionadoId);
    if (!carrinho) return;
    setPrecosFixos((prev) => {
      const n = { ...prev };
      carrinho.items.forEach((item) => {
        if (!n[item.name]) n[item.name] = {};
        mercadosSelecionados.forEach((mid) => {
          if (!n[item.name][mid]) {
            const v = 1 + Math.random() * 0.2 - 0.1;
            n[item.name][mid] = (Number(item.price) * v).toFixed(2);
          }
        });
      });
      Object.keys(n).forEach((prod) => {
        Object.keys(n[prod]).forEach((mid) => {
          if (!mercadosSelecionados.includes(mid)) delete n[prod][mid];
        });
      });
      return n;
    });
  }, [carrinhoSelecionadoId, mercadosSelecionados, carrinhos]);

  useEffect(() => {
    if (!mercadoSelecionadoPedido) {
      setEnderecoLoja("");
      return;
    }
    const m = mercadosProximos.find((x) => x.id === mercadoSelecionadoPedido);
    if (!m) {
      setEnderecoLoja("");
      return;
    }
    if (m.endereco && m.endereco.trim()) {
      setEnderecoLoja(m.endereco);
    } else {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${m.lat}&lon=${m.lon}&format=json&addressdetails=1&accept-language=pt`)
        .then((r) => r.json())
        .then((d) => {
          const a = d.address || {};
          const e = `${a.road || ""}${a.house_number ? ", " + a.house_number : ""}${a.city || a.town ? " - " + (a.city || a.town) : ""}${a.state ? "/" + a.state : ""}${a.postcode ? " - CEP " + a.postcode : ""}`;
          setEnderecoLoja(e);
        })
        .catch(() => setEnderecoLoja(""));
    }
  }, [mercadoSelecionadoPedido, mercadosProximos]);

  useEffect(() => {
    async function ensureReferral() {
      if (!userId) return;
      const uRef = ref(db, `usuarios/${userId}`);
      const snap = await get(uRef);
      const d = snap.val() || {};
      if (d.referralCode) {
        setReferralCode(d.referralCode);
      } else {
        const code = `AMIGO-${(userId || "").slice(0, 6).toUpperCase()}`;
        await update(uRef, { referralCode: code });
        setReferralCode(code);
      }
    }
    async function loadReordersAndOrders() {
      if (!userId) return;
      const pSnap = await get(ref(db, `usuarios/${userId}/pedidos`));
      const pedidos = pSnap.val() || {};
      const freq = {};
      const lastPrice = {};
      Object.values(pedidos).forEach((p) => {
        (p.itens || []).forEach((it) => {
          const k = it.nome;
          freq[k] = (freq[k] || 0) + 1;
          lastPrice[k] = it.preco || lastPrice[k] || 0;
        });
      });
      const arr = Object.keys(freq)
        .map((k) => ({ name: k, count: freq[k], price: lastPrice[k] || 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);
      setSugestoesRecompra(arr);
      const pedidosArr = Object.entries(pedidos).map(([id, p]) => ({ id, ...p })).sort((a, b) => {
        const da = a.dataHora ? new Date(a.dataHora).getTime() : 0;
        const dbt = b.dataHora ? new Date(b.dataHora).getTime() : 0;
        return dbt - da;
      });
      setPedidosUsuario(pedidosArr);
    }
    ensureReferral();
    loadReordersAndOrders();
  }, [userId]);

  useEffect(() => {
    const ativos = {};
    Object.keys(precosFixos || {}).forEach((prod) => {
      const th = alertasAtivos[prod];
      if (!th) return;
      const menores = Object.values(precosFixos[prod] || {}).map(Number);
      if (menores.length && Math.min(...menores) <= th) {
        ativos[prod] = true;
      }
    });
    const nomes = Object.keys(ativos);
    if (nomes.length) {
      Swal.fire("Boas notícias!", `Alguns itens bateram o preço-alvo: ${nomes.join(", ")}.`, "info");
    }
  }, [precosFixos, alertasAtivos]);

  useEffect(() => {
    setSelecionados((prev) => {
      const n = { ...prev };
      Object.keys(n).forEach((prod) => {
        if (!mercadosSelecionados.includes(n[prod])) delete n[prod];
      });
      return n;
    });
  }, [mercadosSelecionados]);

  const buscarEnderecoPorCEP = (c) => {
    const clean = c.replace(/\D/g, "");
    if (clean.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${clean}/json/`)
      .then((r) => r.json())
      .then((d) => {
        if (d.erro) {
          setRuaCompleta("");
          return;
        }
        setRuaCompleta(`${d.logradouro || ""}${d.bairro ? ", " + d.bairro : ""}${d.localidade ? ", " + d.localidade : ""}${d.uf ? " - " + d.uf : ""}`);
      });
  };

  const carrinhoSelecionado = carrinhos.find((c) => c.id === carrinhoSelecionadoId) || { items: [] };
  const totalSelecionado = carrinhoSelecionado.items.reduce((s, i) => s + Number(i.price) * (i.qtd || i.quantidade || 1), 0);
  const menoresPrecosPorProduto = {};
  carrinhoSelecionado.items.forEach((item) => {
    let m = Infinity;
    for (let mid of mercadosSelecionados) {
      const p = precosFixos[item.name]?.[mid];
      if (p && Number(p) < m) m = Number(p);
    }
    menoresPrecosPorProduto[item.name] = m;
  });

  function isReferralCupom(code) {
    return /^AMIGO-[A-Z0-9]{4,}$/i.test(String(code || ""));
  }

  const calcDesconto = (subtotal, applyingForRetirada = false) => {
    if (isReferralCupom(cupomCodigo)) {
      const d = subtotal * 0.15;
      return Math.max(0, d);
    }
    const v = parseNum(cupomValor);
    if (!v) return applyingForRetirada ? subtotal * (parseNum(descontoRetiradaPercent) / 100) : 0;
    if (cupomTipo === "percentual") {
      const base = subtotal * (v / 100);
      const ret = applyingForRetirada ? subtotal * (parseNum(descontoRetiradaPercent) / 100) : 0;
      return Math.max(0, base + ret);
    }
    const ret = applyingForRetirada ? subtotal * (parseNum(descontoRetiradaPercent) / 100) : 0;
    return Math.max(0, Math.min(v, subtotal) + ret);
  };

  async function aplicarCupom(code) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) {
      Swal.fire("Cupom vazio", "Cole um código de cupom.", "warning");
      return;
    }
    try {
      const snap = await get(ref(db, `cupons/${c}`));
      const data = snap.val();
      if (data && (data.tipo === "percentual" || data.tipo === "fixo") && data.valor != null) {
        setCupomCodigo(c);
        setCupomTipo(data.tipo);
        setCupomValor(String(data.valor));
        setCupomInput(c);
        Swal.fire("Cupom aplicado", `Cupom ${c} aplicado.`, "success");
        return;
      }
      if (isReferralCupom(c)) {
        setCupomCodigo(c);
        setCupomTipo("percentual");
        setCupomValor("15");
        setCupomInput(c);
        Swal.fire("Cupom aplicado", "Cupom de indicação reconhecido (15%).", "success");
        return;
      }
      Swal.fire("Cupom inválido", "Não encontramos este cupom.", "warning");
    } catch {
      Swal.fire("Erro", "Não foi possível validar o cupom.", "error");
    }
  }

  function limparCupom() {
    setCupomCodigo("");
    setCupomTipo("percentual");
    setCupomValor("0");
    setCupomInput("");
  }

  function calcFrete(km) {
    const base = km * parseNum(fretePorKmBase);
    let extra = 0;
    if (km <= parseNum(freteFaixa1Max)) extra = parseNum(freteExtraFaixa1);
    else if (km <= parseNum(freteFaixa2Max)) extra = parseNum(freteExtraFaixa2);
    else extra = parseNum(freteExtraFaixa3);
    return Math.max(0, base + extra);
  }

  const totalPorMercado = {};
  mercadosSelecionados.forEach((mid) => {
    totalPorMercado[mid] = carrinhoSelecionado.items.reduce((s, item) => {
      const p = precosFixos[item.name]?.[mid];
      return s + (p ? Number(p) : 0) * (item.qtd || item.quantidade || 1);
    }, 0);
  });

  const fretePorMercado = {};
  const descontoPorMercado = {};
  const totalFinalPorMercado = {};
  mercadosSelecionados.forEach((mid) => {
    const sub = totalPorMercado[mid] || 0;
    const m = mercadosProximos.find((x) => x.id === mid);
    const km = (m?.distance || 0) / 1000;
    const frete = incluirFrete ? calcFrete(km) : 0;
    const desc = calcDesconto(sub, false);
    descontoPorMercado[mid] = desc;
    fretePorMercado[mid] = frete;
    totalFinalPorMercado[mid] = Math.max(0, sub - desc) + frete;
  });

  const vals = Object.values(totalFinalPorMercado);
  const maxTotal = vals.length ? Math.max(...vals) : 0;
  const minTotal = vals.length ? Math.min(...vals) : 0;
  const economia = maxTotal - minTotal;
  const mercadoMaisBarato = mercadosSelecionados.find((id) => totalFinalPorMercado[id] === minTotal);
  const mercadoMaisCaro = mercadosSelecionados.find((id) => totalFinalPorMercado[id] === maxTotal);
  const mercadoMaisPertoObj = mercadosSelecionados.reduce((acc, id) => {
    const d = mercadosProximos.find((m) => m.id === id)?.distance ?? Infinity;
    return d < acc.dist ? { id, dist: d } : acc;
  }, { id: null, dist: Infinity });
  const mercadoMaisPerto = mercadoMaisPertoObj.id;

  const mercadoForaDoRaio = (m) => (m.distance || 0) / 1000 > parseNum(raioAtendimentoKm);
  const todosMarcados = mercadosProximos.length > 0 && mercadosSelecionados.length === mercadosProximos.length;
  const toggleSelecionarTodos = () => {
    if (todosMarcados) setMercadosSelecionados([]);
    else {
      const next = mercadosProximos.map((m) => m.id);
      setMercadosSelecionados(next);
    }
  };

  const ordenarPorDist = (a, o) => a.distance - o.distance;
  const mercadosOrdenados = [...mercadosProximos].sort((a, o) => {
    if (ordenarPor === "distancia") return ordenarPorDist(a, o);
    const tA = totalFinalPorMercado[a.id] ?? Infinity;
    const tB = totalFinalPorMercado[o.id] ?? Infinity;
    return tA - tB;
  });

  const mercadosSelecionadosOrdenados = [...mercadosSelecionados].sort((a, o) => {
    if (ordenarPor === "distancia") {
      const dA = mercadosProximos.find((m) => m.id === a)?.distance ?? Infinity;
      const dB = mercadosProximos.find((m) => m.id === o)?.distance ?? Infinity;
      return dA - dB;
    }
    const tA = totalFinalPorMercado[a] ?? Infinity;
    const tB = totalFinalPorMercado[o] ?? Infinity;
    return tA - tB;
  });

  const fmt = (n) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",")}`;
  const kmFmt = (m) => (m / 1000).toFixed(2);
  function etaMinutos(km) {
    const v = 25;
    return Math.ceil((km / v) * 60);
  }

  async function criarAlerta(itemName, threshold) {
    const th = parseNum(threshold);
    if (!th) {
      Swal.fire("Valor inválido", "Informe um valor para o alerta.", "warning");
      return;
    }
    await push(ref(db, `usuarios/${userId}/alerts`), { item: itemName, threshold: th, criadoEm: Date.now() });
    setAlertasAtivos((prev) => ({ ...prev, [itemName]: th }));
    Swal.fire("Alerta criado", `Alertaremos quando "${itemName}" estiver por até ${fmt(th)}.`, "success");
  }

  function handleChoose(prod, marketId) {
    setSelecionados((prev) => {
      const n = { ...prev };
      if (n[prod] === marketId) delete n[prod];
      else n[prod] = marketId;
      return n;
    });
  }

  function computeCustomPlan() {
    const chosenKeys = Object.keys(selecionados);
    if (chosenKeys.length === 0) return null;
    const chosen = {};
    const marketSet = new Set();
    let subtotal = 0;
    carrinhoSelecionado.items.forEach((item) => {
      const mid = selecionados[item.name];
      if (!mid) return;
      const priceRaw = precosFixos[item.name]?.[mid];
      if (priceRaw == null) return;
      const price = Number(priceRaw);
      if (!isFinite(price)) return;
      const q = item.qtd || item.quantidade || 1;
      chosen[item.name] = { marketId: mid, price, qty: q };
      subtotal += price * q;
      marketSet.add(mid);
    });
    const markets = Array.from(marketSet);
    if (!markets.length) return null;
    let order = [];
    let routeMeters = 0;
    if (userLat != null && userLon != null) {
      const remaining = new Set(markets);
      let curLat = userLat;
      let curLon = userLon;
      while (remaining.size) {
        let bestId = null;
        let bestDist = Infinity;
        remaining.forEach((id) => {
          const m = mercadosProximos.find((x) => x.id === id);
          if (!m) return;
          const d = haversine(curLat, curLon, m.lat, m.lon);
          if (d < bestDist) {
            bestDist = d;
            bestId = id;
          }
        });
        order.push(bestId);
        routeMeters += bestDist;
        const mm = mercadosProximos.find((x) => x.id === bestId);
        curLat = mm.lat;
        curLon = mm.lon;
        remaining.delete(bestId);
      }
    } else {
      order = markets;
      for (let i = 0; i < order.length - 1; i++) {
        const a = mercadosProximos.find((x) => x.id === order[i]);
        const b = mercadosProximos.find((x) => x.id === order[i + 1]);
        if (a && b) routeMeters += haversine(a.lat, a.lon, b.lat, b.lon);
      }
    }
    const routeKm = routeMeters / 1000;
    const extraStops = Math.max(0, order.length - 1);
    const multiStopFactor = 1 + 0.2 * extraStops;
    const desconto = calcDesconto(subtotal, false);
    const freteRota = incluirFrete ? calcFrete(routeKm) * multiStopFactor : 0;
    const total = Math.max(0, subtotal - desconto) + freteRota;
    const mercadosInfo = order.map((id) => {
      const m = mercadosProximos.find((x) => x.id === id);
      return { id, nome: m?.nome || id };
    });
    return { chosen, markets: order, subtotal, desconto, routeKm, freteRota, total, mercadosInfo, extraStops, multiStopFactor };
  }

  async function confirmarPersonalizado(plan) {
    if (!plan) return;
    if (!janelaEntrega) {
      Swal.fire("Horário de entrega", "Escolha a janela de entrega.", "warning");
      return;
    }
    if (!cep || !ruaCompleta || !numero) {
      Swal.fire("Campos obrigatórios", "Preencha o endereço completo antes de fazer o pedido.", "warning");
      return;
    }
    const totalBRL = fmt(plan.total);
    const payment = await askPayment(totalBRL, "");
    if (!payment) return;
    if (payment?.method === "card" && payment.payload) payment.payload.cvv = "";
    const itens = carrinhoSelecionado.items
      .filter((it) => plan.chosen[it.name])
      .map((it) => ({
        nome: it.name,
        qtd: it.qtd || it.quantidade || 1,
        preco: plan.chosen[it.name].price,
        mercadoId: plan.chosen[it.name].marketId,
        mercadoNome: mercadosProximos.find((m) => m.id === plan.chosen[it.name].marketId)?.nome || plan.chosen[it.name].marketId,
      }));
    const mercadosNomes = plan.mercadosInfo.map((m) => m.nome);
    const pagamento = payment.method === "card" ? { method: "card", card: sanitizeCardForDB(payment.payload) } : { method: "pix", pix: { type: payment.payload.type, keyMasked: maskPixKey(payment.payload.key) } };
    try {
      await Swal.fire({ title: "Processando pagamento...", html: "Aguarde alguns segundos.", allowOutsideClick: false, didOpen: () => Swal.showLoading(), timer: 2000, timerProgressBar: true });
      const pedido = {
        multiMercado: true,
        mercados: plan.mercadosInfo,
        mercadosNomes,
        rotaKm: plan.routeKm,
        freteRota: plan.freteRota,
        subtotal: plan.subtotal,
        descontoCupom: plan.desconto,
        total: plan.total,
        cupom: cupomCodigo || null,
        janelaEntrega,
        etaMin: etaMinutos(plan.routeKm),
        dataHora: new Date().toISOString(),
        carrinhoId: carrinhoSelecionadoId,
        retiradaEmLoja: false,
        endereco: { cep, rua: ruaCompleta, numero },
        itens,
        pagamento,
      };
      const pRef = ref(db, `usuarios/${userId}/pedidos`);
      await push(pRef, pedido);
      const cRef = ref(db, `usuarios/${userId}/carts/${carrinhoSelecionadoId}`);
      await update(cRef, { pedidoFeito: true, mercadosPersonalizados: mercadosNomes });
      Swal.fire({ title: "Pedido Enviado!", text: "Seu pedido personalizado foi enviado com sucesso.", icon: "success", showCancelButton: true, confirmButtonText: "Ir para Pedidos", cancelButtonText: "Fechar" }).then((r) => {
        if (r.isConfirmed) navigate("/pedidos");
      });
    } catch {
      Swal.fire("Erro", "Não foi possível salvar o pedido.", "error");
    }
  }

  const bestSingleOption = useMemo(() => {
    if (!mercadosSelecionados.length) return null;
    let bestId = null;
    let bestTot = Infinity;
    let bestData = null;
    mercadosSelecionados.forEach((id) => {
      const sub = totalPorMercado[id] || 0;
      const desc = calcDesconto(sub, false);
      const m = mercadosProximos.find((x) => x.id === id);
      const km = (m?.distance || 0) / 1000;
      const frete = incluirFrete ? calcFrete(km) : 0;
      const tot = Math.max(0, sub - desc) + frete;
      if (tot < bestTot) {
        bestTot = tot;
        bestId = id;
        bestData = { id, nome: m?.nome || id, km, sub, desc, frete, tot };
      }
    });
    return bestData;
  }, [mercadosSelecionados, totalPorMercado, mercadosProximos, incluirFrete, fretePorKmBase, freteFaixa1Max, freteFaixa2Max, freteExtraFaixa1, freteExtraFaixa2, freteExtraFaixa3, cupomCodigo, cupomTipo, cupomValor, descontoRetiradaPercent]);

  const customPlan = useMemo(() => computeCustomPlan(), [selecionados, mercadosSelecionados, precosFixos, carrinhoSelecionado, userLat, userLon, incluirFrete, fretePorKmBase, freteFaixa1Max, freteFaixa2Max, freteExtraFaixa1, freteExtraFaixa2, freteExtraFaixa3, cupomCodigo, cupomTipo, cupomValor]);

  const recommended = (() => {
    if (bestSingleOption && customPlan) return customPlan.total < bestSingleOption.tot ? "personalizado" : "normal";
    if (bestSingleOption) return "normal";
    if (customPlan) return "personalizado";
    return null;
  })();

  function goNext() {
    const can = canProceed(stepIndex);
    if (!can.ok) {
      Swal.fire("Ação necessária", can.msg, "warning");
      return;
    }
    setTransitionDir("forward");
    if (stepIndex === 4) {
      setMostrarPedido(true);
      setStepIndex(5);
      return;
    }
    setStepIndex((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setTransitionDir("backward");
    if (stepIndex === 5) {
      setMostrarPedido(false);
    }
    setStepIndex((s) => Math.max(s - 1, 0));
  }

  function canProceed(step) {
    if (step === 0) {
      if (!carrinhoSelecionadoId) return { ok: false, msg: "Selecione um carrinho." };
      return { ok: true };
    }
    if (step === 1) {
      if (!mercadosSelecionados.length) return { ok: false, msg: "Selecione pelo menos um mercado." };
      return { ok: true };
    }
    if (step === 2) {
      if (!Object.keys(precosFixos || {}).length) return { ok: false, msg: "Aguarde a geração de preços para a tabela." };
      return { ok: true };
    }
    if (step === 3) {
      if (!mercadosSelecionados.length) return { ok: false, msg: "Selecione mercados para ver totais." };
      return { ok: true };
    }
    if (step === 4) {
      if (!(bestSingleOption || customPlan)) return { ok: false, msg: "Defina uma opção de compra." };
      return { ok: true };
    }
    return { ok: true };
  }

  const filteredPedidos = useMemo(() => {
    if (pedidoFiltro === "todos") return pedidosUsuario;
    return pedidosUsuario.filter((p) => p.carrinhoId && carrinhoIds.includes(p.carrinhoId));
  }, [pedidoFiltro, pedidosUsuario, carrinhoIds]);

  const carrinhosFiltrados = useMemo(() => {
    if (filtroCarrinhos === "todos") return carrinhos;
    if (filtroCarrinhos === "nao") return carrinhos.filter((c) => !c.pedidoFeito);
    return carrinhos.filter((c) => c.pedidoFeito);
  }, [carrinhos, filtroCarrinhos]);

  function usarPedidoComoCarrinho(p) {
    const id = `pedido:${p.id}`;
    if (!carrinhos.some((c) => c.id === id)) {
      const items = (p.itens || []).map((it) => ({ name: it.nome, price: it.preco || 0, qtd: it.qtd || 1 }));
      const novo = { id, criadoEm: p.dataHora ? new Date(p.dataHora).getTime() : Date.now(), items, pedidoFeito: true };
      setCarrinhos((prev) => [novo, ...prev]);
    }
    setCarrinhoSelecionadoId(id);
    setMostrarItens(true);
    Swal.fire("Carrinho selecionado", "O pedido foi carregado como carrinho para comparação.", "success");
  }

  const animClass = transitionDir === "forward" ? "anim-slide-in-left" : "anim-slide-in-right";

  if (loading) return <div className="container mt-5" style={{ paddingTop: "90px" }}>Carregando comparação...</div>;

  return (
    <div className="container mt-5 mb-4" style={{ paddingTop: "90px", paddingBottom: isMobile ? "82px" : undefined }}>
      <style>{`
        .steps{display:flex;gap:.75rem;list-style:none;margin:0;padding:0}
        .step{flex:1;display:flex;align-items:center;gap:.5rem;font-weight:600;border:1px solid #e5e7eb;padding:.5rem .75rem;border-radius:12px;justify-content:center;background:#fff}
        .step .dot{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;border:2px solid #94a3b8;font-weight:700}
        .step.active{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.15)}
        .step.active .dot{border-color:#0ea5e9}
        .step.done{background:linear-gradient(180deg,#ecfeff,#fff)}
        .sticky-summary{position:sticky;top:90px}
        .ghost-btn{border:1px dashed #cbd5e1;background:#fff}
        .mobile-cta{position:fixed;left:0;right:0;bottom:0;background:#fff;border-top:1px solid #e5e7eb;padding:.6rem .9rem;z-index:1030;box-shadow:0 -6px 16px rgba(0,0,0,.06)}
        .comp-hint{font-size:.85rem;color:#64748b}
        .comp-table th:first-child,.comp-table td:first-child{position:sticky;left:0;background:#fff;z-index:1}
        .step-panel{animation-duration:.35s;animation-fill-mode:both}
        @keyframes slideInLeft{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideInRight{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        .anim-slide-in-left{animation-name:slideInLeft}
        .anim-slide-in-right{animation-name:slideInRight}
        @media (max-width: 576px){.step span:not(.dot){display:none}.step{padding:.35rem .5rem}.step .dot{width:22px;height:22px}}
        @media (max-width: 991.98px){.sticky-summary{display:none}}
      `}</style>

      <div className="sticky-top" style={{ top: 70, zIndex: 1020 }}>
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-body py-2">
            <ul className="steps">
              {steps.map((label, idx) => {
                const cls = idx < stepIndex ? "step done" : idx === stepIndex ? "step active" : "step";
                return (
                  <li key={label} className={cls} onClick={() => { setTransitionDir(idx > stepIndex ? "forward" : "backward"); setStepIndex(idx); }} style={{ cursor: "pointer" }}>
                    <span className="dot">{idx + 1}</span><span>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div key={`step-${stepIndex}-${transitionDir}`} className={`step-panel ${animClass}`}>
            {stepIndex === 0 && (
              <>
                <h4 className="mb-1">Comparação de Carrinhos</h4>
                <p className="text-muted mb-4">{stepDescriptions[0]}</p>
                <div className="alert alert-info d-flex flex-wrap align-items-center justify-content-between">
                  <div>Programa de Indicação: seu código amigo é <strong>{referralCode || "..."}</strong></div>
                  <button className="btn btn-sm btn-outline-secondary" onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(referralCode);
                      Swal.fire("Copiado", "Código de indicação copiado para a área de transferência.", "success");
                    } catch {}
                  }}>Copiar código</button>
                </div>

                {carrinhos.length > 0 && (
                  <div className="mb-4" ref={refCarrinho}>
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-6">
                        <label className="form-label">Escolha o carrinho para comparar:</label>
                        <select
                          className="form-select mb-2"
                          value={carrinhoSelecionadoId}
                          onChange={(e) => {
                            setCarrinhoSelecionadoId(e.target.value);
                            setMostrarItens(false);
                            setPrecosFixos({});
                            setSelecionados({});
                            setMercadosSelecionados([]);
                            setMercadoSelecionadoPedido("");
                          }}
                        >
                          {carrinhosFiltrados.map((c, i) => (
                            <option key={c.id} value={c.id}>
                              {`Carrinho #${i + 1} - ${new Date(c.criadoEm).toLocaleString()}`} {c.pedidoFeito ? " (pedido já feito)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id="ckAll" checked={mostrarTodosCarrinhos} onChange={() => setMostrarTodosCarrinhos((v) => !v)} />
                          <label className="form-check-label" htmlFor="ckAll">Mostrar todos os carrinhos</label>
                        </div>
                      </div>
                      <div className="col-6 col-md-3">
                        <select className="form-select" value={filtroCarrinhos} onChange={(e) => setFiltroCarrinhos(e.target.value)}>
                          <option value="todos">Todos</option>
                          <option value="nao">Somente não pedidos</option>
                          <option value="ja">Somente já pedidos</option>
                        </select>
                      </div>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-outline-primary" onClick={() => setMostrarItens(!mostrarItens)}>{mostrarItens ? "Ocultar Itens" : "Exibir Itens"}</button>
                      <button className="btn btn-outline-dark" onClick={() => setMostrarPedidos((v) => !v)}>{mostrarPedidos ? "Ocultar Pedidos" : "Ver Pedidos do Usuário"}</button>
                    </div>
                  </div>
                )}

                {mostrarItens && carrinhoSelecionado && (
                  <div className="card mb-4">
                    <div className="card-body">
                      <h5 className="card-title">Itens do Carrinho Selecionado</h5>
                      <ul className="list-group">
                        {carrinhoSelecionado.items.map((item, idx) => (
                          <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                            <div className="me-2">{(item.qtd || item.quantidade || 1)}x {item.name}</div>
                            <div className="d-flex align-items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control form-control-sm"
                                style={{ width: 110 }}
                                placeholder="Alerta R$"
                                onBlur={(e) => {
                                  const v = e.target.value;
                                  if (v) criarAlerta(item.name, v);
                                }}
                              />
                              <span className="badge bg-secondary">{fmt(item.price * (item.qtd || item.quantidade || 1))}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <strong className="d-block mt-2">Total: {fmt(totalSelecionado)}</strong>
                    </div>
                  </div>
                )}

                {mostrarPedidos && (
                  <div className="card mb-4">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5 className="card-title mb-0">Pedidos do Usuário</h5>
                        <div className="btn-group">
                          <button className={`btn btn-sm btn-outline-secondary ${pedidoFiltro === "todos" ? "active" : ""}`} onClick={() => setPedidoFiltro("todos")}>Todos</button>
                          <button className={`btn btn-sm btn-outline-secondary ${pedidoFiltro === "selecionados" ? "active" : ""}`} onClick={() => setPedidoFiltro("selecionados")}>Só destes carrinhos</button>
                        </div>
                      </div>
                      <ul className="list-group">
                        {filteredPedidos.map((p) => {
                          const nome = p.mercadoNome || (p.multiMercado ? "Multi-mercados" : "Pedido");
                          const total = p.total != null ? p.total : Math.max(0, (p.subtotal || 0) - (p.descontoCupom || 0) + ((p.freteRota || p.frete || 0)));
                          const sel = p.carrinhoId && carrinhoIds.includes(p.carrinhoId);
                          return (
                            <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-semibold">{nome}</div>
                                <div className="small text-muted">{p.dataHora ? new Date(p.dataHora).toLocaleString() : "-"}</div>
                                <div className="small text-muted">{p.retiradaEmLoja ? "Retirada" : "Entrega"}{p.janelaEntrega ? ` • ${p.janelaEntrega}` : ""}</div>
                                <button className="btn btn-sm btn-outline-primary mt-2" onClick={() => usarPedidoComoCarrinho(p)}>Usar este pedido</button>
                              </div>
                              <div className="text-end">
                                <div className="fw-bold">{fmt(total)}</div>
                                {sel && <span className="badge bg-primary ms-2">Selecionado</span>}
                              </div>
                            </li>
                          );
                        })}
                        {filteredPedidos.length === 0 && <li className="list-group-item">Nenhum pedido encontrado.</li>}
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}

            {stepIndex === 1 && (
              <div className="mb-4 p-4 bg-light rounded shadow-sm" ref={refMercados}>
                <h5 className="mb-1">Comparar preços por mercado</h5>
                <p className="text-muted mb-3">{stepDescriptions[1]}</p>
                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <div className="btn-group w-100">
                      <button className={`btn btn-outline-secondary ${ordenarPor === "distancia" ? "active" : ""}`} onClick={() => setOrdenarPor("distancia")}>Ordenar por Distância</button>
                      <button className={`btn btn-outline-secondary ${ordenarPor === "preco" ? "active" : ""}`} onClick={() => setOrdenarPor("preco")}>Ordenar por Preço Total</button>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 text-end">
                    <button className="btn btn-outline-dark w-100 w-md-auto" onClick={() => setSelecionados({})}>Limpar escolhas</button>
                  </div>
                </div>

                <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-3">
                  <span><strong>Mais perto:</strong> {mercadoMaisPerto ? `${mercadosProximos.find((m) => m.id === mercadoMaisPerto)?.nome} (${kmFmt(mercadoMaisPertoObj.dist)} km)` : "-"}</span>
                  <span><strong>Mais barato:</strong> {mercadoMaisBarato ? `${mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome} (${fmt(minTotal)})` : "-"}</span>
                </div>

                {mercadosProximos.length > 0 && (
                  <>
                    <div className="form-check mb-2">
                      <input type="checkbox" className="form-check-input" id="check-todos" checked={todosMarcados} onChange={toggleSelecionarTodos} />
                      <label className="form-check-label" htmlFor="check-todos">Selecionar todos</label>
                    </div>
                    <p className="text-muted fw-semibold mb-2">Selecione os mercados para comparar:</p>
                    <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
                      {mercadosOrdenados.map((m) => {
                        const fora = mercadoForaDoRaio(m);
                        return (
                          <div key={m.id} className="col">
                            <div className={`form-check border rounded px-3 py-2 h-100 d-flex align-items-center ${fora ? "bg-warning-subtle" : ""}`} style={{ userSelect: "none" }}>
                              <input
                                className="form-check-input me-2"
                                type="checkbox"
                                id={`mercado-${m.id}`}
                                checked={mercadosSelecionados.includes(m.id)}
                                onChange={() => {
                                  setSelecionados({});
                                  setMercadosSelecionados((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]);
                                }}
                              />
                              <label className="form-check-label mb-0 d-flex justify-content-between w-100" htmlFor={`mercado-${m.id}`}>
                                <span>{m.nome} {fora && <span className="badge bg-warning text-dark ms-2">Fora do raio</span>}</span>
                                <small className="text-muted ms-2">{kmFmt(m.distance)} km</small>
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {stepIndex === 2 && (
              <div className="mt-2" ref={refTabela}>
                <h5 className="mb-1">Comparativo de Preços</h5>
                <p className="text-muted mb-2">{stepDescriptions[2]}</p>
                <div className="comp-hint mb-2">Dica: no celular, arraste a tabela lateralmente.</div>
                <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle comp-table">
                    <thead className="table-light">
                      <tr>
                        <th>Produto</th>
                        {mercadosSelecionadosOrdenados.map((id) => {
                          const p = mercadosProximos.find((m) => m.id === id)?.nome;
                          return <th key={id}>{p}</th>;
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {carrinhoSelecionado.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.name}</td>
                          {mercadosSelecionadosOrdenados.map((id) => {
                            const p = precosFixos[item.name]?.[id];
                            const min = menoresPrecosPorProduto[item.name];
                            const chosen = selecionados[item.name] === id;
                            let cls = "text-center";
                            if (p && Number(p) === min) cls += " table-success";
                            if (chosen) cls += " fw-bold";
                            return (
                              <td
                                key={id}
                                className={cls}
                                style={{ cursor: p ? "pointer" : "not-allowed" }}
                                onClick={() => p && handleChoose(item.name, id)}
                                title={p ? "Clique para escolher este mercado para o item" : "Sem preço"}
                              >
                                {p ? `R$ ${Number(p).toFixed(2).replace(".", ",")}` : "-"}
                                {chosen && <div><small className="badge bg-primary">Selecionado</small></div>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div className="mt-4">
                <h5 className="mb-1">Totais por Mercado</h5>
                <p className="text-muted mb-3">{stepDescriptions[3]}</p>
                <ul className="list-group mb-3">
                  {mercadosSelecionadosOrdenados.map((id) => {
                    const m = mercadosProximos.find((x) => x.id === id);
                    const fora = m ? mercadoForaDoRaio(m) : false;
                    const nome = m?.nome || id;
                    const sub = totalPorMercado[id] || 0;
                    const desc = descontoPorMercado[id] || 0;
                    const frete = fretePorMercado[id] || 0;
                    const total = totalFinalPorMercado[id] || 0;
                    const low = id === mercadoMaisBarato;
                    const high = id === mercadoMaisCaro;
                    const near = id === mercadoMaisPerto;
                    return (
                      <li key={id} className={`list-group-item d-flex justify-content-between align-items-center ${low ? "list-group-item-success" : ""} ${high ? "list-group-item-danger" : ""}`}>
                        <span>{nome} {fora && <span className="badge bg-warning text-dark ms-2">Fora do raio</span>}</span>
                        <span className="text-end">
                          <div><small>Subtotal: {fmt(sub)}</small></div>
                          <div><small>Desconto: -{fmt(desc)}</small></div>
                          {incluirFrete && <div><small>Frete: +{fmt(frete)}</small></div>}
                          <strong>Total: {fmt(total)}</strong>
                          {low && <span className="badge bg-success ms-2">Mais barato</span>}
                          {high && <span className="badge bg-danger ms-2">Mais caro</span>}
                          {near && <span className="badge bg-info ms-2">Mais perto</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {stepIndex === 4 && (
              <div className="mt-2" ref={refOpcoes}>
                <h5 className="mb-1">Opções</h5>
                <p className="text-muted mb-3">{stepDescriptions[4]}</p>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <div className={`card h-100 border-0 shadow-sm ${recommended === "normal" ? "border border-success" : ""}`}>
                      <div className="card-body">
                        <h6 className="mb-2">Opção 1 — Compra normal (1 mercado)</h6>
                        {bestSingleOption ? (
                          <>
                            <div className="mb-1"><strong>Mercado:</strong> {bestSingleOption.nome}</div>
                            <div className="mb-1"><small>Subtotal: {fmt(bestSingleOption.sub)}</small></div>
                            <div className="mb-1"><small>Desconto: -{fmt(bestSingleOption.desc)}</small></div>
                            {incluirFrete && <div className="mb-1"><small>Frete: +{fmt(bestSingleOption.frete)}</small></div>}
                            <div className="fs-5"><strong>Total:</strong> {fmt(bestSingleOption.tot)}</div>
                            <button
                              className="btn btn-primary mt-2"
                              onClick={() => {
                                setMercadoSelecionadoPedido(bestSingleOption.id);
                                setMostrarPedido(true);
                                setTransitionDir("forward");
                                setStepIndex(5);
                              }}
                            >
                              Continuar compra normal
                            </button>
                          </>
                        ) : (
                          <div>Selecione mercados para calcular.</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className={`card h-100 border-0 shadow-sm ${recommended === "personalizado" ? "border border-success" : ""}`}>
                      <div className="card-body">
                        <h6 className="mb-2">Opção 2 — Pedido personalizado (multi-mercados)</h6>
                        {customPlan ? (
                          <>
                            <div className="mb-1"><strong>Mercados:</strong> {customPlan.mercadosInfo.map((m) => m.nome).join(" → ")}</div>
                            <div className="mb-1"><small>Distância da rota: {customPlan.routeKm.toFixed(2)} km</small></div>
                            <div className="mb-1"><small>Paradas: {Math.max(0, customPlan.markets.length - 1)} (+{((customPlan.multiStopFactor - 1) * 100).toFixed(0)}% no frete)</small></div>
                            <div className="mb-1"><small>Subtotal: {fmt(customPlan.subtotal)}</small></div>
                            <div className="mb-1"><small>Desconto: -{fmt(customPlan.desconto)}</small></div>
                            {incluirFrete && <div className="mb-1"><small>Frete da rota: +{fmt(customPlan.freteRota)}</small></div>}
                            <div className="fs-5"><strong>Total:</strong> {fmt(customPlan.total)}</div>
                            {bestSingleOption && <div className="mt-1"><small>Economia vs normal: <strong className={customPlan.total < bestSingleOption.tot ? "text-success" : "text-danger"}>{fmt(bestSingleOption.tot - customPlan.total)}</strong></small></div>}
                            <div className="mt-3">
                              <label className="form-label">Janela de entrega</label>
                              <select className="form-select mb-2" value={janelaEntrega} onChange={(e) => setJanelaEntrega(e.target.value)}>
                                <option value="">Selecionar horário</option>
                                {slotsEntrega.map((s) => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <div className="row g-2">
                                <div className="col-12 col-md-4"><input type="text" className="form-control" placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value)} /></div>
                                <div className="col-12 col-md-5"><input type="text" className="form-control" placeholder="Rua, Bairro, Cidade - Estado" value={ruaCompleta} onChange={(e) => setRuaCompleta(e.target.value)} /></div>
                                <div className="col-12 col-md-3"><input type="text" className="form-control" placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} /></div>
                              </div>
                              <button className="btn btn-warning fw-bold mt-2" onClick={() => confirmarPersonalizado(customPlan)}>Confirmar pedido personalizado</button>
                            </div>
                          </>
                        ) : (
                          <div>Escolha mercados e clique nas células da tabela para montar seu pedido por produto.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 5 && mostrarPedido && (
              <div className="mt-3" ref={refPedido}>
                <h5 className="mb-1">Pedido</h5>
                <p className="text-muted mb-3">{stepDescriptions[5]}</p>

                <div className="row g-2 align-items-end mb-2">
                  <div className="col-12 col-md-8">
                    <label className="form-label">Cupom de desconto</label>
                    <div className="input-group">
                      <input type="text" className="form-control" placeholder="Cole o código do cupom" value={cupomInput} onChange={(e) => setCupomInput(e.target.value)} />
                      <button className="btn btn-outline-primary" onClick={() => aplicarCupom(cupomInput)}>Aplicar</button>
                      <button className="btn btn-outline-secondary" onClick={limparCupom}>Remover</button>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="text-muted small">
                      {(() => {
                        if (!mercadoSelecionadoPedido) return "";
                        const sub = totalPorMercado[mercadoSelecionadoPedido] || 0;
                        const d = calcDesconto(sub, retirarNaLoja);
                        return d > 0 ? `Desconto aplicado: -${fmt(d)}` : "Nenhum desconto aplicado";
                      })()}
                    </div>
                  </div>
                </div>

                <div className="row g-2">
                  <div className="col-12 col-md-4">
                    <div className="form-check form-switch mb-3">
                      <input className="form-check-input" type="checkbox" id="retiradaSwitch" checked={retirarNaLoja} onChange={() => setRetirarNaLoja(!retirarNaLoja)} />
                      <label className="form-check-label" htmlFor="retiradaSwitch">Retirar na loja</label>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">Janela de entrega</label>
                    <select className="form-select" value={janelaEntrega} onChange={(e) => setJanelaEntrega(e.target.value)}>
                      <option value="">Selecionar horário</option>
                      {slotsEntrega.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="col-12 col-md-4 d-flex align-items-end">
                    <span className="text-muted">
                      {mercadoSelecionadoPedido && (() => {
                        const mSel = mercadosProximos.find((m) => m.id === mercadoSelecionadoPedido);
                        const km = (mSel?.distance || 0) / 1000;
                        const eta = etaMinutos(km);
                        return janelaEntrega ? `ETA após o início da janela: ~${eta} min` : "";
                      })()}
                    </span>
                  </div>
                </div>

                {!retirarNaLoja && (
                  <>
                    <label className="form-label">Endereço para entrega:</label>
                    <input type="text" className="form-control mb-2" placeholder="CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
                    <input type="text" className="form-control mb-3" placeholder="Rua, Bairro, Cidade - Estado" value={ruaCompleta} onChange={(e) => setRuaCompleta(e.target.value)} />
                    <input type="text" className="form-control mb-3" placeholder="Número" value={numero} onChange={(e) => setNumero(e.target.value)} />
                  </>
                )}

                <label className="form-label mb-3">Escolha o Mercado:</label>
                <select className="form-select mb-2" value={mercadoSelecionadoPedido} onChange={(e) => setMercadoSelecionadoPedido(e.target.value)}>
                  <option value="">Selecione...</option>
                  {mercadosSelecionadosOrdenados.slice(0, 15).map((id) => {
                    const m = mercadosProximos.find((x) => x.id === id);
                    const nome = m?.nome || id;
                    const sub = totalPorMercado[id] || 0;
                    const descBase = calcDesconto(sub, retirarNaLoja);
                    const km = (m?.distance || 0) / 1000;
                    const fretePedido = retirarNaLoja ? 0 : calcFrete(km);
                    const tot = Math.max(0, sub - descBase) + fretePedido;
                    const diff = tot - Math.min(...mercadosSelecionados.map((mid) => {
                      const mm = mercadosProximos.find((x) => x.id === mid);
                      const ssub = totalPorMercado[mid] || 0;
                      const sdesc = calcDesconto(ssub, retirarNaLoja);
                      const skm = (mm?.distance || 0) / 1000;
                      const sfrete = retirarNaLoja ? 0 : calcFrete(skm);
                      return Math.max(0, ssub - sdesc) + sfrete;
                    }));
                    const fora = m ? mercadoForaDoRaio(m) : false;
                    const txt = diff === 0 ? `→ Mais barato (economize até ${fmt(economia)})` : `(+ ${fmt(diff)})`;
                    return (
                      <option key={id} value={id} disabled={fora && !retirarNaLoja}>
                        {nome} - {fmt(tot)} {fora && !retirarNaLoja ? "(fora do raio)" : txt}
                      </option>
                    );
                  })}
                </select>

                {enderecoLoja && <p className="text-muted mb-3"><small><strong>Endereço da loja:</strong> {enderecoLoja}</small></p>}

                <button
                  className="btn btn-success mt-3 mb-4"
                  onClick={async () => {
                    if (!retirarNaLoja && (!cep || !ruaCompleta || !numero)) {
                      Swal.fire("Campos obrigatórios", "Preencha o endereço completo antes de fazer o pedido.", "warning");
                      return;
                    }
                    if (!mercadoSelecionadoPedido) {
                      Swal.fire("Escolha o mercado", "Selecione o mercado para finalizar.", "warning");
                      return;
                    }
                    if (!janelaEntrega) {
                      Swal.fire("Horário de entrega", "Escolha a janela de entrega.", "warning");
                      return;
                    }
                    const mSel = mercadosProximos.find((m) => m.id === mercadoSelecionadoPedido);
                    if (mSel && mercadoForaDoRaio(mSel) && !retirarNaLoja) {
                      Swal.fire("Fora do raio", "Este mercado está fora do raio de atendimento.", "warning");
                      return;
                    }
                    const sub = totalPorMercado[mercadoSelecionadoPedido] || 0;
                    const desc = calcDesconto(sub, retirarNaLoja);
                    const km = (mSel?.distance || 0) / 1000;
                    const fretePedido = retirarNaLoja ? 0 : calcFrete(km);
                    const tot = Math.max(0, sub - desc) + fretePedido;
                    const totalBRL = fmt(tot);
                    const payment = await askPayment(totalBRL, "");
                    if (!payment) return;
                    if (payment?.method === "card" && payment.payload) payment.payload.cvv = "";
                    const nome = mSel?.nome || mercadoSelecionadoPedido;
                    const itens = carrinhoSelecionado.items.map((item) => ({
                      nome: item.name,
                      preco: precosFixos[item.name]?.[mercadoSelecionadoPedido] || item.price,
                      qtd: item.qtd || item.quantidade || 1,
                    }));
                    const paymentForDB = payment.method === "card" ? { method: "card", card: sanitizeCardForDB(payment.payload) } : { method: "pix", pix: { type: payment.payload.type, keyMasked: maskPixKey(payment.payload.key) } };
                    try {
                      await Swal.fire({ title: "Processando pagamento...", html: "Aguarde alguns segundos.", allowOutsideClick: false, didOpen: () => Swal.showLoading(), timer: 2000, timerProgressBar: true });
                      const pedido = {
                        mercadoId: mercadoSelecionadoPedido,
                        mercadoNome: nome,
                        total: tot,
                        descontoCupom: desc,
                        cupom: cupomCodigo || null,
                        frete: fretePedido,
                        janelaEntrega,
                        etaMin: etaMinutos(km),
                        dataHora: new Date().toISOString(),
                        carrinhoId: carrinhoSelecionadoId,
                        retiradaEmLoja: retirarNaLoja,
                        endereco: retirarNaLoja ? null : { cep, rua: ruaCompleta, numero },
                        lojaEndereco: enderecoLoja,
                        itens,
                        pagamento: paymentForDB,
                      };
                      const pRef = ref(db, `usuarios/${userId}/pedidos`);
                      await push(pRef, pedido);
                      const cRef = ref(db, `usuarios/${userId}/carts/${carrinhoSelecionadoId}`);
                      await update(cRef, { pedidoFeito: true });
                      Swal.fire({ title: "Pedido Enviado!", text: `Seu pedido para o mercado ${nome} foi enviado com sucesso.`, icon: "success", showCancelButton: true, confirmButtonText: "Ir para Pedidos", cancelButtonText: "Fechar" }).then((r) => {
                        if (r.isConfirmed) navigate("/pedidos");
                      });
                    } catch {
                      Swal.fire("Erro", "Não foi possível salvar o pedido.", "error");
                    }
                  }}
                >
                  Confirmar Pedido
                </button>
              </div>
            )}
          </div>

          {sugestoesRecompra.length > 0 && stepIndex === 0 && (
            <div className="mt-4 mb-4">
              <h5 className="mb-2">Sugestões para comprar de novo</h5>
              <div
                className="d-flex gap-2 overflow-auto pb-2"
                style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
              >
                {sugestoesRecompra.map((s) => (
                  <div key={s.name} className="flex-shrink-0" style={{ width: 240, scrollSnapAlign: "start" }}>
                    <div className="border rounded p-2 d-flex flex-column h-100">
                      <div className="fw-semibold">{s.name}</div>
                      <div className="text-muted">Preço recente: {fmt(s.price)}</div>
                      <div className="mt-auto d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary w-100"
                          onClick={async () => {
                            const novo = { criadoEm: Date.now(), items: [{ name: s.name, price: s.price || 0, qtd: 1 }] };
                            await push(ref(db, `usuarios/${userId}/carts`), novo);
                            Swal.fire("Adicionado", "Criamos um carrinho com este item.", "success");
                          }}
                        >
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-none d-lg-flex gap-2 my-3">
            <button className="btn btn-outline-secondary" disabled={stepIndex === 0} onClick={goBack}>Voltar</button>
            <button className="btn btn-primary" disabled={stepIndex >= steps.length - 1} onClick={goNext}>Próximo</button>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="sticky-summary">
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <h6 className="mb-3">Resumo</h6>
                <div className="d-flex justify-content-between"><span>Passo:</span><strong>{steps[stepIndex]}</strong></div>
                <div className="small text-muted mb-2">{stepDescriptions[stepIndex]}</div>
                <div className="d-flex justify-content-between"><span>Carrinho:</span><strong>{carrinhoSelecionadoId ? "#" + (carrinhos.findIndex(c => c.id === carrinhoSelecionadoId) + 1) : "-"}</strong></div>
                <div className="d-flex justify-content-between"><span>Itens:</span><strong>{carrinhoSelecionado.items.length}</strong></div>
                <div className="d-flex justify-content-between"><span>Mercados sel.:</span><strong>{mercadosSelecionados.length}</strong></div>
                {bestSingleOption && <div className="d-flex justify-content-between"><span>Normal:</span><strong>{fmt(bestSingleOption.tot)}</strong></div>}
                {customPlan && <div className="d-flex justify-content-between"><span>Personalizado:</span><strong>{fmt(customPlan.total)}</strong></div>}
                {economia > 0 && <div className="d-flex justify-content-between"><span>Economia potencial:</span><strong className="text-success">{fmt(economia)}</strong></div>}
                <div className="mt-3 d-grid gap-2">
                  <button className="btn btn-outline-secondary" onClick={() => { setTransitionDir("backward"); setStepIndex(0); }}>Carrinho</button>
                  <button className="btn btn-outline-secondary" onClick={() => { setTransitionDir("forward"); setStepIndex(1); }}>Mercados</button>
                  <button className="btn btn-outline-secondary" onClick={() => { setTransitionDir("forward"); setStepIndex(2); }}>Tabela</button>
                  <button className="btn btn-outline-secondary" onClick={() => { setTransitionDir("forward"); setStepIndex(3); }}>Totais</button>
                  <button className="btn btn.success" onClick={() => { setTransitionDir("forward"); setStepIndex(4); }}>Opções</button>
                </div>
              </div>
            </div>

            <div className="card border-0 shadow-sm mt-3">
              <div className="card-body">
                <h6 className="mb-2">Parâmetros de frete</h6>
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" checked={incluirFrete} onChange={() => setIncluirFrete(!incluirFrete)} id="checkFrete" />
                  <label className="form-check-label" htmlFor="checkFrete">Incluir frete</label>
                </div>
                <div className="row g-2 d-none">
                  <div className="col-6"><input type="number" className="form-control" placeholder="R$/km" value={fretePorKmBase} onChange={(e) => setFretePorKmBase(e.target.value)} /></div>
                  <div className="col-6"><input type="number" className="form-control" placeholder="Raio (km)" value={raioAtendimentoKm} onChange={(e) => setRaioAtendimentoKm(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="Faixa1 máx" value={freteFaixa1Max} onChange={(e) => setFreteFaixa1Max(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="Faixa2 máx" value={freteFaixa2Max} onChange={(e) => setFreteFaixa2Max(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="Desc Retirada (%)" value={descontoRetiradaPercent} onChange={(e) => setDescontoRetiradaPercent(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="+ F1 (R$)" value={freteExtraFaixa1} onChange={(e) => setFreteExtraFaixa1(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="+ F2 (R$)" value={freteExtraFaixa2} onChange={(e) => setFreteExtraFaixa2(e.target.value)} /></div>
                  <div className="col-4"><input type="number" className="form-control" placeholder="+ F3 (R$)" value={freteExtraFaixa3} onChange={(e) => setFreteExtraFaixa3(e.target.value)} /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="mobile-cta">
          <div className="d-flex flex-column gap-2 w-100">
            <div className="d-flex gap-3">
              <div className="flex-fill" style={{ minWidth: 0 }}>
                <div className="fw-semibold small d-flex align-items-center gap-1">
                  Normal {recommended === "normal" && <span className="badge bg-success">melhor</span>}
                </div>
                <div className={`fs-6 ${recommended === "normal" ? "fw-bold" : ""}`}>
                  {bestSingleOption ? fmt(bestSingleOption.tot) : "—"}
                </div>
                <div className="small text-muted">
                  {bestSingleOption ? `com frete: ${fmt(bestSingleOption.frete)}` : ""}
                </div>
              </div>

              <div className="flex-fill" style={{ minWidth: 0 }}>
                <div className="fw-semibold small d-flex align-items-center gap-1">
                  Personalizado {recommended === "personalizado" && <span className="badge bg-success">melhor</span>}
                </div>
                <div className={`fs-6 ${recommended === "personalizado" ? "fw-bold" : ""}`}>
                  {customPlan ? fmt(customPlan.total) : "—"}
                </div>
                <div className="small text-muted">
                  {customPlan ? `com frete: ${fmt(customPlan.freteRota)}` : ""}
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-between">
              <button className="btn btn-outline-secondary btn-sm" onClick={goBack} disabled={stepIndex === 0}>Voltar</button>
              <button className="btn btn-primary btn-sm" onClick={goNext} disabled={stepIndex >= steps.length - 1}>Próximo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
