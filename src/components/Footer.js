import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-light text-center py-3 mt-auto shadow-sm" style={{position: 'fixed', width: '100%', bottom: 0, left: 0, zIndex: 99}}>
      <div className="container">
        <span className="text-muted">&copy; {new Date().getFullYear()} LIGHTHAND. Todos os direitos reservados.</span>
      </div>
    </footer>
  );
}
