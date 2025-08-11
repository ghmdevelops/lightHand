import React, { useEffect, useMemo, useState, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, off, push, set, remove } from "firebase/database";
import { FaWhatsapp } from "react-icons/fa";

export default function TrocasPage({ user, onVoltar }) {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ texto: "", celular: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [q, setQ] = useState("");
  const [somenteMeus, setSomenteMeus] = useState(false);
  const [ordem, setOrdem] = useState("recentes");

  const MAX_LEN = 320;

  useEffect(() => {
    const trocasRef = ref(db, "trocas");
    const handler = (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, info]) => ({ id, ...info }));
      arr.sort((a, b) => b.timestamp - a.timestamp);
      setAnuncios(arr);
      setLoading(false);
    };
    onValue(trocasRef, handler, () => setLoading(false));
    return () => off(trocasRef, "value", handler);
  }, []);

  const formatarCelular = useCallback((value) => {
    const numeros = (value || "").replace(/\D/g, "");
    if (numeros.length <= 2) return numeros.replace(/^(\d{0,2})/, "($1");
    if (numeros.length <= 6) return numeros.replace(/^(\d{2})(\d{0,4})/, "($1) $2");
    if (numeros.length <= 10) return numeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    return numeros.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  }, []);

  const validarCelular = useCallback((value) => {
    const numeros = (value || "").replace(/\D/g, "");
    return numeros.length === 10 || numeros.length === 11;
  }, []);

  const handlePublicar = async (e) => {
    e.preventDefault();
    setError("");
    if (!user?.uid) {
      setError("Você precisa estar logado para publicar.");
      return;
    }
    if (!form.texto.trim()) {
      setError("Informe o texto da sua troca.");
      return;
    }
    if (form.texto.trim().length > MAX_LEN) {
      setError(`Seu anúncio ultrapassou ${MAX_LEN} caracteres.`);
      return;
    }
    if (!validarCelular(form.celular)) {
      setError("Informe um número de celular válido (10 ou 11 dígitos).");
      return;
    }
    try {
      setSubmitting(true);
      const trocasRef = ref(db, "trocas");
      const newRef = push(trocasRef);
      const novoAnuncio = {
        usuario: user.uid,
        nomeUsuario: user.displayName || user.email,
        email: user.email,
        celular: form.celular.trim(),
        texto: form.texto.trim(),
        timestamp: Date.now(),
      };
      await set(newRef, novoAnuncio);
      setForm({ texto: "", celular: "" });
    } catch {
      setError("Não foi possível publicar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemover = async (id, autor) => {
    if (!user?.uid || autor !== user.uid) return;
    if (!window.confirm("Deseja realmente excluir este anúncio?")) return;
    try {
      await remove(ref(db, `trocas/${id}`));
    } catch {
      setError("Falha ao excluir o anúncio.");
    }
  };

  const anunciosFiltrados = useMemo(() => {
    let arr = [...anuncios];
    if (somenteMeus && user?.uid) {
      arr = arr.filter((a) => a.usuario === user.uid);
    }
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter((a) => {
        const t1 = (a.nomeUsuario || "").toLowerCase().includes(term);
        const t2 = (a.email || "").toLowerCase().includes(term);
        const t3 = (a.texto || "").toLowerCase().includes(term);
        return t1 || t2 || t3;
      });
    }
    if (ordem === "antigos") {
      arr.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      arr.sort((a, b) => b.timestamp - a.timestamp);
    }
    return arr;
  }, [anuncios, q, somenteMeus, ordem, user]);

  const toWhatsLink = (celular, texto) => {
    const phone = (celular || "").replace(/\D/g, "");
    const pre = `Olá! Vi seu anúncio no Savvy e tenho interesse na troca.\n\n"${(texto || "").slice(0, 160)}..."`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(pre)}`;
  };

  const shareAnuncio = async (a) => {
    const shareText = `Troca no Savvy — ${a.nomeUsuario}\n\n${a.texto}\n\nContato: ${a.celular}`;
    const url = toWhatsLink(a.celular, a.texto);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Clube de Trocas · Savvy", text: shareText, url });
      } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${url}`);
        alert("Link copiado para a área de transferência!");
      } catch {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    }
  };

  const timeAgo = (ts) => {
    const diff = Math.max(0, Date.now() - ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h`;
    const d = Math.floor(h / 24);
    return `${d} d`;
  };

  return (
    <div className="container my-0 px-3 px-md-4" style={{ minHeight: "100vh", paddingTop: 80 }}>
      <div className="position-sticky top-0 bg-white" style={{ zIndex: 5, marginLeft: -16, marginRight: -16, padding: "12px 16px", borderBottom: "1px solid #eee" }}>
        <div className="d-flex align-items-center justify-content-between">
          <button className="btn btn-outline-secondary rounded-pill fw-semibold" onClick={onVoltar}>
            &larr; Voltar
          </button>
          <h4 className="mb-0">Clube de Trocas</h4>
          <div style={{ width: 120 }} />
        </div>
      </div>

      <p className="mt-3 mb-4 text-center text-muted">
        Troque itens com a comunidade de forma simples. Publique seu anúncio e combine pelo WhatsApp.
      </p>

      <div className="bg-white border rounded-4 p-4 mb-4 shadow-sm" style={{ maxWidth: 820, margin: "0 auto" }}>
        <form onSubmit={handlePublicar}>
          <div className="mb-3">
            <label className="form-label fw-semibold">Descreva sua troca</label>
            <textarea
              className="form-control"
              rows={4}
              placeholder="Ex.: Tenho 5 caixas de leite e troco por arroz ou macarrão. Retiro no centro."
              value={form.texto}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  texto: e.target.value.slice(0, MAX_LEN),
                }))
              }
              style={{ resize: "none" }}
              required
            />
            <div className="d-flex justify-content-end">
              <small className={form.texto.length >= MAX_LEN ? "text-danger" : "text-muted"}>
                {form.texto.length}/{MAX_LEN}
              </small>
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Celular para contato</label>
            <input
              type="tel"
              className="form-control"
              placeholder="(11) 98765-4321"
              value={form.celular}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  celular: formatarCelular(e.target.value),
                }))
              }
              required
              maxLength={15}
            />
            {!validarCelular(form.celular) && form.celular.length > 0 && (
              <small className="text-danger">Informe 10 ou 11 dígitos.</small>
            )}
          </div>

          {error && <div className="alert alert-danger text-center mb-2">{error}</div>}

          <div className="text-end">
            <button className="btn btn-primary rounded-pill px-4 py-2 fw-semibold" type="submit" disabled={submitting}>
              {submitting ? "Publicando..." : "Publicar"}
            </button>
          </div>
        </form>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3" style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text">
            <i className="bi bi-search" />
          </span>
          <input className="form-control" placeholder="Buscar por nome, e-mail ou texto" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="form-check">
            <input className="form-check-input" type="checkbox" id="meus" checked={somenteMeus} onChange={() => setSomenteMeus((v) => !v)} />
            <label className="form-check-label" htmlFor="meus">Somente meus</label>
          </div>
          <select className="form-select form-select-sm w-auto" value={ordem} onChange={(e) => setOrdem(e.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="antigos">Mais antigos</option>
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        {loading ? (
          <div className="mt-4">
            <div className="placeholder-glow mb-3">
              <div className="placeholder col-12" style={{ height: 120, borderRadius: 16 }}></div>
            </div>
            <div className="placeholder-glow mb-3">
              <div className="placeholder col-12" style={{ height: 120, borderRadius: 16 }}></div>
            </div>
          </div>
        ) : anunciosFiltrados.length === 0 ? (
          <div className="alert alert-info">Nenhum anúncio encontrado.</div>
        ) : (
          anunciosFiltrados.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-4 border p-4 mb-3 shadow-sm"
              style={{ backdropFilter: "blur(10px)" }}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="me-3">
                  <h5 className="fw-bold mb-1 text-primary">{a.nomeUsuario}</h5>
                  {a.email && (
                    <small className="d-block text-muted text-truncate" style={{ maxWidth: 320 }}>
                      {a.email}
                    </small>
                  )}
                  <div className="d-flex align-items-center gap-2 mt-2">
                    {a.celular && (
                      <a
                        href={toWhatsLink(a.celular, a.texto)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-success btn-sm d-inline-flex align-items-center"
                        title="Chamar no WhatsApp"
                      >
                        <FaWhatsapp size={16} className="me-2" />
                        WhatsApp
                      </a>
                    )}
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => shareAnuncio(a)}
                      title="Compartilhar anúncio"
                    >
                      Compartilhar
                    </button>
                  </div>
                </div>

                <div className="text-end">
                  <span className="badge text-bg-light">{timeAgo(a.timestamp)}</span>
                  {a.usuario === user?.uid && (
                    <div className="mt-2">
                      <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => handleRemover(a.id, a.usuario)}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <hr className="my-3" />

              <p className="mb-0" style={{ lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {a.texto}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
