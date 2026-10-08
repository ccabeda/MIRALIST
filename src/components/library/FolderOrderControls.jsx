import React from 'react';

export default function FolderOrderControls({
  title,
  index,
  count,
  onMove,
  onDragStart,
  onDragEnd,
}) {
  return (
    <div className="folder-order-controls">
      <button
        className="order-handle"
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        aria-label={`Arrastrar ${title.title}, posición ${index + 1} de ${count}`}
        title="Arrastrá para ordenar. También podés usar las flechas del teclado."
        onKeyDown={(event) => {
          const destination = {
            ArrowLeft: index - 1,
            ArrowUp: index - 1,
            ArrowRight: index + 1,
            ArrowDown: index + 1,
            Home: 0,
            End: count - 1,
          }[event.key];
          if (destination !== undefined) {
            event.preventDefault();
            if (destination >= 0 && destination < count) onMove(destination);
          }
        }}
      >
        <span aria-hidden="true">⠿</span>
        <span>{index + 1}</span>
      </button>
      <div>
        <button
          aria-label={`Mover ${title.title} antes`}
          disabled={index === 0}
          onClick={() => onMove(index - 1)}
        >
          ←
        </button>
        <button
          aria-label={`Mover ${title.title} después`}
          disabled={index === count - 1}
          onClick={() => onMove(index + 1)}
        >
          →
        </button>
      </div>
    </div>
  );
}
