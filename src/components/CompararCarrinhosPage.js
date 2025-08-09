import React, { useEffect, useState } from "react";
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
  const c = `
    [out:json][timeout:25];
    (
      node["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
      way["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
      relation["shop"~"supermarket|convenience|grocery"](around:${n},${a},${o});
    );
    out center;
  `;
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
  } catch { }
}

function savePixToStorage(pix) {
  try {
    localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify(pix));
  } catch { }
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

async function askPayment(totalBRL = "") {
  const cachedCard = loadCardFromStorage();
  const cachedPix = loadPixFromStorage();
  const { value: data, isConfirmed } = await Swal.fire({
    title: "Pagamento",
    html: `
      <style>
        .pay-wrap{font-family:Inter,system-ui,Arial,sans-serif; text-align:left}
        .pay-tabs{display:flex; gap:.5rem; margin-bottom:12px}
        .pay-tab{flex:1; padding:.6rem 1rem; border:1px solid #e5e7eb; background:#fff; border-radius:12px; cursor:pointer; font-weight:600}
        .pay-tab.active{background:linear-gradient(180deg,#0ea5e9,#0284c7); color:#fff; border-color:#0284c7}
        .pay-note{font-size:.85rem; color:#64748b; margin-bottom:10px}
        .card-preview{position:relative; width:100%; border-radius:16px; padding:18px; background:linear-gradient(135deg,#111827,#0b1e3a); color:#e5e7eb; box-shadow:0 12px 30px rgba(2,132,199,.25); margin-bottom:12px}
        .card-chip{width:34px;height:24px;border-radius:6px;background:linear-gradient(135deg,#f1c40f,#f39c12); box-shadow:inset 0 0 10px rgba(0,0,0,.2)}
        .card-row{display:flex; justify-content:space-between; align-items:center; margin-top:12px}
        .card-num{letter-spacing:2px; font-size:1.1rem; font-weight:600}
        .card-meta{display:flex; justify-content:space-between; gap:1rem; font-size:.9rem; color:#cbd5e1}
        .pay-grid{display:grid; grid-template-columns:1fr 1fr; gap:.6rem}
        .pay-grid-1{display:grid; grid-template-columns:1fr; gap:.6rem}
        .pay-input{width:100%; border:1px solid #e5e7eb; border-radius:10px; padding:.7rem .9rem; font-size:1rem}
        .pay-input:focus{outline:none; border-color:#0284c7; box-shadow:0 0 0 3px rgba(2,132,199,.15)}
        .pill-group{display:flex; flex-wrap:wrap; gap:.4rem; margin:.2rem 0 .6rem}
        .pill{padding:.45rem .8rem; border:1px solid #e5e7eb; border-radius:999px; cursor:pointer; font-size:.9rem; background:#fff}
        .pill.active{background:#ecfeff; border-color:#06b6d4; color:#0369a1}
        .qr-box{border:1px dashed #cbd5e1; border-radius:12px; padding:12px; text-align:center; color:#475569; background:#f8fafc}
        .save-row{display:flex; align-items:center; gap:.5rem; margin-top:.6rem}
        .amount-tag{font-size:.9rem; font-weight:700; color:#0f172a; background:#e0f2fe; border:1px solid #bae6fd; padding:.25rem .5rem; border-radius:8px; display:inline-block}
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
              <div class="card-brand" style="font-weight:700">${detectBrand(String(cachedCard.number || "").replace(/\\D/g, ""))}</div>
              <div class="card-num" id="cv-num">${formatCardNumber(cachedCard.number || "") || "•••• •••• •••• ••••"}</div>
            </div>
            <div class="card-meta" style="margin-top:14px">
              <div><div style="opacity:.7; font-size:.75rem">TITULAR</div><div id="cv-holder" style="text-transform:uppercase">${cachedCard.holder || "NOME SOBRENOME"}</div></div>
              <div><div style="opacity:.7; font-size:.75rem">VALIDADE</div><div id="cv-exp">${cachedCard.expiry || "MM/AA"}</div></div>
            </div>
          </div>
          <input id="card_holder" class="pay-input" placeholder="Nome impresso no cartão" value="${cachedCard.holder || ""}" />
          <div class="pay-grid">
            <input id="card_number" class="pay-input" placeholder="Número do cartão" value="${formatCardNumber(cachedCard.number || "")}" inputmode="numeric" />
            <input id="card_expiry" class="pay-input" placeholder="Validade (MM/AA)" value="${cachedCard.expiry || ""}" inputmode="numeric" />
          </div>
          <div class="pay-grid-1" style="margin-top:.6rem">
            <input id="card_cvv" class="pay-input" placeholder="CVV" value="${cachedCard.cvv || ""}" inputmode="numeric" />
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
          <input id="pix_key" class="pay-input" placeholder="Chave PIX" value='${cachedPix.key || ""}' />
          <div class="save-row">
            <input id="save_pix" type="checkbox" ${cachedPix.key ? "checked" : ""}/>
            <label for="save_pix" style="font-size:.9rem;color:#334155">Salvar chave PIX neste dispositivo</label>
          </div>
          <div class="qr-box" style="margin-top:10px">
            <div style="font-weight:700; margin-bottom:6px">PIX Copia e Cola</div>
            <div id="pix_copy" style="font-family:ui-monospace, SFMono-Regular, Menlo, monospace; word-break:break-all; font-size:.85rem">${cachedPix.key || "sua-chave-pix-aqui"}</div>
            <button type="button" id="btn_copy_pix" class="swal2-confirm swal2-styled" style="margin-top:10px; padding:.45rem .8rem">Copiar chave</button>
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
        } catch { }
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
        if (save) saveCardToStorage({ holder, number: nd, expiry, cvv });
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
  });
  if (!isConfirmed) return null;
  return data;
}

export default function CompararCarrinhosPage({ user }) {
  const q = useQuery();
  const navigate = useNavigate();
  const carrinhoIds = q.get("ids")?.split(",") || [];
  const selectedIdQuery = q.get("selected") || "";
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

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pt`);
        const d = await r.json();
        const c = d.address.postcode;
        if (c) setCep(c);
        const n = await fetchNearbyMarkets(latitude, longitude);
        setMercadosProximos(n);
      } catch { }
    });
  }, []);

  useEffect(() => {
    if (cep.length >= 8) buscarEnderecoPorCEP(cep);
  }, [cep]);

  useEffect(() => {
    async function fetchCarrinhos() {
      const s = await get(ref(db, `usuarios/${user.uid}/carts`));
      const a = s.val() || {};
      const o = carrinhoIds.map((id) => ({ id, ...a[id] })).filter((c) => c?.items);
      setCarrinhos(o);
      if (!selectedIdQuery && o.length) setCarrinhoSelecionadoId(o[0].id);
      setLoading(false);
    }
    fetchCarrinhos();
  }, [carrinhoIds, user, selectedIdQuery]);

  useEffect(() => {
    if (!carrinhoSelecionadoId) return;
    const p = new URLSearchParams(window.location.search);
    p.set("selected", carrinhoSelecionadoId);
    navigate(`${window.location.pathname}?${p.toString()}`, { replace: true });
  }, [carrinhoSelecionadoId, navigate]);

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
    if (m.endereco.trim()) {
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

  if (loading) return <div className="container mt-5">Carregando comparação...</div>;

  const carrinhoSelecionado = carrinhos.find((c) => c.id === carrinhoSelecionadoId);
  const totalSelecionado = carrinhoSelecionado.items.reduce((s, i) => s + Number(i.price), 0);

  const menoresPrecosPorProduto = {};
  carrinhoSelecionado.items.forEach((item) => {
    let m = Infinity;
    for (let mid of mercadosSelecionados) {
      const p = precosFixos[item.name]?.[mid];
      if (p && Number(p) < m) m = Number(p);
    }
    menoresPrecosPorProduto[item.name] = m;
  });

  const totalPorMercado = {};
  mercadosSelecionados.forEach((mid) => {
    totalPorMercado[mid] = carrinhoSelecionado.items.reduce((s, item) => {
      const p = precosFixos[item.name]?.[mid];
      return s + (p ? Number(p) : 0);
    }, 0);
  });

  const vals = Object.values(totalPorMercado);
  const maxTotal = Math.max(...vals);
  const minTotal = Math.min(...vals);
  const economia = maxTotal - minTotal;
  const mercadoMaisBarato = mercadosSelecionados.find((id) => totalPorMercado[id] === minTotal);
  const mercadoMaisCaro = mercadosSelecionados.find((id) => totalPorMercado[id] === maxTotal);
  const mercadoMaisPertoObj = mercadosSelecionados.reduce(
    (acc, id) => {
      const d = mercadosProximos.find((m) => m.id === id)?.distance ?? Infinity;
      return d < acc.dist ? { id, dist: d } : acc;
    },
    { id: null, dist: Infinity }
  );
  const mercadoMaisPerto = mercadoMaisPertoObj.id;

  function buscarEnderecoPorCEP(c) {
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
  }

  const todosMarcados = mercadosProximos.length > 0 && mercadosSelecionados.length === mercadosProximos.length;

  function toggleSelecionarTodos() {
    if (todosMarcados) setMercadosSelecionados([]);
    else setMercadosSelecionados(mercadosProximos.map((m) => m.id));
  }

  const ordenarPorDist = (a, o) => a.distance - o.distance;
  const mercadosOrdenados = [...mercadosProximos].sort((a, o) => {
    if (ordenarPor === "distancia") return ordenarPorDist(a, o);
    const tA = totalPorMercado[a.id] ?? Infinity;
    const tB = totalPorMercado[o.id] ?? Infinity;
    return tA - tB;
  });

  const mercadosSelecionadosOrdenados = [...mercadosSelecionados].sort((a, o) => {
    if (ordenarPor === "distancia") {
      const dA = mercadosProximos.find((m) => m.id === a)?.distance ?? Infinity;
      const dB = mercadosProximos.find((m) => m.id === o)?.distance ?? Infinity;
      return dA - dB;
    }
    const tA = totalPorMercado[a] ?? Infinity;
    const tB = totalPorMercado[o] ?? Infinity;
    return tA - tB;
  });

  return (
    <div className="container mt-5" style={{ paddingTop: "90px" }}>
      <h4 className="mb-4">Comparação de Carrinhos</h4>
      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate(-1)}>
        &larr; Voltar
      </button>

      {carrinhos.length > 0 && (
        <div className="mb-4">
          <label className="form-label">Escolha o carrinho para comparar:</label>
          <select
            className="form-select mb-2"
            value={carrinhoSelecionadoId}
            onChange={(e) => {
              setCarrinhoSelecionadoId(e.target.value);
              setMostrarItens(false);
              setPrecosFixos({});
            }}
          >
            {carrinhos.map((c, i) => (
              <option key={c.id} value={c.id}>
                Carrinho #{i + 1} - {new Date(c.criadoEm).toLocaleString()}
                {c.pedidoFeito ? " (pedido já feito)" : ""}
              </option>
            ))}
          </select>
          <button className="btn btn-outline-primary" onClick={() => setMostrarItens(!mostrarItens)}>
            {mostrarItens ? "Ocultar Itens" : "Exibir Itens"}
          </button>
        </div>
      )}

      {mostrarItens && carrinhoSelecionado && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Itens do Carrinho Selecionado</h5>
            <ul className="list-group">
              {carrinhoSelecionado.items.map((item, idx) => (
                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                  {(item.qtd || item.quantidade || 1)}x {item.name}
                  <span className="badge bg-secondary">
                    R{""}${(item.price * (item.qtd || item.quantidade || 1)).toFixed(2).replace(".", ",")}
                  </span>
                </li>
              ))}
            </ul>
            <strong>Total: R{""}${totalSelecionado.toFixed(2).replace(".", ",")}</strong>
          </div>
        </div>
      )}

      <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-3">
        {mercadoMaisPerto && (
          <span>
            <strong>Mais perto:</strong> {mercadosProximos.find((m) => m.id === mercadoMaisPerto)?.nome} (
            {(mercadoMaisPertoObj.dist / 1000).toFixed(2)} km)
          </span>
        )}
        {mercadoMaisBarato && (
          <span>
            <strong>Mais barato:</strong> {mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome} (R$ {minTotal.toFixed(2).replace(".", ",")})
          </span>
        )}
      </div>

      <div className="mb-4 p-4 bg-light rounded shadow-sm">
        <h5 className="mb-3">Comparar preços por mercado</h5>
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <input type="text" className="form-control" placeholder="Digite seu CEP" value={cep} onChange={(e) => setCep(e.target.value)} disabled={retirarNaLoja} />
          </div>
          <div className="col-md-6">
            <button
              className="btn btn-success w-100"
              onClick={() => {
                setMercadosSelecionados([]);
                setPrecosFixos({});
              }}
            >
              Atualizar Mercados Próximos
            </button>
          </div>
        </div>

        {mercadosProximos.length > 0 && (
          <>
            <div className="btn-group mb-3">
              <button className={`btn btn-outline-secondary ${ordenarPor === "distancia" ? "active" : ""}`} onClick={() => setOrdenarPor("distancia")}>
                Ordenar por Distância
              </button>
              <button className={`btn btn-outline-secondary ${ordenarPor === "preco" ? "active" : ""}`} onClick={() => setOrdenarPor("preco")}>
                Ordenar por Preço
              </button>
            </div>

            <div className="form-check mb-2">
              <input type="checkbox" className="form-check-input" id="check-todos" checked={todosMarcados} onChange={toggleSelecionarTodos} />
              <label className="form-check-label" htmlFor="check-todos">
                Selecionar todos
              </label>
            </div>

            <p className="text-muted fw-semibold mb-2">Selecione os mercados para comparar:</p>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
              {mercadosOrdenados.map((m) => (
                <div key={m.id} className="col">
                  <div className="form-check border rounded px-3 py-2 h-100 d-flex align-items-center" style={{ userSelect: "none" }}>
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      id={`mercado-${m.id}`}
                      checked={mercadosSelecionados.includes(m.id)}
                      onChange={() => {
                        setMercadosSelecionados((prev) => (prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]));
                      }}
                    />
                    <label className="form-check-label mb-0 d-flex justify-content-between w-100" htmlFor={`mercado-${m.id}`}>
                      <span>{m.nome}</span>
                      <small className="text-muted ms-2">{(m.distance / 1000).toFixed(2)} km</small>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {mercadosSelecionados.length > 0 && (
        <div className="mt-5">
          <h5 className="mb-3">Comparativo de Preços nos Mercados Selecionados</h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm align-middle">
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
                      const m = menoresPrecosPorProduto[item.name];
                      const low = p && Number(p) === m;
                      const high = p && Number(p) > m;
                      let cls = "text-center";
                      if (low) cls += " table-success";
                      else if (high) cls += " table-danger";
                      return <td key={id} className={cls}>{p ? `R$ ${p.replace(".", ",")}` : "-"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h6>Totais por Mercado:</h6>
            <ul className="list-group mb-3">
              {mercadosSelecionadosOrdenados.map((id) => {
                const m = mercadosProximos.find((x) => x.id === id);
                const nome = m?.nome || id;
                const total = totalPorMercado[id]?.toFixed(2).replace(".", ",");
                const low = id === mercadoMaisBarato;
                const high = id === mercadoMaisCaro;
                const near = id === mercadoMaisPerto;
                return (
                  <li key={id} className={`list-group-item d-flex justify-content-between align-items-center ${low ? "list-group-item-success" : ""} ${high ? "list-group-item-danger" : ""}`}>
                    <span>{nome}</span>
                    <span>
                      R$ {total} {low && <span className="badge bg-success ms-2">Mais barato</span>}
                      {high && <span className="badge bg-danger ms-2">Mais caro</span>}
                      {near && <span className="badge bg-info ms-2">Mais perto</span>}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="fs-5">
              Você pode economizar <strong className="text-success">R$ {economia.toFixed(2).replace(".", ",")}</strong> comprando no mercado{" "}
              <strong>{mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome}</strong> ao invés do mercado{" "}
              <strong>{mercadosProximos.find((m) => m.id === mercadoMaisCaro)?.nome}</strong>.
            </p>

            <button className="btn btn-primary mt-3 mb-3" onClick={() => setMostrarPedido(true)}>
              Fazer Pedido
            </button>

            {mostrarPedido && (
              <div className="mt-3">
                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="retiradaSwitch" checked={retirarNaLoja} onChange={() => setRetirarNaLoja(!retirarNaLoja)} />
                  <label className="form-check-label" htmlFor="retiradaSwitch">Retirar na loja</label>
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
                    const tot = totalPorMercado[id] ?? 0;
                    const diff = tot - minTotal;
                    const txt = diff === 0 ? `→ Mais barato (economize até R$ ${economia.toFixed(2).replace(".", ",")})` : `(+ R$ ${diff.toFixed(2).replace(".", ",")})`;
                    return (
                      <option key={id} value={id}>
                        {nome} - R$ {tot.toFixed(2).replace(".", ",")} {txt}
                      </option>
                    );
                  })}
                </select>

                {enderecoLoja && (
                  <p className="text-muted mb-3">
                    <small>
                      <strong>Endereço da loja:</strong> {enderecoLoja}
                    </small>
                  </p>
                )}

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
                    const totalBRL = `R$ ${(totalPorMercado[mercadoSelecionadoPedido] || 0).toFixed(2).replace(".", ",")}`;
                    const payment = await askPayment(totalBRL);
                    if (!payment) return;

                    const nome = mercadosProximos.find((m) => m.id === mercadoSelecionadoPedido)?.nome || mercadoSelecionadoPedido;
                    const tot = totalPorMercado[mercadoSelecionadoPedido] || 0;
                    const itens = carrinhoSelecionado.items.map((item) => ({
                      nome: item.name,
                      preco: precosFixos[item.name]?.[mercadoSelecionadoPedido] || item.price,
                    }));

                    const paymentForDB =
                      payment.method === "card"
                        ? { method: "card", card: sanitizeCardForDB(payment.payload) }
                        : { method: "pix", pix: { type: payment.payload.type, keyMasked: maskPixKey(payment.payload.key) } };

                    try {
                      await Swal.fire({
                        title: "Processando pagamento...",
                        html: "Aguarde alguns segundos.",
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        timer: 2000,
                        timerProgressBar: true,
                      });

                      const pedido = {
                        mercadoId: mercadoSelecionadoPedido,
                        mercadoNome: nome,
                        total: tot,
                        dataHora: new Date().toISOString(),
                        carrinhoId: carrinhoSelecionadoId,
                        retiradaEmLoja: retirarNaLoja,
                        endereco: retirarNaLoja ? null : { cep, rua: ruaCompleta, numero },
                        lojaEndereco: enderecoLoja,
                        itens,
                        pagamento: paymentForDB,
                      };

                      const pRef = ref(db, `usuarios/${user.uid}/pedidos`);
                      await push(pRef, pedido);
                      const cRef = ref(db, `usuarios/${user.uid}/carts/${carrinhoSelecionadoId}`);
                      await update(cRef, { pedidoFeito: true });

                      Swal.fire({
                        title: "Pedido Enviado!",
                        text: `Seu pedido para o mercado ${nome} foi enviado com sucesso.`,
                        icon: "success",
                        showCancelButton: true,
                        confirmButtonText: "Ir para Pedidos",
                        cancelButtonText: "Fechar",
                      }).then((r) => {
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
        </div>
      )}
    </div>
  );
}
