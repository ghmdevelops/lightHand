import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, get, push } from "firebase/database";
import Swal from "sweetalert2";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function CompararCarrinhosPage({ user }) {
  const query = useQuery();
  const navigate = useNavigate();
  const carrinhoIds = query.get("ids")?.split(",") || [];
  const selectedIdQuery = query.get("selected") || "";
  const [rua, setRua] = useState("");
  const [numero, setNumero] = useState("");
  const [ruaCompleta, setRuaCompleta] = useState("");

  const [carrinhos, setCarrinhos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carrinhoSelecionadoId, setCarrinhoSelecionadoId] =
    useState(selectedIdQuery);
  const [mostrarItens, setMostrarItens] = useState(false);
  const [cep, setCep] = useState("");
  const [mercadosProximos, setMercadosProximos] = useState([]);
  const [mercadosSelecionados, setMercadosSelecionados] = useState([]);
  const [precosFixos, setPrecosFixos] = useState({});
  const [mostrarPedido, setMostrarPedido] = useState(false);
  const [mercadoSelecionadoPedido, setMercadoSelecionadoPedido] = useState("");

  useEffect(() => {
    if (cep.length >= 8) {
      buscarEnderecoPorCEP(cep);
    }
  }, [cep]);

  useEffect(() => {
    async function fetchCarrinhos() {
      const snap = await get(ref(db, `usuarios/${user.uid}/carts`));
      const all = snap.val() || {};
      const selecionados = carrinhoIds
        .map((id) => ({ id, ...all[id] }))
        .filter((c) => c && c.items);
      setCarrinhos(selecionados);

      if (!selectedIdQuery && selecionados.length > 0) {
        setCarrinhoSelecionadoId(selecionados[0].id);
      }

      setLoading(false);
    }
    fetchCarrinhos();
  }, [carrinhoIds, user, selectedIdQuery]);

  useEffect(() => {
    if (!carrinhoSelecionadoId) return;
    const params = new URLSearchParams(window.location.search);
    params.set("selected", carrinhoSelecionadoId);
    navigate(`${window.location.pathname}?${params.toString()}`, {
      replace: true,
    });
  }, [carrinhoSelecionadoId, navigate]);

  useEffect(() => {
    if (!carrinhoSelecionadoId || mercadosSelecionados.length === 0) return;
    const novo = {};
    const carrinho = carrinhos.find((c) => c.id === carrinhoSelecionadoId);
    if (!carrinho) return;
    for (let item of carrinho.items) {
      novo[item.name] = {};
      for (let mercadoId of mercadosSelecionados) {
        const variacao = 1 + Math.random() * 0.2 - 0.1;
        const preco = (Number(item.price) * variacao).toFixed(2);
        novo[item.name][mercadoId] = preco;
      }
    }
    setPrecosFixos(novo);
  }, [carrinhoSelecionadoId, mercadosSelecionados]);

  if (loading)
    return <div className="container mt-5">Carregando comparação...</div>;

  const carrinhoSelecionado = carrinhos.find(
    (c) => c.id === carrinhoSelecionadoId
  );
  const totalSelecionado = carrinhoSelecionado?.items.reduce(
    (sum, it) => sum + Number(it.price),
    0
  );

  const menoresPrecosPorProduto = {};
  carrinhoSelecionado?.items.forEach((item) => {
    let menor = Infinity;
    for (let mercadoId of mercadosSelecionados) {
      const precoStr = precosFixos[item.name]?.[mercadoId];
      if (precoStr) {
        const preco = Number(precoStr);
        if (preco < menor) menor = preco;
      }
    }
    menoresPrecosPorProduto[item.name] = menor;
  });

  const totalPorMercado = {};
  mercadosSelecionados.forEach((mercadoId) => {
    let soma = 0;
    carrinhoSelecionado?.items.forEach((item) => {
      const precoStr = precosFixos[item.name]?.[mercadoId];
      if (precoStr) soma += Number(precoStr);
    });
    totalPorMercado[mercadoId] = soma;
  });

  const valoresTotais = Object.values(totalPorMercado);
  const maxTotal = Math.max(...valoresTotais);
  const minTotal = Math.min(...valoresTotais);
  const economia = maxTotal - minTotal;
  const mercadoMaisBarato = mercadosSelecionados.find(
    (id) => totalPorMercado[id] === minTotal
  );
  const mercadoMaisCaro = mercadosSelecionados.find(
    (id) => totalPorMercado[id] === maxTotal
  );

  const nomeMercadoMaisBarato =
    mercadosProximos.find((m) => m.id === mercadoMaisBarato)?.nome ||
    mercadoMaisBarato;
  const nomeMercadoMaisCaro =
    mercadosProximos.find((m) => m.id === mercadoMaisCaro)?.nome ||
    mercadoMaisCaro;

  async function buscarEnderecoPorCEP(cepPesquisa) {
    const cepLimpo = cepPesquisa.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();

      if (data.erro) {
        alert("CEP não encontrado");
        setRuaCompleta("");
        return;
      }

      const endereco = `${data.logradouro || ""}${data.bairro ? ", " + data.bairro : ""
        }${data.localidade ? ", " + data.localidade : ""}${data.uf ? " - " + data.uf : ""
        }`;

      setRuaCompleta(endereco);
    } catch (error) {
      console.error("Erro ao consultar CEP:", error);
    }
  }

  function isCepValido(cep) {
    const cepLimpo = cep.replace(/\D/g, "");
    return cepLimpo.length === 8;
  }

  const todosMercados = [
    { id: "m1", nome: "Super Econômico", distancia: 1.2 },
    { id: "m2", nome: "Mercado Bom Preço", distancia: 2.1 },
    { id: "m3", nome: "Baratão", distancia: 3.3 },
    { id: "m4", nome: "Hiper Center", distancia: 4.0 },
    { id: "m5", nome: "Mercado Real", distancia: 4.7 },
    { id: "m6", nome: "Mercado Popular", distancia: 3.8 },
    { id: "m7", nome: "Supermercado Fácil", distancia: 2.7 },
    { id: "m8", nome: "Mercado do Povo", distancia: 5.0 },
    { id: "m9", nome: "Econômico Express", distancia: 1.9 },
    { id: "m10", nome: "Max Supermercados", distancia: 3.5 },
  ];

  function sortearMercados(mercados, qtd = 5) {
    const copia = [...mercados];
    const selecionados = [];

    while (selecionados.length < qtd && copia.length > 0) {
      const idx = Math.floor(Math.random() * copia.length);
      selecionados.push(copia.splice(idx, 1)[0]);
    }

    return selecionados;
  }

  return (
    <div className="container mt-5">
      <h4 className="mb-4">Comparação de Carrinhos</h4>
      <button
        className="btn btn-outline-secondary mb-4"
        onClick={() => navigate(-1)}
      >
        &larr; Voltar
      </button>

      {carrinhos.length > 0 && (
        <div className="mb-4">
          <label className="form-label">
            Escolha o carrinho para comparar:
          </label>
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
              {carrinhoSelecionado.items.map((item, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  {(item.qtd || item.quantidade || 1)}x {item.name}
                  <span className="badge bg-secondary">
                    R$ {(item.price * (item.qtd || item.quantidade || 1)).toFixed(2).replace(".", ",")}
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
            />
          </div>
          <div className="col-md-6">
            <button
              className="btn btn-success w-100"
              onClick={() => {
                const mockMercados = sortearMercados(todosMercados, 5);
                setMercadosProximos(mockMercados);
                setMercadosSelecionados([]);
                setPrecosFixos({});
              }}
            >
              Buscar Mercados Próximos
            </button>
          </div>
        </div>

        {isCepValido(cep) && mercadosProximos.length > 0 && (
          <>
            <p className="text-muted">Selecione os mercados para comparar:</p>
            <div className="d-flex flex-wrap gap-2">
              {mercadosProximos.map((m) => (
                <label key={m.id} className="form-check-label">
                  <input
                    type="checkbox"
                    className="form-check-input me-2"
                    checked={mercadosSelecionados.includes(m.id)}
                    onChange={() => {
                      setMercadosSelecionados((prev) =>
                        prev.includes(m.id)
                          ? prev.filter((x) => x !== m.id)
                          : [...prev, m.id]
                      );
                    }}
                  />
                  {m.nome} <small className="text-muted">({m.distancia} km)</small>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {mercadosSelecionados.length > 0 && carrinhoSelecionado && (
        <div className="mt-5">
          <h5 className="mb-3">
            Comparativo de Preços nos Mercados Selecionados
          </h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead>
                <tr>
                  <th>Produto</th>
                  {mercadosSelecionados.map((id) => {
                    const nome = mercadosProximos.find(
                      (m) => m.id === id
                    )?.nome;
                    return <th key={id}>{nome}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {carrinhoSelecionado.items.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    {mercadosSelecionados.map((id) => {
                      const precoStr = precosFixos[item.name]?.[id];
                      if (!precoStr) return <td key={id}>-</td>;
                      const precoNum = Number(precoStr);
                      const menorPreco = menoresPrecosPorProduto[item.name];
                      const isMenor = precoNum === menorPreco;
                      const isMaior = precoNum > menorPreco;
                      return (
                        <td
                          key={id}
                          style={{
                            backgroundColor: isMenor
                              ? "#d4edda"
                              : isMaior
                                ? "#f8d7da"
                                : "transparent",
                            color: isMenor
                              ? "#155724"
                              : isMaior
                                ? "#721c24"
                                : "inherit",
                            fontWeight: isMenor ? "bold" : "normal",
                          }}
                        >
                          R$ {precoStr.replace(".", ",")}
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
            <ul>
              {mercadosSelecionados.map((id) => {
                const nome =
                  mercadosProximos.find((m) => m.id === id)?.nome || id;
                return (
                  <li key={id}>
                    {nome}: R${totalPorMercado[id].toFixed(2).replace(".", ",")}
                    {id === mercadoMaisBarato && (
                      <strong> (Mais barato)</strong>
                    )}
                    {id === mercadoMaisCaro && <strong> (Mais caro)</strong>}
                  </li>
                );
              })}
            </ul>
            <p>
              Você pode economizar{" "}
              <strong>R${economia.toFixed(2).replace(".", ",")}</strong>{" "}
              comprando no mercado <strong>{nomeMercadoMaisBarato}</strong> ao
              invés do mercado <strong>{nomeMercadoMaisCaro}</strong>.
            </p>

            <button
              className="btn btn-primary mt-3 mb-3"
              onClick={() => setMostrarPedido(true)}
            >
              Fazer Pedido
            </button>

            {mostrarPedido && (
              <div className="mt-3">
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

                <label className="form-label mb-3">Escolha o Mercado:</label>
                <select
                  className="form-select mb-3"
                  value={mercadoSelecionadoPedido}
                  onChange={(e) => setMercadoSelecionadoPedido(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {mercadosSelecionados.slice(0, 5).map((id) => {
                    const nome = mercadosProximos.find((m) => m.id === id)?.nome || id;
                    const total = totalPorMercado[id] ?? 0;

                    const backgroundColor = id === mercadoMaisBarato ? "#d4edda" : "#f8d7da";
                    const textoExtra =
                      id === mercadoMaisBarato
                        ? "(Você vai economizar aqui!)"
                        : "(Mais caro)";

                    return (
                      <option
                        key={id}
                        value={id}
                        style={{ backgroundColor }}
                      >
                        {nome} - R${total.toFixed(2).replace(".", ",")} {textoExtra}
                      </option>
                    );
                  })}
                </select>

                {mercadoSelecionadoPedido && (
                  <button
                    className="btn btn-success mt-3 mb-4"
                    onClick={async () => {
                      if (!cep || !ruaCompleta || !numero) {
                        Swal.fire("Campos obrigatórios", "Preencha o endereço completo antes de fazer o pedido.", "warning");
                        return;
                      }

                      const nomeMercado =
                        mercadosProximos.find((m) => m.id === mercadoSelecionadoPedido)?.nome ||
                        mercadoSelecionadoPedido;

                      const total = totalPorMercado[mercadoSelecionadoPedido] ?? 0;
                      const itensPedido = carrinhoSelecionado.items.map((item) => ({
                        nome: item.name,
                        preco: precosFixos[item.name]?.[mercadoSelecionadoPedido] || item.price,
                      }));

                      const pedido = {
                        mercadoId: mercadoSelecionadoPedido,
                        mercadoNome: nomeMercado,
                        total,
                        dataHora: new Date().toISOString(),
                        endereco: {
                          cep,
                          rua,
                          numero,
                        },
                        itens: itensPedido,
                      };

                      try {
                        const pedidosRef = ref(db, `usuarios/${user.uid}/pedidos`);
                        await push(pedidosRef, pedido);

                        await Swal.fire({
                          title: "Enviando pedido...",
                          html: "Aguarde alguns segundos.",
                          allowOutsideClick: false,
                          didOpen: () => {
                            Swal.showLoading();
                          },
                          timer: 2500,
                          timerProgressBar: true,
                        });

                        Swal.fire({
                          title: "Pedido Enviado!",
                          text: `Seu pedido para o mercado ${nomeMercado} foi enviado com sucesso.`,
                          icon: "success",
                          showCancelButton: true,
                          confirmButtonText: "Ir para Pedidos",
                          cancelButtonText: "Fechar",
                        }).then((result) => {
                          if (result.isConfirmed) {
                            navigate("/pedidos");
                          }
                        });

                        setMostrarPedido(false);
                        setMercadoSelecionadoPedido("");
                        setRua("");
                        setNumero("");
                        setCep("");
                      } catch (err) {
                        console.error("Erro ao salvar pedido:", err);
                        Swal.fire("Erro", "Não foi possível salvar o pedido.", "error");
                      }
                    }}
                  >
                    Confirmar Pedido
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
