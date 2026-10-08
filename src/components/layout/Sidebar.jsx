import React from 'react';

export default function Sidebar({ section, navigate, library, children }) {
  return (
    <aside className="sidebar">
      <a
        href="#inicio"
        className="brand"
        onClick={(e) => {
          e.preventDefault();
          navigate('Inicio');
        }}
      >
        <span className="brand-icon">◉</span>MiráList<span className="brand-dot">.</span>
      </a>
      <div className="nav-caption">TU UNIVERSO EN PANTALLA</div>
      <nav aria-label="Navegación principal">
        {[
          ['Inicio', '⌂'],
          ['Anime', '✦'],
          ['Series', '▤'],
          ['Películas', '▻'],
          ['Mi biblioteca', '▥'],
          ['Calendario', '▦'],
        ].map(([name, icon]) => (
          <button
            key={name}
            className={`nav-item ${section === name ? 'active' : ''}`}
            aria-current={section === name ? 'page' : undefined}
            onClick={() => navigate(name)}
          >
            <span aria-hidden="true">{icon}</span>
            {name}
            {name === 'Mi biblioteca' && <small>{Object.keys(library).length}</small>}
          </button>
        ))}
      </nav>
      <div className="navigation-actions">{children}</div>
      <div className="sidebar-bottom">
        <div className="little-spark">✧</div>
        <strong>Cada historia cuenta.</strong>
        <p>Guardá las que te acompañan.</p>
        <div className="demo-user">
          <span>ML</span>
          <div>
            <b>Tu espacio personal</b>
            <small>Vista previa · sin cuenta</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
