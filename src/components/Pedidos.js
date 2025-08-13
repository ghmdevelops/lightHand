import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import {
  Card,
  Container,
  Row,
  Col,
  Spinner,
  Button,
  Modal,
  ListGroup,
  ButtonGroup,
  Badge,
} from "react-bootstrap";
import { FaTrash, FaMapMarkerAlt, FaChevronDown, FaChevronUp, FaRoute } from "react-icons/fa";
import { getAuth } from "firebase/auth";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

const carroIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743007.png",
  iconSize: [40, 40],
});

function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length === 2) map.fitBounds(bounds, { padding: [20, 20] });
  }, [bounds, map]);
  return null;
}

function FitAll({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length >= 2) map.fitBounds(points, { padding: [20, 20] });
  }, [points, map]);
  return null;
}

function formatCurrency(v) {
  const n = Number(v || 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function haversineKm([lat1, lon1], [lat2, lon2]) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function normalizeLatLng(v) {
  if (!v) return null;
  if (Array.isArray(v) && v.length >= 2) {
    const a = Number(v[0]);
    const b = Number(v[1]);
    if (isFinite(a) && isFinite(b)) return [a, b];
  }
  if (typeof v === "object") {
    const lat = v.lat ?? v.latitude ?? v.y;
    const lng = v.lng ?? v.lon ?? v.long ?? v.longitude ?? v.x;
    if (isFinite(lat) && isFinite(lng)) return [Number(lat), Number(lng)];
    if (Array.isArray(v.coordinates) && v.coordinates.length >= 2) {
      const c0 = Number(v.coordinates[0]);
      const c1 = Number(v.coordinates[1]);
      if (isFinite(c0) && isFinite(c1)) return [c0, c1];
    }
  }
  if (typeof v === "string") {
    const parts = v.split(",").map((s) => parseFloat(String(s).trim()));
    if (parts.length >= 2 && isFinite(parts[0]) && isFinite(parts[1])) return [parts[0], parts[1]];
  }
  return null;
}

function composeAddressFromParts(e) {
  if (!e) return null;
  if (typeof e === "string") return e;
  const txt =
    e.texto ||
    e.descricao ||
    e.enderecoCompleto ||
    e.formatted ||
    e.formattedAddress ||
    e.address ||
    e.display_name ||
    e.description;
  if (txt) return txt;
  const rua = e.rua || e.logradouro || e.street || e.road;
  const num = e.numero || e.num || e.number || e.house_number;
  const bairro = e.bairro || e.distrito || e.neighborhood || e.suburb;
  const cidade = e.cidade || e.municipio || e.city || e.town;
  const uf = e.uf || e.estado || e.state;
  const cep = e.cep || e.postcode || e.zip;
  const linha1 = [rua, num].filter(Boolean).join(", ");
  const linha2 = cidade && uf ? `${cidade}/${uf}` : cidade || uf || null;
  const parts = [linha1 || null, bairro || null, linha2, cep || null].filter(Boolean);
  return parts.length ? parts.join(" - ") : null;
}

function deepFindLatLng(o, depth = 0) {
  if (!o || depth > 4) return null;
  const direct =
    normalizeLatLng(
      (o.latlng ||
        o.latLng ||
        o.location ||
        o.coords ||
        o.coordinate ||
        o.position ||
        o.geometry ||
        o.geo ||
        o.center) ?? null
    ) || normalizeLatLng(o);
  if (direct) return direct;
  if (typeof o === "object") {
    for (const k of Object.keys(o)) {
      const v = o[k];
      const r = normalizeLatLng(v);
      if (r) return r;
    }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === "object") {
        const r = deepFindLatLng(v, depth + 1);
        if (r) return r;
      }
    }
  }
  return null;
}

function deepFindAddress(o, depth = 0) {
  if (!o || depth > 4) return null;
  if (typeof o === "string") return o;
  if (typeof o === "object") {
    const txt = composeAddressFromParts(o);
    if (txt) return txt;
    const keys = [
      "endereco",
      "enderecoEntrega",
      "deliveryAddress",
      "address",
      "descricao",
      "texto",
      "formattedAddress",
      "display_name",
    ];
    for (const k of keys) if (o[k]) return deepFindAddress(o[k], depth + 1);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v && typeof v === "object") {
        const r = deepFindAddress(v, depth + 1);
        if (r) return r;
      }
    }
  }
  return null;
}

