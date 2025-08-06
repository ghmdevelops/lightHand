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
  const d =
    Math.sin(c / 2) ** 2 +
    Math.cos(t(a)) * Math.cos(t(n)) * Math.sin(i / 2) ** 2;
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
  const i = await fetch(
    "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(c)
  );
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
      const v = `${b}${g ? ", " + g : ""}${f ? " - " + f : ""}${h ? "/" + h : ""
        }${y ? " - CEP " + y : ""}`;
      return {
        id: l.id.toString(),
        nome: m,
        distance: p,
        lat: e,
        lon: t,
        endereco: v,
        cep: y,
      };
    })
    .filter(Boolean)
    .sort((l, x) => l.distance - x.distance)
    .slice(0, r);
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
  const [carrinhoSelecionadoId, setCarrinhoSelecionadoId] = useState(
    selectedIdQuery
  );
  const [mostrarItens, setMostrarItens] = useState(false);
  const [mercadosProximos, setMercadosProximos] = useState([]);
  const [mercadosSelecionados, setMercadosSelecionados] = useState([]);
  const [precosFixos, setPrecosFixos] = useState({});
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [mercadoSelecionadoPedido, setMercadoSelecionadoPedido] =
    useState("");
  const [ordenarPor, setOrdenarPor] = useState("distancia");
  const [retirarNaLoja, setRetirarNaLoja] = useState(false);
  const [enderecoLoja, setEnderecoLoja] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const { latitude, longitude } = coords;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=pt`
        );
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
      const o = carrinhoIds
        .map((id) => ({ id, ...a[id] }))
        .filter((c) => c?.items);
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
      fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${m.lat}&lon=${m.lon}&format=json&addressdetails=1&accept-language=pt`
      )
        .then((r) => r.json())
        .then((d) => {
          const a = d.address || {};
          const e = `${a.road || ""}${a.house_number ? ", " + a.house_number : ""}${a.city || a.town ? " - " + (a.city || a.town) : ""
            }${a.state ? "/" + a.state : ""}${a.postcode ? " - CEP " + a.postcode : ""}`;
          setEnderecoLoja(e);
        })
        .catch(() => setEnderecoLoja(""));
    }
  }, [mercadoSelecionadoPedido, mercadosProximos]);

  if (loading) return <div className="container mt-5">Carregando comparação...</div>;

  const carrinhoSelecionado = carrinhos.find((c) => c.id === carrinhoSelecionadoId);
  const totalSelecionado = carrinhoSelecionado.items.reduce(
    (s, i) => s + Number(i.price),
    0
  );

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
  const mercadoMaisBarato = mercadosSelecionados.find(
    (id) => totalPorMercado[id] === minTotal
  );
  const mercadoMaisCaro = mercadosSelecionados.find(
    (id) => totalPorMercado[id] === maxTotal
  );
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
        setRuaCompleta(
          `${d.logradouro || ""}${d.bairro ? ", " + d.bairro : ""}${d.localidade ? ", " + d.localidade : ""
          }${d.uf ? " - " + d.uf : ""}`
        );
      });
  }

  const todosMarcados =
    mercadosProximos.length > 0 && mercadosSelecionados.length === mercadosProximos.length;

  function toggleSelecionarTodos() {
    if (todosMarcados) setMercadosSelecionados([]);
    else setMercadosSelecionados(mercadosProximos.map((m) => m.id));
  }

  const mercadosOrdenados = [...mercadosProximos].sort((a, o) => {
    if (ordenarPor === "distancia") return a.distance - o.distance;
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
          <button
            className="btn btn-outline-primary"
            onClick={() => setMostrarItens(!mostrarItens)}
          >
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
                <li
                  key={idx}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {(item.qtd || item.quantidade || 1)}x {item.name}
                  <span className="badge bg-secondary">
                    R$
                    {(item.price * (item.qtd || item.quantidade || 1))
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </li>
              ))}
            </ul>
            <strong>
              Total: R${totalSelecionado.toFixed(2).replace(".", ",")}
            </strong>
          </div>
        </div>
      )}

      <div className="alert alert-secondary d-flex justify-content-between align-items-center mb-3">
        {mercadoMaisPerto && (
          <span>
            <strong>Mais perto:</strong>{" "}
            {mercadosProximos.find((m) => m.id === mercadoMaisPerto)?.nome} (
            {(mercadoMaisPertoObj.dist / 1000).toFixed(2)} km)
          </span>
        )}
        {mercadoMaisBarato && (
          <span>
            <strong>Mais barato:</strong>{" "}
            {mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome} (
            R$ {minTotal.toFixed(2).replace(".", ",")})
          </span>
        )}
      </div>

      <div className="mb-4 p-4 bg-light rounded shadow-sm">
        <h5 className="mb-3">Comparar preços por mercado</h5>
        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <input
              type="text"
              className="form-control"
              placeholder="Digite seu CEP"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              disabled={retirarNaLoja}
            />
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
              <button
                className={`btn btn-outline-secondary ${ordenarPor === "distancia" ? "active" : ""
                  }`}
                onClick={() => setOrdenarPor("distancia")}
              >
                Ordenar por Distância
              </button>
              <button
                className={`btn btn-outline-secondary ${ordenarPor === "preco" ? "active" : ""
                  }`}
                onClick={() => setOrdenarPor("preco")}
              >
                Ordenar por Preço
              </button>
            </div>

            <div className="form-check mb-2">
              <input
                type="checkbox"
                className="form-check-input"
                id="check-todos"
                checked={todosMarcados}
                onChange={toggleSelecionarTodos}
              />
              <label className="form-check-label" htmlFor="check-todos">
                Selecionar todos
              </label>
            </div>

            <p className="text-muted fw-semibold mb-2">
              Selecione os mercados para comparar:
            </p>
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
              {mercadosOrdenados.map((m) => (
                <div key={m.id} className="col">
                  <div
                    className="form-check border rounded px-3 py-2 h-100 d-flex align-items-center"
                    style={{ userSelect: "none" }}
                  >
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      id={`mercado-${m.id}`}
                      checked={mercadosSelecionados.includes(m.id)}
                      onChange={() => {
                        setMercadosSelecionados((prev) =>
                          prev.includes(m.id)
                            ? prev.filter((x) => x !== m.id)
                            : [...prev, m.id]
                        );
                      }}
                    />
                    <label
                      className="form-check-label mb-0 d-flex justify-content-between w-100"
                      htmlFor={`mercado-${m.id}`}
                    >
                      <span>{m.nome}</span>
                      <small className="text-muted ms-2">
                        {(m.distance / 1000).toFixed(2)} km
                      </small>
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
                      return (
                        <td key={id} className={cls}>
                          {p ? `R$ ${p.replace(".", ",")}` : "-"}
                        </td>
                      );
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
                  <li
                    key={id}
                    className={`list-group-item d-flex justify-content-between align-items-center ${low ? "list-group-item-success" : ""
                      } ${high ? "list-group-item-danger" : ""}`}
                  >
                    <span>{nome}</span>
                    <span>
                      R$ {total}{" "}
                      {low && (
                        <span className="badge bg-success ms-2">Mais barato</span>
                      )}
                      {high && (
                        <span className="badge bg-danger ms-2">Mais caro</span>
                      )}
                      {near && (
                        <span className="badge bg-info ms-2">Mais perto</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <p className="fs-5">
              Você pode economizar{" "}
              <strong className="text-success">
                R$ {economia.toFixed(2).replace(".", ",")}
              </strong>{" "}
              comprando no mercado{" "}
              <strong>
                {mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome}
              </strong>{" "}
              ao invés do mercado{" "}
              <strong>
                {mercadosProximos.find((m) => m.id === mercadoMaisCaro)?.nome}
              </strong>
              .
            </p>

            <button className="btn btn-primary mt-3 mb-3" onClick={() => setMostrarPedido(true)}>
              Fazer Pedido
            </button>

            {mostrarPedido && (
              <div className="mt-3">
                <div className="form-check form-switch mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="retiradaSwitch"
                    checked={retirarNaLoja}
                    onChange={() => setRetirarNaLoja(!retirarNaLoja)}
                  />
                  <label className="form-check-label" htmlFor="retiradaSwitch">
                    Retirar na loja
                  </label>
                </div>

                {!retirarNaLoja && (
                  <>
                    <label className="form-label">Endereço para entrega:</label>
                    <input
                      type="text"
                      className="form-control mb-2"
                      placeholder="CEP"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control mb-3"
                      placeholder="Rua, Bairro, Cidade - Estado"
                      value={ruaCompleta}
                      onChange={(e) => setRuaCompleta(e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control mb-3"
                      placeholder="Número"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                    />
                  </>
                )}

                <label className="form-label mb-3">Escolha o Mercado:</label>
                <select
                  className="form-select mb-2"
                  value={mercadoSelecionadoPedido}
                  onChange={(e) => setMercadoSelecionadoPedido(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {mercadosSelecionadosOrdenados.slice(0, 15).map((id) => {
                    const m = mercadosProximos.find((x) => x.id === id);
                    const nome = m?.nome || id;
                    const tot = totalPorMercado[id] ?? 0;
                    const diff = tot - minTotal;
                    const txt =
                      diff === 0
                        ? `→ Mais barato (economize até R$ ${economia
                          .toFixed(2)
                          .replace(".", ",")})`
                        : `(+ R$ ${diff.toFixed(2).replace(".", ",")})`;
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
                    const nome =
                      mercadosProximos.find((m) => m.id === mercadoSelecionadoPedido)?.nome ||
                      mercadoSelecionadoPedido;
                    const tot = totalPorMercado[mercadoSelecionadoPedido] || 0;
                    const itens = carrinhoSelecionado.items.map((item) => ({
                      nome: item.name,
                      preco: precosFixos[item.name]?.[mercadoSelecionadoPedido] || item.price,
                    }));
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
                    };
                    try {
                      const pRef = ref(db, `usuarios/${user.uid}/pedidos`);
                      await push(pRef, pedido);
                      const cRef = ref(db, `usuarios/${user.uid}/carts/${carrinhoSelecionadoId}`);
                      await update(cRef, { pedidoFeito: true });
                      await Swal.fire({
                        title: "Enviando pedido...",
                        html: "Aguarde alguns segundos.",
                        allowOutsideClick: false,
                        didOpen: () => Swal.showLoading(),
                        timer: 2500,
                        timerProgressBar: true,
                      });
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
                      setMostrarPedido(false);
                      setMercadoSelecionadoPedido("");
                      setRuaCompleta("");
                      setNumero("");
                      setCep("");
                      setRetirarNaLoja(false);
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
