import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, get, push, set, remove } from "firebase/database";
import { FaWhatsapp } from "react-icons/fa";

export default function TrocasPage({ user, onVoltar }) {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ texto: "", celular: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    console.log("Usuário logado:", user);
  }, [user]);

  useEffect(() => {
    const trocasRef = ref(db, "trocas");
    get(trocasRef)
      .then((snap) => {
        const data = snap.val() || {};
        const arr = Object.entries(data).map(([id, info]) => ({ id, ...info }));
        arr.sort((a, b) => b.timestamp - a.timestamp);
        setAnuncios(arr);
      })
      .catch(() => {
        setAnuncios([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const formatarCelular = (value) => {
    const numeros = value.replace(/\D/g, "");

    if (numeros.length <= 2) return numeros.replace(/^(\d{0,2})/, "($1");
    if (numeros.length <= 6)
      return numeros.replace(/^(\d{2})(\d{0,4})/, "($1) $2");

    if (numeros.length <= 10)
      return numeros.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");

    return numeros.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  };

  const validarCelular = (value) => {
    const numeros = value.replace(/\D/g, "");
    return numeros.length === 10 || numeros.length === 11;
  };

  const handlePublicar = async (e) => {
    e.preventDefault();
    setError("");

    if (!user || !user.uid) {
      setError("Você precisa estar logado para publicar.");
      return;
    }

    if (!form.texto.trim()) {
      setError("Informe o texto da sua troca.");
      return;
    }

    if (!validarCelular(form.celular)) {
      setError("Informe um número de celular válido (10 ou 11 dígitos).");
      return;
    }

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
    setAnuncios((prev) => [{ id: newRef.key, ...novoAnuncio }, ...prev]);
  };

  const handleRemover = async (id, autor) => {
    if (autor !== user.uid) return;
    const anuncioRef = ref(db, `trocas/${id}`);
    await remove(anuncioRef);
    setAnuncios((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div
      className="container my-5 d-flex flex-column align-items-center"
      style={{ minHeight: "80vh" }}
    >
      <div className="w-100 mb-3 pt-5">
        <button
          className="btn btn-outline-secondary rounded-pill fw-semibold"
          onClick={onVoltar}
        >
          &larr; Voltar
        </button>
      </div>

      <h2 className="mb-4">Clube de Trocas</h2>
      <p className="mb-4 text-center">
        Bem-vindo ao Clube de Trocas! Aqui você pode oferecer produtos que tem em excesso e trocar com outros usuários da comunidade de forma simples e segura.
        Compartilhe o que você tem disponível e encontre o que precisa sem gastar dinheiro.
        Basta publicar seu anúncio com uma descrição clara do que você quer trocar e seus contatos para facilitar a comunicação via WhatsApp.
        Participe e ajude a promover o consumo consciente e a economia colaborativa!
      </p>

      <div
        className="bg-white bg-opacity-10 rounded-4 border border-1 border-primary border-opacity-25 p-4 mb-5 w-100"
        style={{ maxWidth: 600, backdropFilter: "blur(18px)" }}
      >
        <form onSubmit={handlePublicar}>
          <div className="mb-3">
            <textarea
              className="form-control bg-opacity-10 border border-1 border-secondary rounded-3 text-dark"
              rows="3"
              placeholder="Exemplo: Tenho 5 caixas de leite integral, próximo ao vencimento, e aceito trocar por 2 pacotes de macarrão ou arroz. Preferência por produtos não perecíveis."
              value={form.texto}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, texto: e.target.value }))
              }
              style={{ resize: "none", minHeight: "100px" }}
              required
            />
          </div>
          <div className="mb-3">
            <input
              type="tel"
              className="form-control bg-opacity-10 border border-1 border-secondary rounded-3 text-dark"
              placeholder="Seu número de celular (obrigatório)"
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
          </div>
          {error && (
            <div className="alert alert-danger text-center mb-2">{error}</div>
          )}
          <div className="text-end">
            <button
              className="btn btn-primary rounded-pill px-4 py-2 fw-semibold"
              type="submit"
            >
              Publicar
            </button>
          </div>
        </form>
      </div>

      <hr className="w-100" style={{ maxWidth: 600, borderColor: "#e3e3e3" }} />

      {loading ? (
        <div className="mt-4">Carregando anúncios…</div>
      ) : anuncios.length === 0 ? (
        <div
          className="alert alert-info mt-4 w-100"
          style={{ maxWidth: 600 }}
        >
          Nenhum anúncio de troca ainda.
        </div>
      ) : (
        <div className="w-100" style={{ maxWidth: 600 }}>
          {anuncios.map((a) => (
            <div
              key={a.id}
              className="
        bg-white bg-opacity-10 rounded-4 border border-light border-opacity-25
        mb-4 p-4 d-flex flex-column shadow-sm position-relative
        transition-shadow
        hover-shadow-strong
      "
              style={{ backdropFilter: "blur(16px)", cursor: "default" }}
            >
              =      <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold text-primary mb-1">{a.nomeUsuario}</h5>
                  {a.email && (
                    <small className="d-block text-muted text-truncate" style={{ maxWidth: 300 }}>
                      {a.email}
                    </small>
                  )}
                  {a.celular && (
                    <a
                      href={`https://wa.me/${a.celular.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="d-flex align-items-center text-success mt-1 text-decoration-none"
                    >
                      <FaWhatsapp size={18} className="me-2" />
                      Clique para entrar em contato
                    </a>
                  )}
                </div>

                {a.usuario === user?.uid && (
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleRemover(a.id, a.usuario)}
                    aria-label="Excluir anúncio"
                  >
                    Excluir
                  </button>
                )}
              </div>

              <small className="fst-italic mb-3">
                {new Date(a.timestamp).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>

              <p
                className="mb-0"
                style={{
                  fontSize: "1rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {a.texto}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