function getEntregaEndereco(pedido) {
  const cand =
    pedido.endereco ||
    pedido.enderecoEntrega ||
    pedido.destino ||
    pedido.deliveryAddress ||
    pedido.address ||
    pedido.clienteEndereco ||
    pedido.enderecoCliente ||
    null;
  const texto =
    deepFindAddress(cand) ||
    pedido.enderecoTexto ||
    pedido.enderecoDescricao ||
    pedido.destinoEndereco ||
    pedido.addressText ||
    null;
  const latlng =
    deepFindLatLng(cand) ||
    normalizeLatLng(
      pedido.enderecoLatLng ||
        pedido.enderecoLatlng ||
        pedido.destinoLatLng ||
        pedido.destinoLatlng ||
        pedido.clienteLatLng ||
        pedido.clienteLatlng ||
        null
    );
  return { texto, latlng };
}

function getLojaEndereco(pedido) {
  const texto =
    deepFindAddress(pedido.loja) ||
    pedido.lojaEndereco ||
    pedido.enderecoLoja ||
    pedido.mercadoEndereco ||
    (pedido.mercado && deepFindAddress(pedido.mercado)) ||
    null;
  const latlng =
    deepFindLatLng(pedido.loja) ||
    deepFindLatLng(pedido.mercado) ||
    normalizeLatLng(
      pedido.lojaLatLng ||
        pedido.mercadoLatLng ||
        pedido.lojaLatlng ||
        pedido.mercadoLatlng ||
        null
    );
  return { texto, latlng };
}

