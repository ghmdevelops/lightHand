import React, { useMemo, useState } from "react";
import Swal from "sweetalert2";

const PLANOS = {
  basico: { label: "Básico", preco: 50, itens: "8–10" },
  intermediario: { label: "Intermediário", preco: 80, itens: "10–12" },
  premium: { label: "Premium", preco: 120, itens: "12–15" },
};

const CATEGORIAS = [
  "Padaria",
  "Laticínios",
  "Hortifrúti",
  "Mercearia",
  "Bebidas",
  "Limpeza",
  "Higiene",
];

const CATALOGO_EXEMPLO = {
  Padaria: ["Pão francês", "Pão integral", "Bolo simples", "Croissant"],
  Laticínios: ["Leite integral", "Iogurte natural", "Queijo minas", "Manteiga"],
  Hortifrúti: ["Banana", "Maçã", "Tomate", "Alface", "Cenoura"],
  Mercearia: ["Arroz", "Feijão", "Macarrão", "Molho de tomate"],
  Bebidas: ["Suco de uva", "Água com gás", "Chá gelado"],
  Limpeza: ["Detergente", "Sabão em pó", "Amaciante"],
  Higiene: ["Papel higiênico", "Creme dental", "Sabonete"],
};

function moeda(n) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n || 0)
  );
}

