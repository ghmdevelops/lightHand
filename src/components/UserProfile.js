import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  ref as dbRef,
  onValue,
  update,
  remove,
  off,
} from "firebase/database";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  getStorage,
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ----- Helpers -----
const formatCep = (raw) => {
  const digits = (raw + "").replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return digits.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
  return digits;
};

const formatPhone = (raw) => {
  let digits = (raw + "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const h = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(h);
  }, [value, delay]);
  return debounced;
}

// ----- Validation schema -----
const profileSchema = yup.object({
  nome: yup.string().required("Nome obrigatório"),
  apelido: yup.string().nullable(),
  sobrenome: yup.string().nullable(),
  cep: yup
    .string()
    .required("CEP obrigatório")
    .matches(/^\d{5}-?\d{3}$/, "CEP inválido"),
  celular: yup
    .string()
    .required("Celular obrigatório")
    .matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Celular inválido"),
  rua: yup.string().nullable(),
  bairro: yup.string().nullable(),
  cidade: yup.string().nullable(),
  estado: yup.string().nullable(),
  complemento: yup.string().nullable(),
});

// Presets de avatar: 5 robohash + 45 pravatar
const AVATAR_OPTIONS = [
  "https://robohash.org/crazy1.png?set=set1",
  "https://robohash.org/crazy2.png?set=set1",
  "https://robohash.org/crazy3.png?set=set1",
  "https://robohash.org/crazy4.png?set=set1",
  "https://robohash.org/crazy5.png?set=set1",
  ...Array.from({ length: 45 }, (_, i) => `https://i.pravatar.cc/150?img=${i + 1}`),
];

// ----- UI helpers -----
const SkeletonBox = ({ width = "100%", height = 16, style = {} }) => (
  <div
    aria-hidden="true"
    style={{
      width,
      height,
      background: "#e3e3e3",
      borderRadius: 4,
      marginBottom: 8,
      ...style,
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "-100%",
        height: "100%",
        width: "100%",
        background:
          "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)",
        animation: "shimmer 1.5s infinite",
      }}
    />
    <style>
      {`
        @keyframes shimmer {
          0% { transform: translateX(0); }
          100% { transform: translateX(200%); }
        }
      `}
    </style>
  </div>
);

