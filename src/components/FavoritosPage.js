// src/components/FavoritosPage.js
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";

export default function FavoritosPage({ user, onVoltar }) {
  const [favoritos, setFavoritos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Referência aos favoritos do usuário atual
    const favRef = ref(db, `usuarios/${user.uid}/favoritos`);

    // Listener em tempo real para favoritos
    const off = onValue(
      favRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        // Transformamos o objeto { [id]: { nome, tipo, rua, estado, pais }, ... }
        // em um array [{ id, nome, tipo, rua, estado, pais }, ...]
        const lista = Object.entries(data).map(([id, obj]) => ({
          id,
          ...obj,
        }));
        setFavoritos(lista);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar favoritos:", error);
        setFavoritos([]);
        setLoading(false);
      }
    );

    // Quando unmount, cancelar o listener
    return () => off();
  }, [user]);

  // Remove um favorito do Firebase
  const handleRemove = async (marketId) => {
    if (!user) return;
    try {
      await remove(ref(db, `usuarios/${user.uid}/favoritos/${marketId}`));
      // A própria chamada onValue fará o setFavoritos automaticamente
    } catch (err) {
      console.error("Erro ao remover favorito:", err);
    }
  };

  if (!user) {
    return (
      <div className="container my-5 px-3 px-md-4">
        <div className="alert alert-warning text-center">
          Você precisa estar logado para ver seus favoritos.
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5 px-3 px-md-4">
      <button
        className="btn btn-link mb-4"
        onClick={onVoltar}
        style={{ fontSize: "1rem" }}
      >
        &larr; Voltar
      </button>

      <h2 className="mb-4">Meus Favoritos</h2>
      <p className="text-muted mb-5">
        Aqui você verá todos os mercados que marcou como favorito.
      </p>

      {loading ? (
        <div className="text-center my-5">
          <div
            className="spinner-border text-success"
            role="status"
            style={{ width: 60, height: 60 }}
          >
            <span className="visually-hidden">Carregando favoritos...</span>
          </div>
        </div>
      ) : favoritos.length === 0 ? (
        <div className="alert alert-info text-center">
          Você ainda não favoritou nenhum mercado.
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 g-4">
          {favoritos.map((fav) => (
            <div className="col" key={fav.id}>
              <div
                className="card h-100 shadow-sm"
                style={{ borderRadius: "12px" }}
              >
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{fav.nome}</h5>
                  <p className="card-text mb-4" style={{ lineHeight: 1.4 }}>
                    {[fav.rua ?? "", fav.estado ?? "", fav.pais ?? ""]
                      .filter((s) => s)
                      .join(", ")}
                  </p>
                  <div className="mt-auto">
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => handleRemove(fav.id)}
                    >
                      Remover dos Favoritos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
