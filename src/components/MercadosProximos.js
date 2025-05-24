import React, { useState } from "react";
import OfertasMercado from "./OfertasMercado";
import MercadosAtivosGlobal from "./MercadosAtivosGlobal";

export default function BuscarMercadosOSM({ user }) {
  const [mercados, setMercados] = useState([]);
  const [erro, setErro] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [pos, setPos] = useState(null);
  const [localInfo, setLocalInfo] = useState({
    rua: "",
    estado: "",
    pais: "",
  });
  const [mercadoSelecionado, setMercadoSelecionado] = useState(null);

  const getEnderecoFromCoords = async (lat, lon) => {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`
      );
      if (!resp.ok) throw new Error("Nominatim offline ou bloqueado");
      const data = await resp.json();
      return {
        rua: data.address.road || "",
        estado: data.address.state || "",
        pais: data.address.country || "",
      };
    } catch (e) {
      return { rua: "Não disponível", estado: "", pais: "" };
    }
  };

  const handleBuscar = async () => {
    setErro("");
    setBuscando(true);
    setMercados([]);
    setLocalInfo({ rua: "", estado: "", pais: "" });
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const lat = p.coords.latitude;
        const lon = p.coords.longitude;
        setPos({ lat, lon });

        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=pt`
        )
          .then((res) => res.json())
          .then((data) => {
            setLocalInfo({
              rua:
                data.address.road ||
                data.address.pedestrian ||
                data.address.cycleway ||
                data.address.footway ||
                data.address.path ||
                data.address.street ||
                data.display_name ||
                "Não encontrado",
              estado:
                data.address.state || data.address.region || "Não encontrado",
              pais: data.address.country || "Não encontrado",
            });
          });

        const delta = 0.03; // ~3km
        const url = `https://overpass-api.de/api/interpreter?data=[out:json];node["shop"~"supermarket|convenience|grocery"](${
          lat - delta
        },${lon - delta},${lat + delta},${lon + delta});out;`;

        fetch(url)
          .then((res) => res.json())
          .then(async (data) => {
            const elementosLimitados = data.elements.slice(0, 5);
            const listaMercados = await Promise.all(
              elementosLimitados.map(async (m) => {
                const endereco = await getEnderecoFromCoords(m.lat, m.lon);
                return {
                  id: m.id,
                  nome: m.tags.name || "Mercado",
                  lat: m.lat,
                  lon: m.lon,
                  tipo: m.tags.shop,
                  ...endereco,
                };
              })
            );
            setMercados(listaMercados);
            setBuscando(false);
          })
          .catch(() => {
            setErro("Não foi possível buscar mercados.");
            setBuscando(false);
          });
      },
      (err) => {
        setErro("Permita o acesso à localização.");
        setBuscando(false);
      }
    );
  };

  if (mercadoSelecionado) {
    return (
      <OfertasMercado
        mercado={mercadoSelecionado}
        user={user}
        onVoltar={() => setMercadoSelecionado(null)}
      />
    );
  }

  return (
    <div className="container my-4">
      <button
        className="btn btn-success mb-3"
        onClick={handleBuscar}
        disabled={buscando}
      >
        {buscando ? "Buscando..." : "Buscar Mercados"}
      </button>

      {pos && (
        <div className="alert alert-info mb-3">
          <strong>Sua localização atual:</strong>
          <br />
          Latitude: {pos.lat.toFixed(6)}
          <br />
          Longitude: {pos.lon.toFixed(6)}
          <br />
          <span>
            <strong>Rua:</strong> {localInfo.rua}
            <br />
            <strong>Estado:</strong> {localInfo.estado}
            <br />
            <strong>País:</strong> {localInfo.pais}
          </span>
        </div>
      )}

      <h5 className="mb-2">Mercados com ofertas adicionadas por usuários</h5>
      <MercadosAtivosGlobal onSelecionar={setMercadoSelecionado} />

      <hr />

      <h5 className="mb-2">Mercados próximos</h5>
      {erro && <div className="alert alert-warning">{erro}</div>}

      {buscando && (
        <div className="text-center my-4">
          <div
            className="spinner-border text-success"
            role="status"
            style={{ width: 60, height: 60 }}
          >
            <span className="visually-hidden">Buscando...</span>
          </div>
          <div className="mt-2">Carregando mercados próximos...</div>
        </div>
      )}

      {!buscando && mercados.length > 0 && (
        <ul className="list-group">
          {mercados.map((m) => (
            <li
              className="list-group-item list-group-item-action"
              style={{ cursor: "pointer" }}
              key={m.id}
              onClick={() => setMercadoSelecionado(m)}
            >
              <strong>{m.nome}</strong> ({m.tipo})
              <br />
              {m.rua ? `${m.rua}, ` : ""}
              {m.estado ? `${m.estado}, ` : ""}
              {m.pais}
              <br />
              Latitude: {m.lat} - Longitude: {m.lon}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