// ----- Components -----
function AvatarPicker({ userId, avatarURL, onChangeAvatar }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const storageInstance = getStorage();
      const fileRef = sRef(storageInstance, `avatars/${userId}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      await update(dbRef(db, `usuarios/${userId}`), { avatar: url });
      onChangeAvatar(url);
      toast.success("Avatar atualizado!");
    } catch (err) {
      console.error(err);
      setUploadError("Falha ao enviar foto.");
      toast.error("Erro no upload do avatar.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      const storageInstance = getStorage();
      const fileRef = sRef(storageInstance, `avatars/${userId}`);
      await deleteObject(fileRef).catch(() => { });
      await update(dbRef(db, `usuarios/${userId}`), { avatar: null });
      onChangeAvatar(null);
      toast.info("Avatar removido.");
    } catch (err) {
      console.warn("Erro ao remover avatar", err);
      toast.error("Não foi possível remover o avatar.");
      onChangeAvatar(null);
    }
  };

  const handlePreset = async (url) => {
    try {
      await update(dbRef(db, `usuarios/${userId}`), { avatar: url });
      onChangeAvatar(url);
      toast.success("Avatar selecionado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao definir avatar.");
    }
  };

  return (
    <div className="text-center mb-4">
      <div
        className="rounded-circle border overflow-hidden position-relative mx-auto mb-2"
        style={{ width: 120, height: 120 }}
      >
        {avatarURL ? (
          <img
            src={avatarURL}
            alt="Avatar atual"
            className="w-100 h-100"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            className="d-flex justify-content-center align-items-center bg-secondary text-white"
            style={{ width: "100%", height: "100%", fontSize: "2.5rem" }}
          >
            <i className="fa-solid fa-user" aria-hidden="true"></i>
          </div>
        )}

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
          <i className="fa-solid fa-camera text-white" aria-hidden="true"></i>
        </label>
        <input
          type="file"
          id="avatarPhoto"
          accept="image/*"
          onChange={handleFile}
          style={{ display: "none" }}
          aria-label="Upload de avatar"
        />
      </div>

      {uploading && <small className="text-muted d-block">Enviando foto...</small>}
      {uploadError && <small className="text-danger d-block">{uploadError}</small>}

      <div className="d-flex justify-content-center gap-2 mb-2">
        {avatarURL && (
          <button
            className="btn btn-outline-danger btn-sm"
            onClick={handleRemove}
            type="button"
            aria-label="Remover avatar"
          >
            Remover
          </button>
        )}
      </div>

      <div>
        <h6 className="mt-3 mb-2">Escolha um avatar:</h6>
        <div
          className="d-flex gap-2 flex-wrap justify-content-center"
          style={{ maxHeight: 220, overflowY: "auto", paddingBottom: 4 }}
        >
          {AVATAR_OPTIONS.map((url) => (
            <div
              key={url}
              className="border rounded-circle overflow-hidden"
              style={{
                width: 50,
                height: 50,
                cursor: "pointer",
                padding: 2,
                background: avatarURL === url ? "#e9fdd8" : "transparent",
                boxShadow: avatarURL === url ? "0 0 0 3px rgba(40,167,69,0.6)" : "none",
                transition: "transform .15s ease, boxShadow .15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => handlePreset(url)}
              title="Selecionar"
              aria-label="Selecionar avatar preset"
              onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <img
                src={url}
                alt="Avatar opção"
                className="w-100 h-100"
                style={{ objectFit: "cover", borderRadius: "50%" }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ user, defaultValues, onSaved }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(profileSchema),
    mode: "onBlur",
  });

  const cepWatch = watch("cep");
  const debouncedCep = useDebounce(cepWatch, 600);

  useEffect(() => {
    const raw = debouncedCep || "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 8) {
      const controller = new AbortController();
      fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            setValue("rua", data.logradouro || "");
            setValue("bairro", data.bairro || "");
            setValue("cidade", data.localidade || "");
            setValue("estado", data.uf || "");
          }
        })
        .catch(() => { });
      return () => controller.abort();
    }
  }, [debouncedCep, setValue]);

  const onSubmit = async (vals) => {
    try {
      const cleaned = {
        ...vals,
        cep: vals.cep.replace(/\D/g, ""),
        celular: vals.celular.replace(/\D/g, ""),
      };
      await update(dbRef(db, `usuarios/${user.uid}`), cleaned);
      onSaved();
      toast.success("Perfil salvo com sucesso!");
    } catch (err) {
      console.error("Erro salvando perfil", err);
      toast.error("Não foi possível salvar o perfil.");
      throw err;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Formulário de perfil">
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="nome" className="form-label">
            Nome
          </label>
          <input id="nome" {...register("nome")} className="form-control" aria-invalid={!!errors.nome} />
          {errors.nome && <small className="text-danger">{errors.nome.message}</small>}
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor="apelido" className="form-label">
            Apelido
          </label>
          <input id="apelido" {...register("apelido")} className="form-control" />
          {errors.apelido && <small className="text-danger">{errors.apelido.message}</small>}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="sobrenome" className="form-label">
          Sobrenome
        </label>
        <input id="sobrenome" {...register("sobrenome")} className="form-control" />
        {errors.sobrenome && <small className="text-danger">{errors.sobrenome.message}</small>}
      </div>

      <div className="mb-3">
        <label className="form-label">E-mail</label>
        <input className="form-control" value={user.email} disabled aria-label="E-mail" />
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="cep" className="form-label">
            CEP
          </label>
          <input
            id="cep"
            className="form-control"
            value={watch("cep") || ""}
            onChange={(e) => {
              const v = formatCep(e.target.value);
              setValue("cep", v, { shouldDirty: true });
            }}
            maxLength={9}
            aria-invalid={!!errors.cep}
          />
          {errors.cep && <small className="text-danger">{errors.cep.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="celular" className="form-label">
            Celular
          </label>
          <input
            id="celular"
            className="form-control"
            value={watch("celular") || ""}
            onChange={(e) => {
              const v = formatPhone(e.target.value);
              setValue("celular", v, { shouldDirty: true });
            }}
            maxLength={16}
            aria-invalid={!!errors.celular}
          />
          {errors.celular && <small className="text-danger">{errors.celular.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="complemento" className="form-label">
            Complemento
          </label>
          <input id="complemento" {...register("complemento")} className="form-control" />
          {errors.complemento && <small className="text-danger">{errors.complemento.message}</small>}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="rua" className="form-label">
            Rua
          </label>
          <input id="rua" {...register("rua")} className="form-control" />
          {errors.rua && <small className="text-danger">{errors.rua.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="bairro" className="form-label">
            Bairro
          </label>
          <input id="bairro" {...register("bairro")} className="form-control" />
          {errors.bairro && <small className="text-danger">{errors.bairro.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="cidade" className="form-label">
            Cidade
          </label>
          <input id="cidade" {...register("cidade")} className="form-control" />
          {errors.cidade && <small className="text-danger">{errors.cidade.message}</small>}
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <button
          type="submit"
          className="btn btn-primary mb-4"
          disabled={!isDirty || isSubmitting}
          aria-label="Salvar dados"
          style={{ minWidth: 140 }}
        >
          {isSubmitting ? "Salvando..." : "Salvar Dados"}
        </button>
      </div>
    </form>
  );
}

function CartList({ userId, carts, onDelete, onCompare }) {
  const backupRef = useRef({});

  const handleDelete = (cart) => {
    if (!window.confirm("Deseja realmente excluir este carrinho?")) return;
    backupRef.current[cart.id] = cart;
    onDelete(cart.id);
    toast.success(
      <div>
        Carrinho excluído.{" "}
        <button
          onClick={async () => {
            const original = backupRef.current[cart.id];
            if (original) {
              await update(dbRef(db, `usuarios/${userId}/carts/${original.id}`), original);
              toast.info("Carrinho restaurado.");
              delete backupRef.current[cart.id];
            }
          }}
          style={{
            background: "none",
            border: "none",
            color: "#0d6efd",
            textDecoration: "underline",
            cursor: "pointer",
            padding: 0,
            marginLeft: 8,
          }}
        >
          Desfazer
        </button>
      </div>,
      { autoClose: 5000, closeOnClick: false }
    );
  };

  if (!carts || carts.length === 0) {
    return <div className="alert alert-info">Você não tem carrinhos salvos.</div>;
  }

  return (
    <>
      <ul className="list-group mb-3">
        {carts.map((cart) => {
          const total = (cart.items || []).reduce(
            (sum, it) => sum + Number(it.price || 0) * (it.qtd || it.quantidade || 1),
            0
          );
          return (
            <li
              key={cart.id}
              className="list-group-item d-flex justify-content-between align-items-start flex-wrap"
              aria-label={`Carrinho de ${cart.mercadoNome || "mercado desconhecido"}`}
            >
              <div style={{ flex: "1 1 60%" }}>
                <small className="text-muted">{new Date(cart.criadoEm).toLocaleString()}</small>
                <div className="mt-1" style={{ fontSize: "0.9rem" }}>
                  <strong>Mercado:</strong> {cart.mercadoNome || "Não informado"}
                  {cart.mercadoRua && (
                    <>
                      <br />
                      <strong>Endereço:</strong> {cart.mercadoRua}, {cart.mercadoEstado || ""},{" "}
                      {cart.mercadoPais || ""}
                    </>
                  )}
                </div>
                <div className="mt-2" style={{ fontSize: 13 }}>
                  {cart.items &&
                    cart.items.map((it, idx) => (
                      <div key={idx}>
                        {(it.qtd || it.quantidade || 1)}x {it.name} — R${" "}
                        {Number(it.price || 0).toFixed(2).replace(".", ",")}
                      </div>
                    ))}
                </div>
                <div className="mt-2">
                  <strong>
                    {cart.items?.length || 0} {cart.items?.length !== 1 ? "itens" : "item"} — Total: R${" "}
                    {total.toFixed(2).replace(".", ",")}
                  </strong>
                </div>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => handleDelete(cart)}
                  aria-label="Excluir carrinho"
                >
                  Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {carts.length > 0 && (
        <div className="text-end">
          <button
            className="btn btn-success px-4 py-2 mb-3"
            onClick={onCompare}
            style={{
              borderRadius: "30px",
              fontWeight: "600",
              fontSize: "1rem",
              background: "linear-gradient(135deg, #28a745, #218838)",
              boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)",
              transition: "all 0.2s ease",
              border: "none",
              color: "#fff",
            }}
            aria-label="Comparar carrinhos"
          >
            <i className="fa-solid fa-scale-balanced me-2" aria-hidden="true"></i>
            Comparar Carrinhos
          </button>
        </div>
      )}
    </>
  );
}

export default function UserProfile({ user }) {
  const [profileData, setProfileData] = useState(null);
  const [avatarURL, setAvatarURL] = useState(null);
  const [carts, setCarts] = useState([]);
  const [cartsLoading, setCartsLoading] = useState(true);
  const [showUserData, setShowUserData] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const userRef = dbRef(db, `usuarios/${user.uid}`);
    const cartsRef = dbRef(db, `usuarios/${user.uid}/carts`);

    const handleProfile = (snap) => {
      if (snap.exists()) {
        const d = snap.val();
        setProfileData({
          nome: d.nome || "",
          apelido: d.apelido || "",
          sobrenome: d.sobrenome || "",
          cep: d.cep ? formatCep(d.cep) : "",
          celular: d.celular ? formatPhone(d.celular) : "",
          rua: d.rua || "",
          bairro: d.bairro || "",
          cidade: d.cidade || "",
          estado: d.estado || "",
          complemento: d.complemento || "",
        });
        if (d.avatar) setAvatarURL(d.avatar);
      } else {
        setProfileData({
          nome: "",
          apelido: "",
          sobrenome: "",
          cep: "",
          celular: "",
          rua: "",
          bairro: "",
          cidade: "",
          estado: "",
          complemento: "",
        });
      }
      setLoadingProfile(false);
    };

    const handleCarts = (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data)
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
      setCarts(arr);
      setCartsLoading(false);
    };

    onValue(userRef, handleProfile);
    onValue(cartsRef, handleCarts);

    return () => {
      off(userRef, "value", handleProfile);
      off(cartsRef, "value", handleCarts);
    };
  }, [user]);

  const handleSave = () => {
    toast.success("Perfil atualizado com sucesso!", { autoClose: 2000 });
  };

  const handleDeleteCart = async (id) => {
    try {
      await remove(dbRef(db, `usuarios/${user.uid}/carts/${id}`));
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir carrinho.");
    }
  };

  const handleCompare = () => {
    const ids = carts.map((c) => c.id).join(",");
    navigate(`/comparar-carrinhos?ids=${encodeURIComponent(ids)}`);
  };

  if (!user) return <div>Usuário não autenticado.</div>;

  return (
    <div
      className="container mt-4"
      style={{
        zIndex: 2,
        paddingTop: "80px",
      }}
    >
      <ToastContainer position="top-right" pauseOnHover />

      <h4 className="mb-4">Meu Perfil</h4>

      <div className="d-flex flex-column align-items-center mb-4">
        {loadingProfile ? (
          <>
            <SkeletonBox width={120} height={120} style={{ borderRadius: "50%" }} />
            <div style={{ width: 200 }}>
              <SkeletonBox width="100%" height={20} />
              <SkeletonBox width="60%" height={16} />
            </div>
          </>
        ) : (
          <AvatarPicker userId={user.uid} avatarURL={avatarURL} onChangeAvatar={setAvatarURL} />
        )}
      </div>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Dados Pessoais</h5>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
          onClick={() => setShowUserData((v) => !v)}
          aria-label={showUserData ? "Ocultar dados" : "Mostrar dados"}
        >
          <i
            className="fa-solid fa-chevron-down"
            style={{
              transition: "transform 0.3s ease",
              transform: showUserData ? "rotate(180deg)" : "rotate(0deg)",
            }}
            aria-hidden="true"
          ></i>
        </button>
      </div>

      {showUserData && (
        <div style={{ overflow: "hidden", transition: "all 0.4s ease" }}>
          {loadingProfile || !profileData ? (
            <div>
              <SkeletonBox width="100%" height={24} />
              <div className="row">
                <div className="col-md-6">
                  <SkeletonBox width="90%" height={40} />
                </div>
                <div className="col-md-6">
                  <SkeletonBox width="90%" height={40} />
                </div>
              </div>
              <SkeletonBox width="60%" height={40} />
            </div>
          ) : (
            <ProfileForm user={user} defaultValues={profileData} onSaved={handleSave} />
          )}
        </div>
      )}
    </div>
  );
}
