import React from 'react';
import MercadosProximos from './MercadosProximos';

export default function Home({ user, onLogout }) {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
        <h3>Olá, {user.email}</h3>
      </div>
      <MercadosProximos user={user}/>
    </div>
  );
}
