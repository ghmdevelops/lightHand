import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { ref, onValue, remove } from "firebase/database";
import {
  Card,
  Container,
  Row,
  Col,
  Spinner,
  Button,
  Modal,
  ListGroup,
  ButtonGroup,
  Badge,
} from "react-bootstrap";
import { FaTrash, FaMapMarkerAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
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

  useEffect(() => {
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
      const lista = data ? Object.entries(data).map(([id, p]) => ({ id, ...p })) : [];
      setPedidos(lista.reverse());
      setLoading(false);
    });
  }, [user]);

  const toggleExpandir = (id) =>
    setExpandidoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const excluirPedido = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir este pedido?")) return;
    try {
      await remove(ref(db, `usuarios/${user.uid}/pedidos/${id}`));
    } catch (err) {
      alert("Erro ao excluir pedido");
    }
  };

  if (loading)
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" />
      </Container>
    );

  const posicaoInicial = [-23.55052, -46.633308];
  const abrirMapa = (pedido) => {
    setPedidoSelecionado(pedido);
    setMapaAberto(true);
  };

  return (
    <Container className="mt-4" style={{ zIndex: 2, paddingTop: "80px" }}>
      <button className="btn btn-outline-secondary mb-4" onClick={() => navigate(-1)}>
        &larr; Voltar
      </button>
      <h2>Pedidos Realizados</h2>

      {pedidos.length === 0 ? (
        <div className="alert alert-info mt-4">Você ainda não tem pedidos realizados.</div>
      ) : (
        <Row>
          {pedidos.map((pedido) => {
            const expandido = expandidoIds.includes(pedido.id);
            const dataPedido = new Date(pedido.dataHora);
            const ehRecente = (Date.now() - dataPedido) / 86400000 < 7;
            return (
              <Col md={6} lg={4} key={pedido.id} className="mb-4">
                <Card className="shadow-sm border-0 rounded-4" style={{ padding: "1.25rem" }}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <Card.Title as="h5" className="mb-0">
                        {pedido.mercadoNome}
                      </Card.Title>
                      <div className="d-flex gap-2">
                        {ehRecente && <Badge bg="success">Recente</Badge>}
                        {pedido.retiradaEmLoja && <Badge bg="info">Retirar na loja</Badge>}
                      </div>
                    </div>

                    <Card.Subtitle className="mb-2 text-muted fs-6">
                      Total: <strong>R${pedido.total.toFixed(2).replace(".", ",")}</strong>
                    </Card.Subtitle>
                    <Card.Text className="mb-2">
                      <small>
                        <strong>Data:</strong> {dataPedido.toLocaleString()}
                      </small>
                    </Card.Text>

                    {pedido.retiradaEmLoja && (
                      <Card.Text className="mb-3">
                        <small>
                          <strong>Endereço da loja:</strong>{" "}
                          {pedido.lojaEndereco ||
                            pedido.enderecoLoja ||
                            "Não disponível"}
                        </small>
                      </Card.Text>
                    )}

                    <ButtonGroup aria-label="Ações" className="mb-3 w-100 gap-2">
                      <Button
                        variant={expandido ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => toggleExpandir(pedido.id)}
                        style={{ flexGrow: 1 }}
                      >
                        {expandido ? (
                          <>
                            Ocultar Itens <FaChevronUp className="ms-1" />
                          </>
                        ) : (
                          <>
                            Mostrar Itens <FaChevronDown className="ms-1" />
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => excluirPedido(pedido.id)}
                        style={{ flexGrow: 1 }}
                      >
                        <FaTrash className="me-1" />
                        Excluir
                      </Button>
                      {!pedido.retiradaEmLoja && (
                        <Button
                          variant="outline-info"
                          size="sm"
                          onClick={() => abrirMapa(pedido)}
                          style={{ flexGrow: 1 }}
                        >
                          <FaMapMarkerAlt className="me-1" />
                          Ver Entrega
                        </Button>
                      )}
                    </ButtonGroup>

                    <div
                      style={{
                        maxHeight: expandido ? "1000px" : 0,
                        overflow: "hidden",
                        transition: "max-height 0.4s ease",
                      }}
                    >
                      {expandido && (
                        <ListGroup variant="flush" className="border rounded p-3">
                          {(pedido.itens || []).map((item, i) => (
                            <ListGroup.Item
                              key={i}
                              className="py-2 d-flex justify-content-between align-items-center"
                            >
                              <div>{(item.qtd || item.quantidade || 1)}x {item.nome}</div>
                              <div>
                                R$
                                {(Number(item.preco) * (item.qtd || item.quantidade || 1))
                                  .toFixed(2)
                                  .replace(".", ",")}
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={mapaAberto} onHide={() => setMapaAberto(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Simulação de Entrega</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ height: "400px" }}>
          {pedidoSelecionado && (
            <MapContainer center={posicaoInicial} zoom={13} style={{ height: "100%", width: "100%" }}>
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
