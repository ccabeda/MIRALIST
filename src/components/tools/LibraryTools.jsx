import React, { useEffect, useRef, useState } from 'react';
import Statistics from './Statistics.jsx';
import RandomPick from './RandomPick.jsx';
import Backup from './Backup.jsx';

export default function LibraryTools(props) {
  const [tool, setTool] = useState(null);
  const dialog = useRef(null);
  useEffect(() => {
    if (tool) dialog.current?.showModal();
  }, [tool]);
  function close() {
    dialog.current?.close();
    setTool(null);
  }
  const names = {
    random: '¿Qué miro hoy?',
    stats: 'Mis estadísticas',
    backup: 'Copia de seguridad',
  };
  return (
    <>
      <div className="library-tool-buttons" aria-label="Herramientas de biblioteca">
        {Object.entries(names).map(([key, label]) => (
          <button key={key} className="btn btn-outline-light" onClick={() => setTool(key)}>
            {label}
          </button>
        ))}
      </div>
      <dialog
        className="detail-dialog tools-dialog"
        ref={dialog}
        aria-labelledby="tools-title"
        onCancel={() => setTool(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        {tool && (
          <>
            <button className="close-dialog" aria-label="Cerrar herramienta" onClick={close}>
              ×
            </button>
            <span className="eyebrow">TU ESPACIO PERSONAL</span>
            <h2 id="tools-title">{names[tool]}</h2>
            {tool === 'stats' ? (
              <Statistics {...props} />
            ) : tool === 'random' ? (
              <RandomPick
                {...props}
                onOpen={(title) => {
                  close();
                  props.onOpen(title);
                }}
              />
            ) : (
              <Backup {...props} />
            )}
          </>
        )}
      </dialog>
    </>
  );
}
