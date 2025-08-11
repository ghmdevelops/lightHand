import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../firebase";
import { ref as dbRef, onValue, update, remove, off } from "firebase/database";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { getStorage, ref as sRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const formatCep = (raw) => {
  const digits = (raw + "").replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return digits.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
  return digits;
};

const formatPhone = (raw) => {
  let digits = (raw + "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
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

const profileSchema = yup.object({
  nome: yup.string().required("Nome obrigatório"),
  apelido: yup.string().nullable(),
  sobrenome: yup.string().nullable(),
  cep: yup.string().required("CEP obrigatório").matches(/^\d{5}-?\d{3}$/, "CEP inválido"),
  celular: yup.string().required("Celular obrigatório").matches(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Celular inválido"),
  rua: yup.string().nullable(),
  bairro: yup.string().nullable(),
  cidade: yup.string().nullable(),
  estado: yup.string().nullable(),
  complemento: yup.string().nullable(),
});

const AVATAR_OPTIONS = [
  "https://robohash.org/crazy1.png?set=set1",
  "https://robohash.org/crazy2.png?set=set1",
  "https://robohash.org/crazy3.png?set=set1",
  "https://robohash.org/crazy4.png?set=set1",
  "https://robohash.org/crazy5.png?set=set1",
  ...Array.from({ length: 45 }, (_, i) => `https://i.pravatar.cc/150?img=${i + 1}`),
];

const SkeletonBox = ({ width = "100%", height = 16, style = {} }) => (
  <div aria-hidden="true" style={{ width, height, background: "#e3e3e3", borderRadius: 4, marginBottom: 8, ...style, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: "-100%", height: "100%", width: "100%", background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0) 100%)", animation: "shimmer 1.5s infinite" }} />
    <style>{`@keyframes shimmer{0%{transform:translateX(0)}100%{transform:translateX(200%)}}`}</style>
  </div>
);

function dataUrlFromCanvas(canvas, quality = 0.9) {
  return canvas.toDataURL("image/jpeg", quality);
}

async function squareCompress(file, size = 512, quality = 0.88) {
  const blob = file instanceof Blob ? file : new Blob([file]);
  const url = URL.createObjectURL(blob);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const s = Math.min(img.width, img.height);
  const sx = (img.width - s) / 2;
  const sy = (img.height - s) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
  const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  URL.revokeObjectURL(url);
  return out;
}

function identicon(userId, size = 120) {
  const str = String(userId || "user");
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash << 5) - hash + str.charCodeAt(i);
  const hue = Math.abs(hash) % 360;
  const bg = `hsl(${hue},70%,18%)`;
  const fg = `hsl(${(hue + 180) % 360},75%,60%)`;
  const cells = 5;
  const cell = size / cells;
  const grid = [];
  for (let y = 0; y < cells; y++) {
    const row = [];
    for (let x = 0; x < Math.ceil(cells / 2); x++) {
      const bit = (hash >> (x + y * cells)) & 1;
      row[x] = bit;
    }
    const mirror = row.slice(0, cells - Math.ceil(cells / 2)).reverse();
    grid.push(row.concat(mirror));
  }
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = fg;
  grid.forEach((row, y) =>
    row.forEach((v, x) => {
      if (v) ctx.fillRect(x * cell, y * cell, cell, cell);
    })
  );
  return canvas.toDataURL("image/png");
}

function AvatarPicker({ userId, avatarURL, onChangeAvatar }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [progress, setProgress] = useState(0);
  const [drag, setDrag] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const validateFile = (file) => {
    const okType = /image\/(jpeg|png|webp)/.test(file.type);
    const okSize = file.size <= 4 * 1024 * 1024;
    if (!okType) toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
    if (!okSize) toast.error("Imagem muito grande (máx. 4MB).");
    return okType && okSize;
  };

  const doUpload = async (file) => {
    if (!file || !validateFile(file)) return;
    setUploadError("");
    setUploading(true);
    setProgress(0);
    try {
      const processed = await squareCompress(file, 512, 0.9);
      const storageInstance = getStorage();
      const fileRef = sRef(storageInstance, `avatars/${userId}`);
      const task = uploadBytesResumable(fileRef, processed, { contentType: "image/jpeg" });
      await new Promise((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          resolve
        );
      });
      const url = await getDownloadURL(fileRef);
      await update(dbRef(db, `usuarios/${userId}`), { avatar: url });
      onChangeAvatar(url);
      toast.success("Avatar atualizado!");
    } catch (err) {
      setUploadError("Falha ao enviar foto.");
      toast.error("Erro no upload do avatar.");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleInput = async (e) => {
    const file = e.target.files?.[0];
    await doUpload(file);
    e.target.value = "";
  };

  const handleRemove = async () => {
    try {
      const storageInstance = getStorage();
      const fileRef = sRef(storageInstance, `avatars/${userId}`);
      await deleteObject(fileRef).catch(() => {});
      await update(dbRef(db, `usuarios/${userId}`), { avatar: null });
      onChangeAvatar(null);
      toast.info("Avatar removido.");
    } catch (err) {
      toast.error("Não foi possível remover o avatar.");
      onChangeAvatar(null);
    }
  };

  const handlePreset = async (url) => {
    try {
      await update(dbRef(db, `usuarios/${userId}`), { avatar: url });
      onChangeAvatar(url);
      toast.success("Avatar selecionado!");
    } catch {
      toast.error("Erro ao definir avatar.");
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    await doUpload(file);
  };

  const generated = useMemo(() => identicon(userId, 120), [userId]);

  return (
    <div className="mb-4">
      <div
        className="text-center rounded-circle border overflow-hidden position-relative mx-auto mb-2"
        style={{ width: 120, height: 120, outline: drag ? "3px solid #0d6efd" : "none", transition: "outline .2s" }}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
      >
        {avatarURL ? (
          <img src={avatarURL} alt="Avatar atual" className="w-100 h-100" style={{ objectFit: "cover" }} />
        ) : (
          <img src={generated} alt="Avatar gerado" className="w-100 h-100" style={{ objectFit: "cover" }} />
        )}
        <label
          htmlFor="avatarPhoto"
          className="position-absolute d-flex align-items-center justify-content-center"
          style={{ bottom: 0, right: 0, background: "#198754", borderRadius: "50%", width: 36, height: 36, cursor: "pointer" }}
          title="Selecionar Foto"
        >
          <i className="bi bi-camera-fill text-white" aria-hidden="true"></i>
        </label>
        <input type="file" id="avatarPhoto" accept="image/*" onChange={handleInput} style={{ display: "none" }} aria-label="Upload de avatar" />
        {uploading && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center align-items-center" style={{ background: "rgba(0,0,0,.45)", color: "#fff" }}>
            <div className="progress w-75" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100" style={{ height: 10, borderRadius: 20 }}>
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <small className="mt-2">{progress}%</small>
          </div>
        )}
      </div>

      {uploadError && <small className="text-danger d-block">{uploadError}</small>}

      <div className="d-flex justify-content-center gap-2 mb-2">
        {avatarURL && (
          <button className="btn btn-outline-danger btn-sm" onClick={handleRemove} type="button" aria-label="Remover avatar">
            <i className="bi bi-trash me-1"></i> Remover
          </button>
        )}
        <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => handlePreset(generated)}>
          <i className="bi bi-stars me-1"></i> Gerar avatar
        </button>
      </div>

      <div className="d-flex align-items-center justify-content-center gap-2 mt-3 mb-2">
        <h6 className="mb-0">Avatares sugeridos</h6>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setShowPresets((v) => !v)}
          aria-expanded={showPresets}
          aria-controls="avatarPresetPanel"
        >
          {showPresets ? "Esconder" : "Mostrar"}
        </button>
        <small className="text-muted">{AVATAR_OPTIONS.length} opções</small>
      </div>

      <div
        id="avatarPresetPanel"
        style={{
          maxHeight: showPresets ? 240 : 0,
          overflow: "hidden",
          transition: "max-height .25s ease",
        }}
      >
        <div className="d-flex gap-2 flex-wrap justify-content-center" style={{ paddingBottom: 4 }}>
          {AVATAR_OPTIONS.map((url) => (
            <button
              key={url}
              type="button"
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
              <img src={url} alt="Avatar opção" className="w-100 h-100" style={{ objectFit: "cover", borderRadius: "50%" }} loading="lazy" />
            </button>
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
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(profileSchema),
    mode: "onBlur",
  });

  const cepWatch = watch("cep");
  const ufWatch = watch("estado");
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
            setValue("rua", data.logradouro || "", { shouldDirty: true });
            setValue("bairro", data.bairro || "", { shouldDirty: true });
            setValue("cidade", data.localidade || "", { shouldDirty: true });
            setValue("estado", (data.uf || "").toUpperCase(), { shouldDirty: true });
          } else {
            setError("cep", { type: "manual", message: "CEP não encontrado" });
          }
        })
        .catch(() => {});
      return () => controller.abort();
    }
  }, [debouncedCep, setValue, setError]);

  useEffect(() => {
    if (!ufWatch) return;
    const v = String(ufWatch).toUpperCase().slice(0, 2);
    if (v !== ufWatch) setValue("estado", v, { shouldDirty: true });
  }, [ufWatch, setValue]);

  useEffect(() => {
    const pending = localStorage.getItem("savvy_profile_pending");
    const handler = async () => {
      if (!navigator.onLine || !pending) return;
      try {
        const payload = JSON.parse(pending);
        await update(dbRef(db, `usuarios/${user.uid}`), payload);
        localStorage.removeItem("savvy_profile_pending");
        toast.success("Perfil sincronizado.");
      } catch {}
    };
    window.addEventListener("online", handler);
    handler();
    return () => window.removeEventListener("online", handler);
  }, [user]);

  const onSubmit = async (vals) => {
    try {
      const cleaned = { ...vals, cep: vals.cep.replace(/\D/g, ""), celular: vals.celular.replace(/\D/g, "") };
      if (!navigator.onLine) {
        localStorage.setItem("savvy_profile_pending", JSON.stringify(cleaned));
        onSaved();
        toast.info("Sem conexão. Alterações salvas localmente e serão sincronizadas.");
        return;
      }
      await update(dbRef(db, `usuarios/${user.uid}`), cleaned);
      onSaved();
      toast.success("Perfil salvo com sucesso!");
    } catch {
      toast.error("Não foi possível salvar o perfil.");
      throw new Error("save-failed");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate aria-label="Formulário de perfil">
      <div className="row">
        <div className="col-md-6 mb-3">
          <label htmlFor="nome" className="form-label">Nome</label>
          <input id="nome" {...register("nome")} className="form-control" aria-invalid={!!errors.nome} autoComplete="given-name" />
          {errors.nome && <small className="text-danger">{errors.nome.message}</small>}
        </div>
        <div className="col-md-6 mb-3">
          <label htmlFor="apelido" className="form-label">Apelido</label>
          <input id="apelido" {...register("apelido")} className="form-control" autoComplete="nickname" />
          {errors.apelido && <small className="text-danger">{errors.apelido.message}</small>}
        </div>
      </div>

      <div className="mb-3">
        <label htmlFor="sobrenome" className="form-label">Sobrenome</label>
        <input id="sobrenome" {...register("sobrenome")} className="form-control" autoComplete="family-name" />
        {errors.sobrenome && <small className="text-danger">{errors.sobrenome.message}</small>}
      </div>

      <div className="mb-3">
        <label className="form-label">E-mail</label>
        <input className="form-control" value={user.email} disabled aria-label="E-mail" autoComplete="email" />
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="cep" className="form-label">CEP</label>
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
            inputMode="numeric"
            autoComplete="postal-code"
          />
          {errors.cep && <small className="text-danger">{errors.cep.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="celular" className="form-label">Celular</label>
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
            inputMode="numeric"
            autoComplete="tel"
          />
          {errors.celular && <small className="text-danger">{errors.celular.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="complemento" className="form-label">Complemento</label>
          <input id="complemento" {...register("complemento")} className="form-control" autoComplete="address-line2" />
          {errors.complemento && <small className="text-danger">{errors.complemento.message}</small>}
        </div>
      </div>

      <div className="row">
        <div className="col-md-4 mb-3">
          <label htmlFor="rua" className="form-label">Rua</label>
          <input id="rua" {...register("rua")} className="form-control" autoComplete="address-line1" />
          {errors.rua && <small className="text-danger">{errors.rua.message}</small>}
        </div>
        <div className="col-md-4 mb-3">
          <label htmlFor="bairro" className="form-label">Bairro</label>
          <input id="bairro" {...register("bairro")} className="form-control" autoComplete="address-level3" />
          {errors.bairro && <small className="text-danger">{errors.bairro.message}</small>}
        </div>
        <div className="col-md-2 mb-3">
          <label htmlFor="cidade" className="form-label">Cidade</label>
          <input id="cidade" {...register("cidade")} className="form-control" autoComplete="address-level2" />
          {errors.cidade && <small className="text-danger">{errors.cidade.message}</small>}
        </div>
        <div className="col-md-2 mb-3">
          <label htmlFor="estado" className="form-label">UF</label>
          <input id="estado" {...register("estado")} className="form-control text-uppercase" maxLength={2} autoComplete="address-level1" />
          {errors.estado && <small className="text-danger">{errors.estado.message}</small>}
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <button type="submit" className="btn btn-primary mb-2" disabled={!isDirty || isSubmitting} aria-label="Salvar dados" style={{ minWidth: 160, borderRadius: 10 }}>
          {isSubmitting ? "Salvando..." : "Salvar Dados"}
        </button>
      </div>
    </form>
  );
}

function toBRL(n) {
  return Number(n || 0).toFixed(2).replace(".", ",");
}

function exportCartsCSV(carts) {
  const headers = ["id", "criadoEm", "mercado", "itens", "total"];
  const rows = carts.map((c) => {
    const total = (c.items || []).reduce((sum, it) => sum + Number(it.price || 0) * (it.qtd || it.quantidade || 1), 0);
    const itensTxt = (c.items || []).map((it) => `${(it.qtd || it.quantidade || 1)}x ${it.name} R$ ${toBRL(it.price)}`).join(" | ");
    return [c.id, new Date(c.criadoEm).toLocaleString(), c.mercadoNome || "", `"${itensTxt.replaceAll('"', '""')}"`, toBRL(total)];
  });
  const csv = [headers.join(";")].concat(rows.map((r) => r.join(";"))).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carrinhos_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function CartList({ userId, carts, onDelete, onCompare }) {
  const backupRef = useRef({});
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("date");
  const [selected, setSelected] = useState([]);
  const debouncedQ = useDebounce(q, 250);

  const filtered = useMemo(() => {
    const term = debouncedQ.trim().toLowerCase();
    let arr = carts || [];
    if (term) {
      arr = arr.filter((c) => {
        const inMarket = (c.mercadoNome || "").toLowerCase().includes(term);
        const inItems = (c.items || []).some((it) => (it.name || "").toLowerCase().includes(term));
        return inMarket || inItems;
      });
    }
    if (sort === "date") arr = [...arr].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    if (sort === "total") {
      arr = [...arr].sort((a, b) => {
        const ta = (a.items || []).reduce((s, it) => s + Number(it.price || 0) * (it.qtd || it.quantidade || 1), 0);
        const tb = (b.items || []).reduce((s, it) => s + Number(it.price || 0) * (it.qtd || it.quantidade || 1), 0);
        return tb - ta;
      });
    }
    return arr;
  }, [carts, debouncedQ, sort]);

  const toggleAll = () => {
    if (selected.length === filtered.length) setSelected([]);
    else setSelected(filtered.map((c) => c.id));
  };

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
          style={{ background: "none", border: "none", color: "#0d6efd", textDecoration: "underline", cursor: "pointer", padding: 0, marginLeft: 8 }}
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <div className="input-group" style={{ maxWidth: 360 }}>
          <span className="input-group-text"><i className="bi bi-search" /></span>
          <input className="form-control" placeholder="Buscar por mercado ou item" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="d-flex align-items-center gap-2">
          <select className="form-select form-select-sm w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="date">Mais recentes</option>
            <option value="total">Maior total</option>
          </select>
          <button className="btn btn-outline-secondary btn-sm" onClick={() => exportCartsCSV(selected.length ? carts.filter((c) => selected.includes(c.id)) : filtered)}>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="d-flex align-items-center gap-2 mb-2">
        <div className="form-check">
          <input className="form-check-input" type="checkbox" id="selAll" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} />
          <label className="form-check-label" htmlFor="selAll">Selecionar todos</label>
        </div>
        {selected.length > 0 && <small className="text-muted">Selecionados: {selected.length}</small>}
      </div>

      <ul className="list-group mb-3">
        {filtered.map((cart) => {
          const total = (cart.items || []).reduce((sum, it) => sum + Number(it.price || 0) * (it.qtd || it.quantidade || 1), 0);
          const checked = selected.includes(cart.id);
          return (
            <li key={cart.id} className="list-group-item d-flex justify-content-between align-items-start flex-wrap" aria-label={`Carrinho de ${cart.mercadoNome || "mercado desconhecido"}`}>
              <div className="form-check me-3 mt-1">
                <input className="form-check-input" type="checkbox" checked={checked} onChange={() => setSelected((prev) => (checked ? prev.filter((id) => id !== cart.id) : [...prev, cart.id]))} />
              </div>
              <div style={{ flex: "1 1 60%" }}>
                <small className="text-muted">{new Date(cart.criadoEm).toLocaleString()}</small>
                <div className="mt-1" style={{ fontSize: "0.9rem" }}>
                  <strong>Mercado:</strong> {cart.mercadoNome || "Não informado"}
                  {cart.mercadoRua && (
                    <>
                      <br />
                      <strong>Endereço:</strong> {cart.mercadoRua}, {cart.mercadoEstado || ""}, {cart.mercadoPais || ""}
                    </>
                  )}
                </div>
                <div className="mt-2" style={{ fontSize: 13, maxHeight: 70, overflow: "auto" }}>
                  {cart.items &&
                    cart.items.map((it, idx) => (
                      <div key={idx}>
                        {(it.qtd || it.quantidade || 1)}x {it.name} — R$ {Number(it.price || 0).toFixed(2).replace(".", ",")}
                      </div>
                    ))}
                </div>
                <div className="mt-2">
                  <strong>
                    {cart.items?.length || 0} {cart.items?.length !== 1 ? "itens" : "item"} — Total: R$ {total.toFixed(2).replace(".", ",")}
                  </strong>
                </div>
              </div>
              <div className="d-flex gap-2 mt-2">
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(cart)} aria-label="Excluir carrinho">
                  <i className="bi bi-trash me-1"></i> Excluir
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="text-end">
        <button
          className="btn btn-success px-4 py-2 mb-2"
          onClick={() => onCompare(selected.length ? selected : undefined)}
          style={{ borderRadius: "30px", fontWeight: "600", fontSize: "1rem", background: "linear-gradient(135deg, #28a745, #218838)", boxShadow: "0 4px 12px rgba(40, 167, 69, 0.3)", border: "none", color: "#fff" }}
          aria-label="Comparar carrinhos"
        >
          <i className="bi bi-scales me-2" aria-hidden="true"></i>
          Comparar {selected.length ? `(${selected.length})` : "Carrinhos"}
        </button>
      </div>
    </>
  );
}

export default function UserProfile({ user, onVoltar }) {
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
        else setAvatarURL(null);
      } else {
        setProfileData({ nome: "", apelido: "", sobrenome: "", cep: "", celular: "", rua: "", bairro: "", cidade: "", estado: "", complemento: "" });
        setAvatarURL(null);
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
    } catch {
      toast.error("Erro ao excluir carrinho.");
    }
  };

  const handleCompare = (selectedIds) => {
    const ids = (selectedIds && selectedIds.length ? selectedIds : carts.map((c) => c.id)).join(",");
    navigate(`/comparar-carrinhos?ids=${encodeURIComponent(ids)}`);
  };

  if (!user) return <div className="container my-5">Usuário não autenticado.</div>;

  return (
    <div className="container" style={{ zIndex: 2, paddingTop: "84px" }}>
          <button className="btn btn-outline-secondary mt-3" onClick={onVoltar ? onVoltar : () => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i> Voltar
          </button>
      <ToastContainer position="top-right mb-4" pauseOnHover/>
      <div className="position-sticky bg-light pt-2 pb-2 mb-3" style={{ top: 56, zIndex: 3, borderBottom: "1px solid #eee" }}>
        <div className="d-flex align-items-center justify-content-between">
          <h4 className="mb-0">Meu Perfil</h4>
          <div style={{ width: 120 }} />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0" style={{ borderRadius: 14 }}>
            <div className="card-body">
              {loadingProfile ? (
                <>
                  <SkeletonBox width={120} height={120} style={{ borderRadius: "50%", margin: "0 auto 12px" }} />
                  <SkeletonBox width="70%" height={18} style={{ margin: "0 auto" }} />
                </>
              ) : (
                <AvatarPicker userId={user.uid} avatarURL={avatarURL} onChangeAvatar={setAvatarURL} />
              )}
              <div className="text-center">
                <div className="badge bg-light text-dark border mt-2">
                  {user.email}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white d-flex justify-content-between align-items-center" style={{ borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
              <h5 className="mb-0">Dados Pessoais</h5>
              <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => setShowUserData((v) => !v)} aria-label={showUserData ? "Ocultar dados" : "Mostrar dados"}>
                <i className={`bi ${showUserData ? "bi-chevron-up" : "bi-chevron-down"}`} />
              </button>
            </div>
            <div className="card-body">
              {showUserData && (loadingProfile || !profileData ? <SkeletonBox width="100%" height={24} /> : <ProfileForm user={user} defaultValues={profileData} onSaved={handleSave} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
