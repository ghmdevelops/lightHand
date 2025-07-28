import React from 'react';
import MercadosProximos from './MercadosProximos';

export default function Home({ user, onLogout }) {
  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between mb-3">
      </div>
      <MercadosProximos user={user}/>
    </div>
  );
}
