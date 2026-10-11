import React, { useState } from 'react';

export default function ResetProgress({ entry, onSave }) {
  const [confirming, setConfirming] = useState(false);
  if (!entry.progress) return null;
  return (
    <div className="progress-reset">
      {confirming ? (
        <>
          <p>
            ¿Reiniciar el progreso? Los capítulos vistos quedarán en cero y el estado será
            Pendiente. Se conservan tus fechas, notas y puntuación.
          </p>
          <button
            type="button"
            className="remove-button"
            onClick={() => {
              onSave({ status: 'Pendiente', progress: 0 });
              setConfirming(false);
            }}
          >
            Sí, reiniciar progreso
          </button>
          <button type="button" className="text-button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="text-button" onClick={() => setConfirming(true)}>
          Reiniciar progreso
        </button>
      )}
    </div>
  );
}
