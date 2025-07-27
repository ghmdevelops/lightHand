// src/components/Carrinho.js
import React, { useEffect, useState } from "react";
import { ref, get, remove } from "firebase/database";
import { db } from "../firebase";
import { useNavigate } from "react-router-dom";

export default function Carrinho({ user }) {
    const [carts, setCarts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        get(ref(db, `usuarios/${user.uid}/carts`)).then((snap) => {
            const data = snap.val() || {};
            const arr = Object.entries(data)
                .map(([id, c]) => ({ id, ...c }))
                .sort((a, b) => b.criadoEm - a.criadoEm);
            setCarts(arr);
            setLoading(false);
        });
    }, [user]);

    const handleDeleteCart = async (id) => {
        await remove(ref(db, `usuarios/${user.uid}/carts/${id}`));
        setCarts((c) => c.filter((x) => x.id !== id));
    };

    return (
        <div className="container mt-5" style={{ zIndex: 2, paddingTop: "80px" }}>
            <button
                className="btn btn-outline-secondary mb-4"
                onClick={() => navigate(-1)}
            >
                &larr; Voltar
            </button>

            <h4 className="mb-4">Meus Carrinhos Salvos</h4>

            {loading ? (
                <div>Carregando carrinhos…</div>
            ) : carts.length === 0 ? (
                <div className="alert alert-info">Você não tem carrinhos salvos.</div>
            ) : (
                <ul className="list-group mb-4">
                    {carts.map((cart) => {
                        const total = cart.items.reduce(
                            (sum, it) => sum + Number(it.price),
                            0
                        );
                        return (
                            <li key={cart.id} className="list-group-item p-0 border-0">
                                <div className="card shadow-sm rounded-3 position-relative">
                                    {cart.pedidoFeito && (
                                        <span
                                            className="position-absolute top-0 end-0 badge bg-success rounded-pill m-2 d-flex align-items-center"
                                            style={{ fontSize: "0.8rem", gap: "0.25rem", zIndex: 10 }}
                                        >
                                            <i className="fa-solid fa-check-circle"></i> Pedido feito
                                        </span>
                                    )}

                                    <div className="card-body">
                                        <small className="text-muted d-block mb-2">
                                            <i className="fa-regular fa-clock me-1"></i>
                                            {new Date(cart.criadoEm).toLocaleString()}
                                        </small>

                                        <h5 className="card-title mb-2">
                                            <i className="fa-solid fa-store me-2 text-primary"></i>
                                            {cart.mercadoNome || "Mercado não informado"}
                                        </h5>

                                        {cart.mercadoRua && (
                                            <p className="card-text text-muted mb-3">
                                                <i className="fa-solid fa-location-dot me-2"></i>
                                                {cart.mercadoRua}, {cart.mercadoEstado || ""}, {cart.mercadoPais || ""}
                                            </p>
                                        )}

                                        <ul className="list-group list-group-flush mb-3" style={{ maxHeight: "150px", overflowY: "auto" }}>
                                            {cart.items.map((it, idx) => (
                                                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center py-1 px-2" style={{ fontSize: "0.9rem" }}>
                                                    <span>
                                                        {(it.qtd || it.quantidade || 1)}x {it.name}
                                                    </span>
                                                    <span className="badge bg-secondary">
                                                        R$ {Number(it.price).toFixed(2).replace(".", ",")}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="d-flex justify-content-between align-items-center">
                                            <strong>
                                                <i className="fa-solid fa-cart-shopping me-2"></i>
                                                {cart.items.length} {cart.items.length !== 1 ? "itens" : "item"} — Total: R${" "}
                                                {total.toFixed(2).replace(".", ",")}
                                            </strong>

                                            <button
                                                className="btn btn-outline-danger btn-sm d-flex align-items-center"
                                                onClick={() => handleDeleteCart(cart.id)}
                                                title="Excluir carrinho"
                                            >
                                                <i className="fa-solid fa-trash-can me-1"></i> Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {carts.length > 0 && (
                <div className="text-end mt-4">
                    <button
                        className="btn btn-success px-4 py-2 mb-3"
                        onClick={() => {
                            const carrinhoIds = carts.map((c) => c.id);
                            navigate(`/comparar-carrinhos?ids=${carrinhoIds.join(",")}`);
                        }}
                        style={{
                            borderRadius: "30px",
                            fontWeight: "600",
                            fontSize: "1rem",
                            background: "linear-gradient(135deg, #28a745, #218838)",
                            boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <i className="fa-solid fa-scale-balanced me-2"></i>
                        Comparar Carrinhos
                    </button>
                </div>
            )}

            {/* Estilos para o selo de pedido */}
            <style>{`
                .passaporte-card {
                    position: relative;
                    overflow: hidden;
                    border-radius: 12px;
                    padding-top: 12px;
                }

                .passaporte-stamp {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: rgba(40, 167, 69, 0.9); /* verde sucesso translúcido */
                    color: #fff;
                    font-size: 0.75rem;
                    font-weight: bold;
                    padding: 4px 8px;
                    border-radius: 4px;
                    transform: rotate(-15deg);
                    pointer-events: none;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                }

                .passaporte-stamp i {
                    margin-right: 4px;
                }
            `}</style>
        </div>
    );
}
