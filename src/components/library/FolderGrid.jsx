import React from 'react';
import FolderIcon from '../ui/FolderIcon.jsx';
export default function FolderGrid({
  query,
  visibleFolders,
  savedTitles,
  editFolder,
  openFolder,
  setQuery,
}) {
  return (
    <>
      <div className="folder-grid">
        {!query && (
          <button className="folder-create-card" onClick={() => editFolder()}>
            <span className="folder-plus">+</span>
            <strong>Una carpeta, un universo</strong>
            <small>Dragon Ball, favoritas, para el finde…</small>
            <span>Crear carpeta ↗</span>
          </button>
        )}
        {visibleFolders.map((folder) => {
          const preview = folder.titleIds
            .map((id) => savedTitles.find((title) => title.id === id))
            .filter(Boolean)
            .slice(0, 4);
          return (
            <button
              className="folder-card"
              key={folder.id}
              onClick={() => openFolder(folder)}
              aria-label={`Abrir carpeta ${folder.name}`}
            >
              <div className={`folder-mosaic ${preview.length === 1 ? 'single-cover' : ''}`}>
                {Array.from({ length: 4 }, (_, index) => {
                  const title = preview[index];
                  return (
                    <div
                      key={index}
                      className="mosaic-tile"
                      style={title ? { '--tile-color': title.color } : undefined}
                    >
                      {title ? (
                        title.cover ? (
                          <img
                            src={title.cover}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span>{title.title}</span>
                        )
                      ) : (
                        <FolderIcon />
                      )}
                    </div>
                  );
                })}
                <span className="folder-badge">
                  <FolderIcon />
                </span>
              </div>
              <div className="folder-card-caption">
                <div>
                  <strong>{folder.name}</strong>
                  <small>
                    {folder.titleIds.length} {folder.titleIds.length === 1 ? 'título' : 'títulos'}
                  </small>
                </div>
                <span aria-hidden="true">↗</span>
              </div>
            </button>
          );
        })}
      </div>
      {!visibleFolders.length && query && (
        <div className="empty-state">
          <h3>No encontramos esa carpeta</h3>
          <button className="btn btn-outline-light" onClick={() => setQuery('')}>
            Limpiar búsqueda
          </button>
        </div>
      )}
    </>
  );
}
