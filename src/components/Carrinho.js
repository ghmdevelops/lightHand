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
        <div className="container mt-5" style={{
            zIndex: 2,
            paddingTop: "80px",
        }}>
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
                            <li
                                key={cart.id}
                                className="list-group-item d-flex justify-content-between align-items-start"
                            >
                                <div>
                                    <small className="text-muted">
                                        {new Date(cart.criadoEm).toLocaleString()}
                                    </small>

                                    <div className="mt-1" style={{ fontSize: "0.9rem" }}>
                                        <strong>Mercado:</strong>{" "}
                                        {cart.mercadoNome || "Não informado"}
                                        <br />
                                        {cart.mercadoRua && (
                                            <>
                                                <strong>Endereço:</strong> {cart.mercadoRua},{" "}
                                                {cart.mercadoEstado || ""}, {cart.mercadoPais || ""}
                                                <br />
                                            </>
                                        )}
                                    </div>

                                    <ul className="mt-2 mb-1">
                                        {cart.items.map((it, idx) => (
                                            <li key={idx} style={{ fontSize: 14 }}>
                                                {(it.qtd || it.quantidade || 1)}x {it.name} — R${" "}
                                                {Number(it.price).toFixed(2).replace(".", ",")}
                                            </li>
                                        ))}
                                    </ul>

                                    <div>
                                        <strong>
                                            {cart.items.length}{" "}
                                            {cart.items.length !== 1 ? "itens" : "item"} — Total: R${" "}
                                            {total.toFixed(2).replace(".", ",")}
                                        </strong>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => handleDeleteCart(cart.id)}
                                >
                                    Excluir
                                </button>
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
        </div>
    );
}
