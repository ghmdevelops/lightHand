import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import { Card, Container, Row, Col, Spinner, Button, Modal } from "react-bootstrap";
import { getAuth } from "firebase/auth";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const carroIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743007.png",
  iconSize: [40, 40],
});

function CarroAnimado({ posInicial, posFinal }) {
  const [posicao, setPosicao] = useState(posInicial);
  const map = useMap();

  React.useEffect(() => {
    let step = 0;
    const passos = 20;
    const latStep = (posFinal[0] - posInicial[0]) / passos;
    const lngStep = (posFinal[1] - posInicial[1]) / passos;

    const interval = setInterval(() => {
      step++;
      if (step > passos) {
        clearInterval(interval);
        return;
      }
      const novaPos = [posInicial[0] + latStep * step, posInicial[1] + lngStep * step];
      setPosicao(novaPos);
      map.panTo(novaPos);
    }, 500);

    return () => clearInterval(interval);
  }, [posInicial, posFinal, map]);

  return <Marker position={posicao} icon={carroIcon} />;
}

export default function Pedidos() {
  const user = getAuth().currentUser;
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandidoIds, setExpandidoIds] = useState([]);
  const [mapaAberto, setMapaAberto] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState(null);

  useEffect(() => {
    if (!user) return;

    const pedidosRef = ref(db, `usuarios/${user.uid}/pedidos`);
    onValue(pedidosRef, (snap) => {
      const data = snap.val();
      const lista = data
        ? Object.entries(data).map(([id, pedido]) => ({ id, ...pedido }))
        : [];
      setPedidos(lista.reverse());
      setLoading(false);
    });
  }, [user]);

  const toggleExpandir = (id) => {
    setExpandidoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const excluirPedido = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
      await remove(ref(db, `usuarios/${user.uid}/pedidos/${id}`));
    } catch (err) {
      alert("Erro ao excluir pedido");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }

  const posicaoInicial = [-23.55052, -46.633308];
  const abrirMapa = (pedido) => {
    setPedidoSelecionado(pedido);
    setMapaAberto(true);
  };

  return (
    <Container className="mt-4" style={{
      zIndex: 2,
      paddingTop: "80px",
    }}>
      <button
        className="btn btn-outline-secondary mb-4"
        onClick={() => navigate(-1)}
      >
        &larr; Voltar
      </button>
      <h2>Pedidos Realizados</h2>

      <Row>
        {pedidos.map((pedido) => {
          const expandido = expandidoIds.includes(pedido.id);
          return (
            <Col md={6} lg={4} key={pedido.id} className="mb-3">
              <Card>
                <Card.Body>
                  <Card.Title>{pedido.mercadoNome}</Card.Title>
                  <Card.Subtitle className="mb-2 text-muted">
                    Total: R${pedido.total.toFixed(2).replace(".", ",")}
                  </Card.Subtitle>
                  <Card.Text>
                    <strong>Data:</strong>{" "}
                    {new Date(pedido.dataHora).toLocaleString()}
                  </Card.Text>

                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => toggleExpandir(pedido.id)}
                  >
                    {expandido ? "Ocultar Itens ▲" : "Mostrar Itens ▼"}
                  </Button>

                  <Button
                    variant="danger"
                    size="sm"
                    className="ms-2"
                    onClick={() => excluirPedido(pedido.id)}
                  >
                    Excluir
                  </Button>

                  <Button
                    variant="info"
                    size="sm"
                    className="ms-2"
                    onClick={() => abrirMapa(pedido)}
                  >
                    Ver Entrega
                  </Button>

                  {expandido && (
                    <ul className="mt-2">
                      {(pedido.itens || []).map((item, idx) => (
                        <li key={idx}>
                          {item.nome}: R${Number(item.preco).toFixed(2).replace(".", ",")}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <Modal show={mapaAberto} onHide={() => setMapaAberto(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Simulação de Entrega</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: "400px" }}>
          {pedidoSelecionado && (
            <MapContainer
              center={posicaoInicial}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={posicaoInicial}>
                <Popup>Posição Inicial (Ex: sua casa)</Popup>
              </Marker>
              <CarroAnimado
                posInicial={posicaoInicial}
                posFinal={pedidoSelecionado.endereco?.latlng || [-23.5489, -46.6388]}
              />
              <Marker position={pedidoSelecionado.endereco?.latlng || [-23.5489, -46.6388]}>
                <Popup>{pedidoSelecionado.mercadoNome}</Popup>
              </Marker>
            </MapContainer>
          )}
        </Modal.Body>
      </Modal>
    </Container>
  );
}
