import React, { useEffect, useRef } from 'react';
import TitleDetails from './TitleDetails.jsx';
import EntryEditor from '../library/EntryEditor.jsx';
import useTitleResource from '../../hooks/useTitleResource.js';

export default function TitleDialog({
  selected,
  mode,
  titles,
  library,
  suggestion,
  openTitle,
  add,
  openFolders,
  toggleFavorite,
  save,
  acceptDate,
  onDismissDate,
  removeTitle,
  onClose,
  onModeChange,
  onTitles,
}) {
  const resource = useTitleResource(selected, onTitles);
  const title = resource.title;
  const dialog = useRef(null);
  const current = selected ? library[selected.id] : null;
  useEffect(() => {
    if (selected && dialog.current) {
      dialog.current.showModal();
      dialog.current.scrollTop = 0;
      dialog.current.querySelector('.close-dialog')?.focus({ preventScroll: true });
    } else dialog.current?.close();
  }, [selected]);
  return (
    <dialog
      ref={dialog}
      className="detail-dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          dialog.current.close();
          onClose();
        }
      }}
      aria-labelledby="detail-title"
    >
      {selected && (
        <>
          <button
            className="close-dialog"
            aria-label="Cerrar ficha"
            onClick={() => {
              dialog.current.close();
              onClose();
            }}
          >
            ×
          </button>
          <TitleDetails
            key={selected.id}
            title={title}
            titles={titles}
            library={library}
            onOpen={openTitle}
            page={mode}
            onPageChange={onModeChange}
            onAdd={() => add(title)}
            onFolder={() => openFolders(title)}
            onFavorite={() => toggleFavorite(title)}
            resource={resource}
          >
            {!current ? (
              <p className="muted">
                Agregá esta obra a tu biblioteca para registrar tu seguimiento.
              </p>
            ) : (
              <EntryEditor
                key={selected.id}
                title={title}
                entry={current}
                onSave={(patch) => save(selected.id, patch)}
                suggestion={suggestion?.id === selected.id ? suggestion : null}
                onAcceptDate={acceptDate}
                onDismissDate={onDismissDate}
                onRemove={() => removeTitle(selected)}
              />
            )}
          </TitleDetails>
        </>
      )}
    </dialog>
  );
}
