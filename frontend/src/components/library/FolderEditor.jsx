import React, { useEffect, useRef, useState } from 'react';
import { validateFolderName } from '../../domain/folders.js';
import { matchesTitle } from '../../domain/organization.js';

export default function FolderEditor({
  editor,
  folders,
  library,
  savedTitles,
  setFolders,
  notify,
  onSaved,
  onClose,
  onDelete,
}) {
  const [name, setName] = useState(editor.name || '');
  const [chosen, setChosen] = useState(editor.titleIds || []);
  const [selectionQuery, setSelectionQuery] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  const choices = savedTitles.filter((title) => matchesTitle(title, selectionQuery));
  const selectedHere = savedTitles.filter((title) => chosen.includes(title.id)).length;
  const selectedElsewhere = chosen.length - selectedHere;
  function closeEditor() {
    dialogRef.current?.close();
    onClose();
  }
  function saveFolder(event) {
    event.preventDefault();
    const validation = validateFolderName(name, folders, editor.id);
    if (validation) {
      setError(validation);
      return;
    }
    const folder = {
      id: editor.id || crypto.randomUUID(),
      name: name.trim(),
      titleIds: chosen.filter((id) => Object.hasOwn(library, id)),
    };
    setFolders((current) =>
      editor.id
        ? current.map((item) => (item.id === editor.id ? folder : item))
        : [...current, folder],
    );
    onSaved(folder);
    notify(editor.id ? 'Carpeta actualizada' : `Carpeta «${folder.name}» creada`);
  }
  function deleteFolder() {
    onDelete(editor);
  }

  return (
    <dialog
      className="detail-dialog folder-editor"
      ref={dialogRef}
      aria-labelledby="folder-editor-title"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeEditor();
      }}
    >
      {editor && (
        <form onSubmit={saveFolder}>
          <button
            type="button"
            className="close-dialog"
            aria-label="Cerrar editor de carpeta"
            onClick={closeEditor}
          >
            ×
          </button>
          <span className="eyebrow">DALE UN LUGAR A CADA HISTORIA</span>
          <h2 id="folder-editor-title">{editor.id ? 'Editar carpeta' : 'Nueva carpeta'}</h2>
          <p>Reuní títulos de esta biblioteca. Cada título puede estar en varias carpetas.</p>
          {selectedElsewhere > 0 && (
            <p>
              Esta carpeta también contiene {selectedElsewhere} títulos de la otra biblioteca. Se
              conservan al guardar; el nombre y la eliminación de la carpeta se comparten.
            </p>
          )}
          <label className="folder-name-label" htmlFor="folder-name">
            Nombre de la carpeta
          </label>
          <input
            id="folder-name"
            className="form-control"
            autoFocus
            maxLength="60"
            placeholder="Por ejemplo: Dragon Ball"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError('');
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'folder-error' : undefined}
          />
          {error && (
            <p id="folder-error" className="folder-error" role="alert">
              {error}
            </p>
          )}
          <div className="selection-heading">
            <strong>Agregar desde tu biblioteca</strong>
            <small>
              {selectedHere} {selectedHere === 1 ? 'seleccionado' : 'seleccionados'}
            </small>
          </div>
          <input
            className="form-control"
            type="search"
            aria-label="Buscar títulos para la carpeta"
            placeholder="Buscar títulos guardados…"
            value={selectionQuery}
            onChange={(event) => setSelectionQuery(event.target.value)}
          />
          <div className="folder-choice-list">
            {choices.map((title) => (
              <label className="folder-choice" key={title.id}>
                <input
                  type="checkbox"
                  checked={chosen.includes(title.id)}
                  onChange={(event) =>
                    setChosen((current) =>
                      event.target.checked
                        ? [...current, title.id]
                        : current.filter((id) => id !== title.id),
                    )
                  }
                />
                <span className="choice-cover" style={{ '--tile-color': title.color }}>
                  {title.cover ? (
                    <img src={title.cover} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  ) : (
                    <span aria-hidden="true">{title.mark}</span>
                  )}
                </span>
                <span>
                  <strong>{title.title}</strong>
                  <small>
                    {title.category} · {title.format} · {title.year}
                  </small>
                </span>
              </label>
            ))}
            {!choices.length && (
              <p className="selection-empty">
                {savedTitles.length
                  ? 'No hay coincidencias en tu biblioteca.'
                  : 'Todavía no guardaste títulos. Podés crear la carpeta vacía y agregar obras después.'}
              </p>
            )}
          </div>
          <div className="folder-editor-footer">
            <button className="btn btn-accent" type="submit">
              {editor.id ? 'Guardar cambios' : 'Crear carpeta'}
            </button>
            <button className="text-button" type="button" onClick={closeEditor}>
              Cancelar
            </button>
          </div>
          {editor.id && (
            <div className="folder-delete">
              {confirmDelete ? (
                <>
                  <p>¿Eliminar esta carpeta? Sus títulos y tu progreso se conservan en Todos.</p>
                  <button className="remove-button" type="button" onClick={deleteFolder}>
                    Sí, eliminar carpeta
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Conservar
                  </button>
                </>
              ) : (
                <button
                  className="remove-button"
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                >
                  Eliminar carpeta
                </button>
              )}
            </div>
          )}
        </form>
      )}
    </dialog>
  );
}
