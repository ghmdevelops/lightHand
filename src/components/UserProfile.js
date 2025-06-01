import React, { useState, useEffect } from "react";
import { auth, db, storage } from "../firebase";
import { ref, get, update, remove } from "firebase/database";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

export default function UserProfile({ user }) {
  const [form, setForm] = useState({
    nome: "",
    apelido: "",
    sobrenome: "",
    cep: "",
    celular: "",
  });
  const [loading, setLoading] = useState(true);
  const [salvo, setSalvo] = useState(false);

  const [carts, setCarts] = useState([]);
  const [cartsLoading, setCartsLoading] = useState(true);

  const [avatarURL, setAvatarURL] = useState(null); // URL da foto ou do avatar escolhido
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Seis URLs de avatar (exemplo usando pravatar)
  const AVATAR_OPTIONS = [
    "https://i.pravatar.cc/150?img=1",
    "https://i.pravatar.cc/150?img=2",
    "https://i.pravatar.cc/150?img=3",
    "https://i.pravatar.cc/150?img=4",
    "https://i.pravatar.cc/150?img=5",
    "https://i.pravatar.cc/150?img=6",
  ];

  useEffect(() => {
    if (!user) return;

    // Buscar dados do perfil (inclui avatar)
    get(ref(db, `usuarios/${user.uid}`)).then((snap) => {
      if (snap.exists()) {
        const d = snap.val();
        setForm({
          nome: d.nome || "",
          apelido: d.apelido || "",
          sobrenome: d.sobrenome || "",
          cep: d.cep || "",
          celular: d.celular || "",
        });
        if (d.avatar) {
          setAvatarURL(d.avatar);
        }
      }
      setLoading(false);
    });

    // Buscar carrinhos
    get(ref(db, `usuarios/${user.uid}/carts`)).then((snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => b.criadoEm - a.criadoEm);
      setCarts(arr);
      setCartsLoading(false);
    });
  }, [user]);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    await update(ref(db, `usuarios/${user.uid}`), form);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2000);
  };

  const handleDeleteCart = async (id) => {
    await remove(ref(db, `usuarios/${user.uid}/carts/${id}`));
    setCarts((c) => c.filter((x) => x.id !== id));
  };

  // Upload de foto de perfil
  const handleAvatarPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);

    try {
      const storageInstance = getStorage();
      const fileRef = sRef(storageInstance, `avatars/${user.uid}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // Atualiza no Realtime Database: grava a URL da foto
      await update(ref(db, `usuarios/${user.uid}`), { avatar: url });
      setAvatarURL(url);
    } catch (err) {
      setUploadError("Falha ao enviar foto.");
    } finally {
      setUploading(false);
    }
  };

  // Quando usuário escolhe um dos avatares predefinidos
  const handleChooseAvatar = async (url) => {
    await update(ref(db, `usuarios/${user.uid}`), { avatar: url });
    setAvatarURL(url);
  };

  if (loading) return <div>Carregando perfil...</div>;

  return (
    <div className="container mt-4" style={{ maxWidth: 700 }}>
      <h4 className="mb-4">Meu Perfil</h4>

      <div className="d-flex flex-column align-items-center mb-4">
        {/* Área de exibição do avatar */}
        <div
          className="rounded-circle border overflow-hidden position-relative mb-2"
          style={{ width: 120, height: 120 }}
        >
          {avatarURL ? (
            <img
              src={avatarURL}
              alt="Avatar"
              className="w-100 h-100"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div
              className="d-flex justify-content-center align-items-center bg-secondary text-white"
              style={{ width: "100%", height: "100%", fontSize: "2.5rem" }}
            >
              <i className="fa-solid fa-user"></i>
            </div>
          )}

          {/* Botão de upload de foto */}
          <label
            htmlFor="avatarPhoto"
            className="position-absolute"
            style={{
              bottom: 0,
              right: 0,
              background: "#198754",
              borderRadius: "50%",
              padding: "6px",
              cursor: "pointer",
            }}
            title="Selecionar Foto"
          >
            <i className="fa-solid fa-camera text-white"></i>
          </label>
          <input
            type="file"
            id="avatarPhoto"
            accept="image/*"
            onChange={handleAvatarPhotoChange}
            style={{ display: "none" }}
          />
        </div>
        {uploading && (
          <small className="text-muted mb-2">Enviando foto...</small>
        )}
        {uploadError && (
          <small className="text-danger mb-2">{uploadError}</small>
        )}

        {/* Se houver URL de foto, ofereça opção de removê-la */}
        {avatarURL && (
          <button
            className="btn btn-outline-danger btn-sm mb-3"
            onClick={async () => {
              await update(ref(db, `usuarios/${user.uid}`), { avatar: null });
              setAvatarURL(null);
            }}
          >
            Remover Foto
          </button>
        )}
      </div>

      {/* Se NÃO houver foto escolhida, exiba opções de avatar */}
      {!avatarURL && (
        <>
          <h6 className="mb-2">Escolha um avatar:</h6>
          <div className="d-flex gap-3 flex-wrap mb-4">
            {AVATAR_OPTIONS.map((url) => (
              <div
                key={url}
                className={`border rounded-circle overflow-hidden`}
                style={{
                  width: 60,
                  height: 60,
                  cursor: "pointer",
                  background: avatarURL === url ? "#e9fdd8" : "transparent",
                }}
                onClick={() => handleChooseAvatar(url)}
                title="Clique para selecionar"
              >
                <img
                  src={url}
                  alt="Avatar op"
                  className="w-100 h-100"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </>
      )}

      <form onSubmit={handleSaveProfile}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">Nome</label>
            <input
              className="form-control"
              name="nome"
              value={form.nome}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Apelido</label>
            <input
              className="form-control"
              name="apelido"
              value={form.apelido}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Sobrenome</label>
          <input
            className="form-control"
            name="sobrenome"
            value={form.sobrenome}
            onChange={handleChange}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">E-mail</label>
          <input className="form-control" value={user.email} disabled />
        </div>

        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">CEP</label>
            <input
              className="form-control"
              name="cep"
              value={form.cep}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">Celular</label>
            <input
              className="form-control"
              name="celular"
              value={form.celular}
              onChange={handleChange}
            />
          </div>
        </div>

        <button className="btn btn-primary w-100 mt-2" type="submit">
          Salvar Dados
        </button>
      </form>

      {salvo && (
        <div className="alert alert-success mt-3">
          Perfil atualizado com sucesso!
        </div>
      )}

      <hr className="my-5" />

      <h4 className="mb-3">Meus Carrinhos Salvos</h4>
      {cartsLoading ? (
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
                  <ul className="mt-1 mb-1">
                    {cart.items.map((it, idx) => (
                      <li key={idx} style={{ fontSize: 14 }}>
                        {it.name} — R${" "}
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
    </div>
  );
}
