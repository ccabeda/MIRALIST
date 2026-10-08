import React from 'react';

export default function CollectionNotices({
  undo,
  restoreLast,
  onDismissUndo,
  suggestion,
  selected,
  titles,
  acceptDate,
  onDismissDate,
  notice,
}) {
  return (
    <>
      {' '}
      <div className="collection-notices">
        {undo && (
          <div className="undo-notice" role="status">
            <span>
              {undo.kind === 'bulk'
                ? undo.label
                : `${undo.kind === 'title' ? undo.title.title : undo.folder.name} · ${undo.kind === 'title' ? 'obra eliminada' : 'carpeta eliminada'}`}
            </span>
            <button className="text-button" onClick={restoreLast}>
              Deshacer
            </button>
            <button
              className="text-button"
              aria-label="Cerrar aviso para deshacer"
              onClick={() => onDismissUndo()}
            >
              ×
            </button>
          </div>
        )}
        {suggestion && !selected && (
          <div className="date-suggestion" role="status">
            <span>
              {titles.find((title) => title.id === suggestion.id)?.title}:{' '}
              {suggestion.field === 'watchedDate'
                ? '¿la viste hoy?'
                : suggestion.field === 'startDate'
                  ? '¿la empezaste hoy?'
                  : '¿la terminaste hoy?'}
            </span>
            <button className="text-button" onClick={acceptDate}>
              Usar hoy
            </button>
            <button className="text-button" onClick={() => onDismissDate()}>
              Omitir
            </button>
          </div>
        )}
      </div>
      <div className={`toast-message ${notice ? 'visible' : ''}`} role="status">
        {notice}
      </div>
    </>
  );
}