export default function Pedidos() {
  const user = getAuth().currentUser;
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidoIds, setExpandidoIds] = useState([]);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);
  const [mapaTipo, setMapaTipo] = useState(null);
  const [rotaCoords, setRotaCoords] = useState([]);
  const [rotaDuracaoSec, setRotaDuracaoSec] = useState(null);
  const [rotaDistM, setRotaDistM] = useState(null);
  const [rotaLoading, setRotaLoading] = useState(false);
  const [origem, setOrigem] = useState(null);
  const [destino, setDestino] = useState(null);
  const [waypoints, setWaypoints] = useState([]);

  const posicaoFallback = useMemo(() => [-23.55052, -46.633308], []);

  useEffect(() => {
    if (!user) return;
    const pedidosRef = ref(db, `usuarios/${user.uid}/pedidos`);
    onValue(pedidosRef, (snap) => {
      const data = snap.val();
      const lista = data ? Object.entries(data).map(([id, p]) => ({ id, ...p })) : [];
      setPedidos(lista.reverse());
      setLoading(false);
    });
  }, [user]);

  const toggleExpandir = (id) =>
    setExpandidoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const excluirPedido = async (id) => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      alert("Você não está logado.");
      return;
    }
    if (!window.confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
      await remove(ref(db, `usuarios/${uid}/pedidos/${id}`));
      setPedidos((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      alert("Erro ao excluir pedido: " + (e?.message || ""));
    }
  };

  async function geocodeAddress(text) {
    if (!text) return null;
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&accept-language=pt&q=${encodeURIComponent(
        text
      )}`
    );
    if (!r.ok) return null;
    const arr = await r.json();
    if (!arr?.length) return null;
    const lat = parseFloat(arr[0].lat),
      lon = parseFloat(arr[0].lon);
    return isFinite(lat) && isFinite(lon) ? [lat, lon] : null;
  }

  function composeEntregaTextoFromPedido(pedido) {
    const e = pedido?.endereco || {};
    const parts = [e.rua, e.numero, e.cep, "Brasil"].filter(Boolean);
    return parts.length ? parts.join(", ") : null;
  }

  async function fetchOSRM(orig, dest) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${orig[1]},${orig[0]};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("rota");
      const json = await r.json();
      const route = json.routes && json.routes[0];
      if (!route) throw new Error("sem rota");
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return { coords, duration: route.duration, distance: route.distance };
    } catch {
      const distKm = haversineKm(orig, dest);
      const dur = (distKm / 30) * 3600;
      return { coords: [orig, dest], duration: dur, distance: distKm * 1000 };
    }
  }

  async function fetchOSRMMulti(points) {
    try {
      if (!points || points.length < 2) throw new Error("poucos pontos");
      const path = points.map(([lat, lon]) => `${lon},${lat}`).join(";");
      const url = `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("rota");
      const json = await r.json();
      const route = json.routes && json.routes[0];
      if (!route) throw new Error("sem rota");
      const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      return { coords, duration: route.duration, distance: route.distance };
    } catch {
      let distance = 0;
      const coords = [points[0]];
      for (let i = 0; i < points.length - 1; i++) {
        distance += haversineKm(points[i], points[i + 1]) * 1000;
        coords.push(points[i + 1]);
      }
      const duration = (distance / 1000 / 30) * 3600;
      return { coords, duration, distance };
    }
  }

  const abrirMapaEntrega = async (pedido) => {
    const entrega = getEntregaEndereco(pedido);
    let destinoCliente = normalizeLatLng(entrega.latlng);
    if (!destinoCliente) {
      const txtEntrega =
        entrega.texto ||
        [pedido?.endereco?.rua, pedido?.endereco?.numero, pedido?.endereco?.cidade, pedido?.endereco?.estado, pedido?.endereco?.cep, "Brasil"].filter(Boolean).join(", ");
      destinoCliente = await geocodeAddress(txtEntrega);
    }
    if (!destinoCliente) destinoCliente = posicaoFallback;
    setPedidoSelecionado(pedido);
    setMapaTipo("entrega");
    setMapaAberto(true);
    setRotaLoading(true);
    const origemUsuario = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
    const origemLocal = origemUsuario || posicaoFallback;
    setOrigem(origemLocal);
    setDestino(destinoCliente);
    setWaypoints([]);
    try {
      const r = await fetchOSRM(origemLocal, destinoCliente);
      setRotaCoords(r.coords);
      setRotaDuracaoSec(r.duration);
      setRotaDistM(r.distance);
    } finally {
      setRotaLoading(false);
    }
  };

  const abrirMapaRetirada = async (pedido) => {
    setPedidoSelecionado(pedido);
    setMapaTipo("retirada");
    setMapaAberto(true);
    setRotaLoading(true);
    const loja = getLojaEndereco(pedido);
    const destinoLoja = normalizeLatLng(loja.latlng) || posicaoFallback;
    function continuar(orig) {
      setOrigem(orig);
      setDestino(destinoLoja);
      setWaypoints([]);
      fetchOSRM(orig, destinoLoja).then((r) => {
        setRotaCoords(r.coords);
        setRotaDuracaoSec(r.duration);
        setRotaDistM(r.distance);
        setRotaLoading(false);
      });
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => continuar([pos.coords.latitude, pos.coords.longitude]),
        () => continuar(posicaoFallback),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      continuar(posicaoFallback);
    }
  };

  function mercadosDoPedido(p) {
    const nomes =
      (Array.isArray(p.mercadosNomes) && p.mercadosNomes.length ? p.mercadosNomes : null) ||
      (Array.isArray(p.mercados) && p.mercados.length ? p.mercados.map((m) => m.nome || m.id) : null) ||
      (Array.isArray(p.mercadosInfo) && p.mercadosInfo.length ? p.mercadosInfo.map((m) => m.nome || m.id) : null) ||
      null;
    if (nomes) return Array.from(new Set(nomes.filter(Boolean)));
    const itens = Array.isArray(p.itens) ? p.itens : [];
    const fromItens = Array.from(new Set(itens.map((it) => it.mercadoNome).filter(Boolean)));
    if (fromItens.length) return fromItens;
    if (p.mercadoNome) return [p.mercadoNome];
    return [];
  }

  const abrirMapaMulti = async (pedido) => {
    setPedidoSelecionado(pedido);
    setMapaTipo("multi");
    setMapaAberto(true);
    setRotaLoading(true);
    const entrega = getEntregaEndereco(pedido);
    let destinoCliente = normalizeLatLng(entrega.latlng);
    let entregaTexto =
      entrega.texto ||
      [pedido?.endereco?.rua, pedido?.endereco?.numero, pedido?.endereco?.cidade, pedido?.endereco?.estado, pedido?.endereco?.cep, "Brasil"].filter(Boolean).join(", ");
    if (!destinoCliente) destinoCliente = (await geocodeAddress(entregaTexto)) || posicaoFallback;
    const origemUsuario = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.latitude, pos.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
    const origemLocal = origemUsuario || posicaoFallback;
    const nomesMercados = mercadosDoPedido(pedido);
    const cidadeHint =
      (pedido?.endereco?.cidade && pedido?.endereco?.estado
        ? `${pedido.endereco.cidade} ${pedido.endereco.estado} Brasil`
        : "Brasil") || "Brasil";
    const stops = [];
    for (const nome of nomesMercados) {
      const q = `${nome} supermercado ${cidadeHint}`;
      const c = await geocodeAddress(q);
      if (c) stops.push({ nome, coord: c });
    }
    const points = [origemLocal, ...stops.map((s) => s.coord), destinoCliente];
    setOrigem(origemLocal);
    setDestino(destinoCliente);
    setWaypoints(stops.map((s) => s.coord));
    try {
      const r = await fetchOSRMMulti(points);
      setRotaCoords(r.coords);
      setRotaDuracaoSec(r.duration);
      setRotaDistM(r.distance);
    } finally {
      setRotaLoading(false);
    }
  };

  const fecharMapa = () => {
    setMapaAberto(false);
    setPedidoSelecionado(null);
    setMapaTipo(null);
    setRotaCoords([]);
    setRotaDuracaoSec(null);
    setRotaDistM(null);
    setOrigem(null);
    setDestino(null);
    setWaypoints([]);
  };

  if (loading)
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );

  return (
    <Container className="mt-4" style={{ zIndex: 2, paddingTop: "80px" }}>
      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate(-1)}>
        &larr; Voltar
      </button>
      <div
        className="rounded-4 p-4 mb-4"
        style={{
          background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
          color: "#fff",
          boxShadow: "0 10px 24px rgba(0,0,0,0.15)",
        }}
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between">
          <h2 className="m-0">Pedidos</h2>
          <div className="d-flex gap-2">
            <Badge bg="light" text="dark">
              {pedidos.length} pedidos
            </Badge>
          </div>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="alert alert-info mt-4">Você ainda não tem pedidos realizados.</div>
      ) : (
        <Row>
          {pedidos.map((pedido) => {
            const expandido = expandidoIds.includes(pedido.id);
            const dataPedido = new Date(pedido.dataHora);
            const ehRecente = (Date.now() - dataPedido) / 86400000 < 7;
            const itens = pedido.itens || [];
            const totalItens = itens.reduce((acc, it) => acc + Number(it.qtd || it.quantidade || 1), 0);
            const totalCalculado = itens.reduce(
              (acc, it) => acc + Number(it.preco || 0) * Number(it.qtd || it.quantidade || 1),
              0
            );
            const totalPedido = Number(pedido.total || totalCalculado || 0);
            const entrega = getEntregaEndereco(pedido);
            const loja = getLojaEndereco(pedido);
            let etaEntregaMin = null;
            if (!pedido.retiradaEmLoja && loja.latlng && entrega.latlng) {
              const distKm = haversineKm(normalizeLatLng(loja.latlng), normalizeLatLng(entrega.latlng));
              etaEntregaMin = Math.max(1, Math.round((distKm / 30) * 60));
            }
            const isMulti = !!pedido.multiMercado || (Array.isArray(pedido.mercadosNomes) && pedido.mercadosNomes.length > 1) || (Array.isArray(pedido.mercados) && pedido.mercados.length > 1);
            const mercadosNomes = (pedido.mercadosNomes && pedido.mercadosNomes.length ? pedido.mercadosNomes : null) || (pedido.mercados && pedido.mercados.length ? pedido.mercados.map((m) => m.nome || m.id) : null) || [];
            return (
              <Col md={6} lg={4} key={pedido.id} className="mb-4">
                <Card className="shadow-sm border-0 rounded-4 overflow-hidden">
                  <div
                    className="px-3 py-2"
                    style={{
                      background: isMulti
                        ? "linear-gradient(90deg,#f7971e,#ffd200)"
                        : pedido.retiradaEmLoja
                        ? "linear-gradient(90deg,#00b09b,#96c93d)"
                        : "linear-gradient(90deg,#4facfe,#00f2fe)",
                      color: "#fff",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="fw-semibold">
                        {isMulti ? "Pedido Personalizado (Multi-mercados)" : pedido.mercadoNome || "Pedido"}
                      </div>
                      <div className="d-flex gap-2">
                        {ehRecente && <Badge bg="light" text="dark">Recente</Badge>}
                        {pedido.retiradaEmLoja && !isMulti && <Badge bg="dark">Retirar</Badge>}
                        {isMulti && <Badge bg="dark">Paradas {mercadosNomes.length || (pedido.mercadosInfo?.length || 0)}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="text-muted">Data</div>
                      <div className="fw-semibold">{dataPedido.toLocaleString()}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="text-muted">Itens</div>
                      <div className="fw-semibold">{totalItens}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div className="text-muted">Total</div>
                      <div className="fw-bold">{formatCurrency(totalPedido)}</div>
                    </div>

                    {isMulti ? (
                      <>
                        <div className="mb-2 small">
                          <div className="text-muted">Janela de entrega</div>
                          <div className="fw-semibold">{pedido.janelaEntrega || "Não informado"}</div>
                        </div>
                        <div className="mb-2 small">
                          <div className="text-muted">Mercados</div>
                          <div className="fw-semibold">
                            {(mercadosNomes && mercadosNomes.length ? mercadosNomes : pedido.mercadosInfo?.map((m) => m.nome))?.join(", ") || "—"}
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="text-muted">Distância da rota</div>
                          <div className="fw-semibold">
                            {pedido.rotaKm != null ? `${Number(pedido.rotaKm).toFixed(2)} km` : "—"}
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="text-muted">Frete da rota</div>
                          <div className="fw-semibold">
                            {pedido.freteRota != null ? formatCurrency(pedido.freteRota) : "—"}
                          </div>
                        </div>
                        <div className="mb-2 small">
                          <div className="text-muted">Endereço de entrega</div>
                          <div className="fw-semibold">
                            {entrega.texto ||
                              (normalizeLatLng(entrega.latlng)
                                ? `${normalizeLatLng(entrega.latlng)[0].toFixed(5)}, ${normalizeLatLng(entrega.latlng)[1].toFixed(5)}`
                                : "Não disponível")}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {!pedido.retiradaEmLoja && (
                          <div className="mb-2 small">
                            <div className="text-muted">Endereço de entrega</div>
                            <div className="fw-semibold">
                              {entrega.texto ||
                                (normalizeLatLng(entrega.latlng)
                                  ? `${normalizeLatLng(entrega.latlng)[0].toFixed(5)}, ${normalizeLatLng(entrega.latlng)[1].toFixed(5)}`
                                  : "Não disponível")}
                            </div>
                          </div>
                        )}
                        {pedido.retiradaEmLoja && (
                          <div className="mb-2 small">
                            <div className="text-muted">Endereço da loja</div>
                            <div className="fw-semibold">{loja.texto || "Não disponível"}</div>
                          </div>
                        )}
                        {!pedido.retiradaEmLoja && etaEntregaMin !== null && (
                          <div className="mb-3">
                            <Badge bg="secondary">ETA aprox.: {etaEntregaMin} min</Badge>
                          </div>
                        )}
                      </>
                    )}

                    <ButtonGroup aria-label="Ações" className="mb-3 w-100 gap-2">
                      <Button
                        variant={expandido ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => toggleExpandir(pedido.id)}
                        style={{ flexGrow: 1 }}
                      >
                        {expandido ? (
                          <>
                            Ocultar Itens <FaChevronUp className="ms-1" />
                          </>
                        ) : (
                          <>
                            Mostrar Itens <FaChevronDown className="ms-1" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => excluirPedido(pedido.id)}
                        style={{ flexGrow: 1 }}
                      >
                        <FaTrash className="me-1" />
                        Excluir
                      </Button>
                      {isMulti ? (
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => abrirMapaMulti(pedido)}
                          style={{ flexGrow: 1 }}
                        >
                          <FaRoute className="me-1" />
                          Mapa do percurso
                        </Button>
                      ) : pedido.retiradaEmLoja ? (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => abrirMapaRetirada(pedido)}
                          style={{ flexGrow: 1 }}
                        >
                          <FaMapMarkerAlt className="me-1" />
                          Rota p/ retirar
                        </Button>
                      ) : (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => abrirMapaEntrega(pedido)}
                          style={{ flexGrow: 1 }}
                        >
                          <FaMapMarkerAlt className="me-1" />
                          Rota da entrega
                        </Button>
                      )}
                    </ButtonGroup>

                    {origem && destino && (
                      <a
                        className="btn btn-light w-100"
                        href={
                          mapaTipo === "multi" && waypoints.length
                            ? `https://www.google.com/maps/dir/?api=1&origin=${origem[0]},${origem[1]}&destination=${destino[0]},${destino[1]}&waypoints=${waypoints
                                .map((w) => `${w[0]},${w[1]}`)
                                .join("|")}`
                            : `https://www.google.com/maps/dir/?api=1&origin=${origem[0]},${origem[1]}&destination=${destino[0]},${destino[1]}`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir no Google Maps
                      </a>
                    )}

                    <div
                      style={{
                        maxHeight: expandido ? "1000px" : 0,
                        overflow: "hidden",
                        transition: "max-height 0.4s ease",
                      }}
                    >
                      {expandido && (
                        <ListGroup variant="flush" className="border rounded p-3 mt-3">
                          {itens.map((item, i) => {
                            const qtd = Number(item.qtd || item.quantidade || 1);
                            const preco = Number(item.preco || 0);
                            return (
                              <ListGroup.Item
                                key={i}
                                className="py-2 d-flex justify-content-between align-items-center"
                              >
                                <div>
                                  {qtd}x {item.nome}
                                  {isMulti && item.mercadoNome ? (
                                    <span className="ms-2 badge bg-light text-dark">{item.mercadoNome}</span>
                                  ) : null}
                                </div>
                                <div>{formatCurrency(preco * qtd)}</div>
                              </ListGroup.Item>
                            );
                          })}
                        </ListGroup>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={mapaAberto} onHide={fecharMapa} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {mapaTipo === "retirada"
              ? "Rota para Retirar na Loja"
              : mapaTipo === "multi"
              ? "Percurso Multi-mercados"
              : "Rota da Entrega"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: "520px", position: "relative" }}>
          {pedidoSelecionado && (
            <>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="d-flex flex-wrap align-items-center gap-2">
                  {rotaDistM != null && rotaDistM > 1 && (
                    <Badge bg="secondary">Distância: {(rotaDistM / 1000).toFixed(2)} km</Badge>
                  )}
                  {rotaDuracaoSec != null && rotaDistM != null && rotaDistM > 1 && (
                    <Badge bg="dark">Tempo estimado: {Math.max(1, Math.round(rotaDuracaoSec / 60))} min</Badge>
                  )}
                  {mapaTipo === "multi" && (
                    <Badge bg="warning" text="dark">
                      Paradas: {waypoints.length}
                    </Badge>
                  )}
                  {(rotaDistM == null || rotaDistM <= 1) && (
                    <Badge bg="warning" text="dark">Dados de rota indisponíveis</Badge>
                  )}
                </div>
                <div className="text-muted small">
                  {mapaTipo === "retirada"
                    ? pedidoSelecionado.mercadoNome || "Loja"
                    : pedidoSelecionado.mercadoNome || "Percurso"}
                </div>
              </div>
              <div style={{ height: "460px", width: "100%", borderRadius: 16, overflow: "hidden" }}>
                <MapContainer center={destino || posicaoFallback} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {mapaTipo === "multi" ? (
                    <FitAll points={[...(origem ? [origem] : []), ...waypoints, ...(destino ? [destino] : [])]} />
                  ) : origem && destino ? (
                    <FitBounds bounds={[origem, destino]} />
                  ) : null}
                  {origem && (
                    <Marker position={origem} icon={carroIcon}>
                      <Popup>Origem</Popup>
                    </Marker>
                  )}
                  {waypoints.map((w, idx) => (
                    <Marker key={idx} position={w}>
                      <Popup>Parada {idx + 1}</Popup>
                    </Marker>
                  ))}
                  {destino && (
                    <Marker position={destino}>
                      <Popup>Destino</Popup>
                    </Marker>
                  )}
                  {rotaCoords && rotaCoords.length > 1 && <Polyline positions={rotaCoords} weight={5} opacity={0.85} />}
                </MapContainer>
              </div>
              {rotaLoading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.6)",
                    borderRadius: 16,
                  }}
                >
                  <Spinner animation="border" />
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
