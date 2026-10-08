import React, { useState } from 'react';
import { statuses } from '../../domain/library.js';

export default function BulkActions({
  selected,
  visibleIds,
  setSelected,
  folders,
  onStatus,
  onFolders,
  onDone,
}) {
  const [status, setStatus] = useState('Viendo');
  const [destination, setDestination] = useState('');
  const [move, setMove] = useState(false);
  const hidden = selected.filter((id) => !visibleIds.includes(id)).length;
  const validDestination = folders.some((folder) => folder.id === destination);
  return (
    <div className="bulk-actions" aria-label="Acciones para obras seleccionadas">
      <div className="bulk-summary">
        <strong>
          {selected.length} seleccionadas{hidden ? ` (${hidden} fuera de estos filtros)` : ''}
        </strong>
        <button
          className="text-button"
          disabled={!visibleIds.length}
          onClick={() => setSelected((current) => [...new Set([...current, ...visibleIds])])}
        >
          Seleccionar visibles
        </button>
        <button className="text-button" onClick={() => setSelected([])}>
          Limpiar selección
        </button>
        <button className="text-button" onClick={onDone}>
          Salir
        </button>
      </div>
      <div className="bulk-row">
        <label>
          Nuevo estado
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          className="btn btn-accent"
          disabled={!selected.length}
          onClick={() => {
            onStatus(selected, status);
            setSelected([]);
          }}
        >
          Aplicar estado
        </button>
      </div>
      <div className="bulk-row">
        <label>
          Carpeta de destino
          <select
            className="form-select"
            value={validDestination ? destination : ''}
            onChange={(e) => setDestination(e.target.value)}
          >
            <option value="">Elegí una carpeta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Acción
          <select
            className="form-select"
            value={move ? 'move' : 'add'}
            onChange={(e) => setMove(e.target.value === 'move')}
          >
            <option value="add">Agregar a la carpeta</option>
            <option value="move">Mover: quitar de otras carpetas</option>
          </select>
        </label>
        <button
          className="btn btn-outline-light"
          disabled={!selected.length || !validDestination}
          onClick={() => {
            onFolders(selected, destination, move);
            setSelected([]);
          }}
        >
          Aplicar carpeta
        </button>
      </div>
      <p className="tools-help">
        Completado marca todos los capítulos; Pendiente los deja en cero. Las fechas existentes se
        conservan. Mover nunca quita obras de Todos.
      </p>
      {!folders.length && (
        <p className="tools-help">
          Creá una carpeta con «Nueva carpeta» para organizar la selección.
        </p>
      )}
    </div>
  );
}