export default function CestaMensalPage({ onVoltar }) {
  const [plano, setPlano] = useState("basico");
  const [categoriasSel, setCategoriasSel] = useState(["Padaria", "Hortifrúti", "Mercearia"]);
  const [freq, setFreq] = useState("mensal");
  const [inicio, setInicio] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [restricoes, setRestricoes] = useState({
    vegetariano: false,
    vegano: false,
    semGluten: false,
    semLactose: false,
  });
  const [excluirItens, setExcluirItens] = useState("");

  const [entrega, setEntrega] = useState("delivery");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [distanciaKm, setDistanciaKm] = useState(3);
  const [taxaKm, setTaxaKm] = useState(2.5);
  const [lojaRetirada, setLojaRetirada] = useState("");

  const [cupom, setCupom] = useState("BEMVINDO10");
  const [codigoAmigo, setCodigoAmigo] = useState("AMIGO5");

  const [presentear, setPresentear] = useState(false);
  const [presenteNome, setPresenteNome] = useState("");
  const [presenteEmail, setPresenteEmail] = useState("");

  const [qtdExtra, setQtdExtra] = useState(0);
  const [tetoMensal, setTetoMensal] = useState("");

  const precoBase = PLANOS[plano].preco;
  const multFrequencia = freq === "mensal" ? 1 : 2;
  const frete = entrega === "delivery" ? Math.max(5, distanciaKm * taxaKm) : 0;

  const descontoCupom = useMemo(() => {
    const c = (cupom || "").trim().toUpperCase();
    if (!c) return 0;
    if (c === "BEMVINDO10") return 0.1;
    if (c === "PREMIUM15" && plano === "premium") return 0.15;
    return 0;
  }, [cupom, plano]);

  const descontoAmigo = useMemo(() => {
    const a = (codigoAmigo || "").trim().toUpperCase();
    if (!a) return 0;
    if (a === "AMIGO5") return 0.05;
    return 0;
  }, [codigoAmigo]);

  const descontoTotalPerc = Math.min(descontoCupom + descontoAmigo, 0.5);
  const acrescimoExtra = qtdExtra > 0 ? qtdExtra * 5 : 0;

  const subtotalMensal = precoBase * multFrequencia + acrescimoExtra;
  const subtotalComDesconto = subtotalMensal * (1 - descontoTotalPerc);
  const totalMensal = subtotalComDesconto + frete;

  const tetoNum = Number(String(tetoMensal).replace(",", "."));
  const acimaDoTeto = !isNaN(tetoNum) && tetoNum > 0 ? totalMensal > tetoNum : false;

  const exemplos = useMemo(() => {
    const bag = [];
    categoriasSel.forEach((cat) => {
      const pool = CATALOGO_EXEMPLO[cat] || [];
      for (let i = 0; i < Math.min(2, pool.length); i++) {
        const idx = (i * 3) % pool.length;
        bag.push({ cat, nome: pool[idx] });
      }
    });
    if (restricoes.vegano) {
      return bag.filter(
        (x) =>
          !/leite|queijo|iogurte|manteiga|croissant/i.test(x.nome)
      );
    }
    if (restricoes.vegetariano) {
      return bag;
    }
    if (restricoes.semGluten) {
      return bag.filter((x) => !/pão|bolo|macarrão|croissant/i.test(x.nome));
    }
    if (restricoes.semLactose) {
      return bag.filter((x) => !/leite|queijo|iogurte|manteiga/i.test(x.nome));
    }
    return bag;
  }, [categoriasSel, restricoes]);

  function validar() {
    if (entrega === "delivery" && (!cep || !endereco || !numero)) {
      Swal.fire("Complete o endereço", "Informe CEP, endereço e número.", "warning");
      return false;
    }
    if (entrega === "pickup" && !lojaRetirada) {
      Swal.fire("Escolha a loja", "Informe a loja de retirada.", "warning");
      return false;
    }
    if (presentear && (!presenteNome || !presenteEmail)) {
      Swal.fire("Dados do presente", "Informe nome e e-mail do presenteado.", "warning");
      return false;
    }
    return true;
  }

  function confirmar() {
    if (!validar()) return;
    const resumo = `
      Plano: ${PLANOS[plano].label} (${PLANOS[plano].itens})
      Frequência: ${freq === "mensal" ? "Mensal" : "Quinzenal"}
      Categorias: ${categoriasSel.join(", ") || "—"}
      Restrições: ${Object.entries(restricoes)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ") || "—"
      }
      Entrega: ${entrega === "delivery"
        ? `Delivery • Frete ${moeda(frete)}`
        : `Retirada em loja: ${lojaRetirada}`
      }
      Descontos: ${(descontoTotalPerc * 100).toFixed(0)}%
      Extra: ${qtdExtra} item(ns) (${moeda(acrescimoExtra)})
      Total mensal: ${moeda(totalMensal)}
    `;
    Swal.fire({
      title: "Confirmar assinatura?",
      html: `<pre style="text-align:left;white-space:pre-wrap;margin:0">${resumo}</pre>`,
      showCancelButton: true,
      confirmButtonText: "Confirmar",
      cancelButtonText: "Voltar",
    }).then((r) => {
      if (r.isConfirmed) {
        const payload = {
          plano,
          freq,
          inicio,
          categorias: categoriasSel,
          restricoes,
          excluirItens,
          entrega,
          endereco:
            entrega === "delivery"
              ? { cep, endereco, numero, complemento, distanciaKm, taxaKm }
              : null,
          lojaRetirada: entrega === "pickup" ? lojaRetirada : null,
          cupom,
          codigoAmigo,
          presentear,
          presente: presentear ? { nome: presenteNome, email: presenteEmail } : null,
          qtdExtra,
          tetoMensal: tetoNum || null,
          totalMensal,
          criadoEm: new Date().toISOString(),
        };
        try {
          const key = "savvy_cesta_mensal";
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          localStorage.setItem(key, JSON.stringify([...prev, payload]));
          Swal.fire("Assinatura criada!", "Você pode gerenciar em Perfil > Assinaturas.", "success");
        } catch {
          Swal.fire("Salvo!", "Assinatura registrada para este dispositivo.", "success");
        }
      }
    });
  }

  return (
    <div className="container my-5 px-3 px-md-4" style={{ paddingTop: 70 }}>
      <style>{`
        .cardx{border:1px solid #eef2f7;border-radius:16px;box-shadow:0 8px 24px rgba(16,24,40,.06)}
        .chip{border:1px solid #e5e7eb;border-radius:999px;padding:.45rem .8rem;background:#fff;cursor:pointer}
        .chip.active{background:#ecfdf5;border-color:#10b981;color:#065f46;font-weight:600}
        .pill{border:1px solid #e5e7eb;border-radius:10px;padding:.6rem .8rem;cursor:pointer}
        .pill.active{background:#eff6ff;border-color:#60a5fa}
        .neon-btn{box-shadow:0 8px 24px rgba(59,130,246,.35)}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media (max-width:768px){.grid-2{grid-template-columns:1fr}}
      `}</style>

      <button className="btn btn-outline-secondary mb-4 mt-2" onClick={onVoltar}>&larr; Voltar</button>

      <div className="text-center mb-4">
        <h2 className="fw-bold">Clube de Compra por Assinatura</h2>
        <p className="text-muted">
          Receba todo mês uma Cesta Mensal com itens em promoção dos mercados parceiros.
        </p>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-4">
          <div className="cardx p-3 h-100">
            <h5 className="mb-3">Plano</h5>
            <div className="grid-2">
              {Object.entries(PLANOS).map(([k, v]) => (
                <button
                  key={k}
                  className={`pill text-start ${plano === k ? "active" : ""}`}
                  onClick={() => setPlano(k)}
                >
                  <div className="fw-bold">{v.label}</div>
                  <div className="small text-muted">{v.itens} • {moeda(v.preco)}/mês</div>
                </button>
              ))}
            </div>

            <div className="mt-3">
              <label className="form-label">Frequência</label>
              <div className="d-flex gap-2">
                <button
                  className={`pill ${freq === "mensal" ? "active" : ""}`}
                  onClick={() => setFreq("mensal")}
                >
                  Mensal
                </button>
                <button
                  className={`pill ${freq === "quinzenal" ? "active" : ""}`}
                  onClick={() => setFreq("quinzenal")}
                >
                  Quinzenal
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label">Início</label>
              <input
                type="month"
                className="form-control"
                value={inicio}
                onChange={(e) => setInicio(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="cardx p-3 h-100">
            <h5 className="mb-3">Categorias</h5>
            <div className="d-flex flex-wrap gap-2">
              {CATEGORIAS.map((c) => {
                const on = categoriasSel.includes(c);
                return (
                  <button
                    key={c}
                    className={`chip ${on ? "active" : ""}`}
                    onClick={() =>
                      setCategoriasSel((prev) =>
                        on ? prev.filter((x) => x !== c) : [...prev, c]
                      )
                    }
                  >
                    {c}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              <label className="form-label">Preferências</label>
              <div className="d-flex flex-wrap gap-3">
                {[
                  ["vegetariano", "Vegetariano"],
                  ["vegano", "Vegano"],
                  ["semGluten", "Sem glúten"],
                  ["semLactose", "Sem lactose"],
                ].map(([k, label]) => (
                  <div className="form-check form-switch" key={k}>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={!!restricoes[k]}
                      onChange={() =>
                        setRestricoes((r) => ({ ...r, [k]: !r[k] }))
                      }
                      id={`sw-${k}`}
                    />
                    <label className="form-check-label" htmlFor={`sw-${k}`}>
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <label className="form-label">Excluir itens específicos</label>
              <input
                className="form-control"
                placeholder="Ex.: sardinha, amendoim…"
                value={excluirItens}
                onChange={(e) => setExcluirItens(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="form-label">Itens extras</label>
              <input
                type="range"
                min={0}
                max={6}
                value={qtdExtra}
                onChange={(e) => setQtdExtra(Number(e.target.value))}
                className="form-range"
              />
              <small className="text-muted d-block">
                {qtdExtra} item(ns) • {moeda(qtdExtra * 5)}
              </small>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="cardx p-3 h-100">
            <h5 className="mb-3">Entrega</h5>
            <div className="d-flex gap-2 mb-3">
              <button
                className={`pill ${entrega === "delivery" ? "active" : ""}`}
                onClick={() => setEntrega("delivery")}
              >
                Delivery
              </button>
              <button
                className={`pill ${entrega === "pickup" ? "active" : ""}`}
                onClick={() => setEntrega("pickup")}
              >
                Retirar na loja
              </button>
            </div>

            {entrega === "delivery" ? (
              <>
                <div className="grid-2">
                  <input
                    className="form-control"
                    placeholder="CEP"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                  <input
                    className="form-control"
                    placeholder="Endereço"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
                <div className="grid-2 mt-2">
                  <input
                    className="form-control"
                    placeholder="Número"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                  />
                  <input
                    className="form-control"
                    placeholder="Complemento"
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                  />
                </div>
                <div className="grid-2 mt-3">
                  <div className="input-group">
                    <span className="input-group-text">Distância</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-control"
                      value={distanciaKm}
                      onChange={(e) => setDistanciaKm(Number(e.target.value))}
                    />
                    <span className="input-group-text">km</span>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text">R$/km</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      value={taxaKm}
                      onChange={(e) => setTaxaKm(Number(e.target.value))}
                    />
                  </div>
                </div>
                <small className="text-muted d-block mt-1">
                  Frete estimado: mínimo {moeda(5)} ou {moeda(taxaKm)} por km
                </small>
              </>
            ) : (
              <input
                className="form-control"
                placeholder="Loja de retirada"
                value={lojaRetirada}
                onChange={(e) => setLojaRetirada(e.target.value)}
              />
            )}

            <hr className="my-3" />

            <h6 className="mb-2">Cupons e indicação</h6>
            <div className="grid-2">
              <input
                className="form-control"
                placeholder="Cupom"
                value={cupom}
                onChange={(e) => setCupom(e.target.value)}
              />
              <input
                className="form-control"
                placeholder="Código amigo"
                value={codigoAmigo}
                onChange={(e) => setCodigoAmigo(e.target.value)}
              />
            </div>
            <small className="text-muted d-block mt-1">
              Cupom válido: BEMVINDO10 • Amigo: AMIGO5
            </small>

            <div className="mt-3">
              <label className="form-label">Teto mensal (opcional)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                placeholder="Ex.: 150"
                value={tetoMensal}
                onChange={(e) => setTetoMensal(e.target.value)}
              />
              {acimaDoTeto && (
                <small className="text-danger">Total acima do teto definido.</small>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 align-items-stretch">
        <div className="col-12 col-lg-8">
          <div className="cardx p-3 h-100">
            <h5 className="mb-3">Prévia da cesta</h5>
            {exemplos.length === 0 ? (
              <div className="alert alert-info">Selecione ao menos uma categoria.</div>
            ) : (
              <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-3">
                {exemplos.map((it, i) => (
                  <div className="col" key={`${it.cat}-${it.nome}-${i}`}>
                    <div className="border rounded p-2 h-100">
                      <div className="small text-muted">{it.cat}</div>
                      <div className="fw-semibold">{it.nome}</div>
                      <div className="small text-secondary">Exemplo ilustrativo</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-4">
          <div className="cardx p-3 h-100">
            <h5 className="mb-3">Resumo</h5>
            <div className="d-flex justify-content-between">
              <span>Plano</span>
              <span>{PLANOS[plano].label}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Frequência</span>
              <span>{freq === "mensal" ? "Mensal" : "Quinzenal"}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Subtotal</span>
              <span>{moeda(precoBase * multFrequencia)}</span>
            </div>
            {qtdExtra > 0 && (
              <div className="d-flex justify-content-between">
                <span>Itens extras</span>
                <span>{moeda(acrescimoExtra)}</span>
              </div>
            )}
            {descontoTotalPerc > 0 && (
              <div className="d-flex justify-content-between text-success">
                <span>Descontos</span>
                <span>-{(descontoTotalPerc * 100).toFixed(0)}%</span>
              </div>
            )}
            {entrega === "delivery" && (
              <div className="d-flex justify-content-between">
                <span>Frete</span>
                <span>{moeda(frete)}</span>
              </div>
            )}
            <hr />
            <div className="d-flex justify-content-between fw-bold fs-5">
              <span>Total mensal</span>
              <span>{moeda(totalMensal)}</span>
            </div>

            <div className="form-check form-switch mt-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="sw-presente"
                checked={presentear}
                onChange={() => setPresentear((v) => !v)}
              />
              <label className="form-check-label" htmlFor="sw-presente">
                Presentear alguém
              </label>
            </div>

            {presentear && (
              <div className="mt-2">
                <input
                  className="form-control mb-2"
                  placeholder="Nome do presenteado"
                  value={presenteNome}
                  onChange={(e) => setPresenteNome(e.target.value)}
                />
                <input
                  className="form-control"
                  placeholder="E-mail do presenteado"
                  value={presenteEmail}
                  onChange={(e) => setPresenteEmail(e.target.value)}
                />
              </div>
            )}

            <button className="btn btn-primary btn-lg w-100 mt-3 neon-btn" onClick={confirmar}>
              Assinar agora
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mt-4">
        <small className="text-secondary">
          * Ao assinar você concorda com a cobrança recorrente. Pode pausar ou cancelar quando quiser.
        </small>
      </div>
    </div>
  );
}
