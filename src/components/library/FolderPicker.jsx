import React, { useEffect, useRef, useState } from 'react';
import { addTitleToFolders, validateFolderName } from '../../domain/folders.js';

export default function FolderPicker({ title, folders, setFolders, onClose, notify }) {
  const dialog = useRef(null);
  const [chosen, setChosen] = useState([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function close() {
    dialog.current?.close();
    onClose();
  }
  function saveExisting() {
    setFolders((current) => addTitleToFolders(current, title.id, chosen));
    notify(
      chosen.length === 1
        ? 'Título guardado también en la carpeta'
        : 'Título guardado también en las carpetas',
    );
    close();
  }
  function createFolder(event) {
    event.preventDefault();
    const validation = validateFolderName(name, folders);
    if (validation) {
      setError(validation);
      return;
    }
    const folder = { id: crypto.randomUUID(), name: name.trim(), titleIds: [title.id] };
    setFolders((current) => [...addTitleToFolders(current, title.id, chosen), folder]);
    notify(
      `Título guardado en «${folder.name}»${chosen.length ? ' y en las carpetas seleccionadas' : ''}`,
    );
    close();
  }
  return (
    <dialog
      ref={dialog}
      className="detail-dialog favorite-folder-picker"
      aria-labelledby="favorite-folder-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <button className="close-dialog" aria-label="Cerrar opción de carpetas" onClick={close}>
        ×
      </button>
      <span className="favorite-saved-badge">TU COLECCIÓN</span>
      <h2 id="favorite-folder-title">Guardar en carpetas</h2>
      <p>
        <strong>{title.title}</strong> · Organizalo en una o varias carpetas.
      </p>
      <div className="favorite-folder-options" aria-label="Carpetas disponibles">
        {folders.map((folder) => {
          const alreadySaved = folder.titleIds.includes(title.id);
          return (
            <label
              className={`favorite-folder-option ${alreadySaved ? 'already-saved' : ''}`}
              key={folder.id}
            >
              <input
                type="checkbox"
                disabled={alreadySaved}
                checked={alreadySaved || chosen.includes(folder.id)}
                onChange={(event) =>
                  setChosen((current) =>
                    event.target.checked
                      ? [...current, folder.id]
                      : current.filter((id) => id !== folder.id),
                  )
                }
              />
              <span className="favorite-folder-symbol" aria-hidden="true">
                ▱
              </span>
              <span>
                <strong>{folder.name}</strong>
                <small>
                  {alreadySaved
                    ? 'Ya guardado acá'
                    : `${folder.titleIds.length} ${folder.titleIds.length === 1 ? 'título' : 'títulos'}`}
                </small>
              </span>
            </label>
          );
        })}
      </div>
      {!folders.length && (
        <div className="favorite-folder-empty">
          Todavía no tenés carpetas. Creá una para empezar a organizar tu biblioteca.
        </div>
      )}
      {creating ? (
        <form className="favorite-new-folder" onSubmit={createFolder}>
          <label htmlFor="favorite-folder-name">Nombre de la nueva carpeta</label>
          <input
            id="favorite-folder-name"
            className="form-control"
            maxLength="60"
            placeholder="Por ejemplo: Dragon Ball"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'favorite-folder-error' : undefined}
          />
          {error && (
            <p id="favorite-folder-error" className="folder-error" role="alert">
              {error}
            </p>
          )}
          <div className="favorite-create-actions">
            <button type="submit" className="btn btn-accent">
              Crear y guardar
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCreating(false);
                setError('');
              }}
            >
              Cancelar creación
            </button>
          </div>
        </form>
      ) : (
        <button className="favorite-create-button" onClick={() => setCreating(true)}>
          + Crear nueva carpeta
        </button>
      )}
      <div className="favorite-picker-actions">
        {!creating && (
          <button className="btn btn-accent" disabled={!chosen.length} onClick={saveExisting}>
            Guardar en {chosen.length === 1 ? 'carpeta' : 'carpetas'}
            {chosen.length > 0 ? ` (${chosen.length})` : ''}
          </button>
        )}
        <button className="btn btn-outline-light" onClick={close}>
          Ahora no
        </button>
      </div>
      <small className="favorite-picker-note">
        Cerrar esta opción conserva la obra y las carpetas que ya tenía.
      </small>
    </dialog>
  );
}
