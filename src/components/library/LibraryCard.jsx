import React from 'react';
import MediaCard from '../catalog/MediaCard.jsx';
import FolderOrderControls from './FolderOrderControls.jsx';

export default function LibraryCard({
  title,
  library,
  onOpen,
  selecting,
  selectedIds,
  setSelection,
  activeFolder,
  canOrder,
  draggedId,
  dropId,
  setDraggedId,
  setDropId,
  reorder,
}) {
  return (
    <div
      data-order-id={title.id}
      className={[
        selecting && 'selectable-card',
        selecting && selectedIds.includes(title.id) && 'selected',
        canOrder && 'orderable-card',
        draggedId === title.id && 'dragging',
        dropId === title.id && 'drop-target',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragOver={(event) => {
        if (canOrder && draggedId) {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setDropId(title.id);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (canOrder && draggedId) reorder(draggedId, title.id);
        setDraggedId(null);
        setDropId(null);
      }}
    >
      {canOrder && (
        <FolderOrderControls
          title={title}
          index={activeFolder.titleIds.indexOf(title.id)}
          count={activeFolder.titleIds.length}
          onMove={(index) => reorder(title.id, activeFolder.titleIds[index])}
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', title.id);
            setDraggedId(title.id);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setDropId(null);
          }}
        />
      )}
      {selecting && (
        <label className="selection-label">
          <input
            type="checkbox"
            aria-label={`Seleccionar ${title.title}`}
            checked={selectedIds.includes(title.id)}
            onChange={(event) =>
              setSelection((current) =>
                event.target.checked
                  ? [...new Set([...current, title.id])]
                  : current.filter((id) => id !== title.id),
              )
            }
          />
          Seleccionar
        </label>
      )}
      <MediaCard title={title} entry={library[title.id]} onOpen={onOpen} />
    </div>
  );
}
