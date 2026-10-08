import useLibraryFilters from '../../hooks/useLibraryFilters.js';
import FolderEditor from './FolderEditor.jsx';
import LibraryFilters from './LibraryFilters.jsx';
import FolderGrid from './FolderGrid.jsx';
import FolderIcon from '../ui/FolderIcon.jsx';
import React, { useState } from 'react';
import LibraryCard from './LibraryCard.jsx';
import useLibrarySelection from '../../hooks/useLibrarySelection.js';
import useFolderOrdering from '../../hooks/useFolderOrdering.js';
import BulkActions from './BulkActions.jsx';

export default function LibraryView({
  library,
  titles,
  folders,
  setFolders,
  onOpen,
  onExplore,
  notify,
  onRemoveFolder,
  onBulkStatus,
  onBulkFolders,
}) {
  const selectionControls = useLibrarySelection(library);
  const { selecting, selectedIds, setSelection, setSelecting } = selectionControls;
  const filters = useLibraryFilters({ library, titles, folders, selecting });
  const {
    view,
    query,
    setQuery,
    savedTitles,
    activeFolder,
    folderOverview,
    canOrder,
    visibleTitles,
    visibleFolders,
    resetFilters,
    section,
    sectionCounts,
    scopedFolders,
  } = filters;
  const ordering = useFolderOrdering({ canOrder, activeFolder, setFolders, notify });
  function changeView(next) {
    ordering.reset();
    selectionControls.reset();
    filters.changeView(next);
  }
  function openFolder(folder) {
    ordering.reset();
    selectionControls.reset();
    filters.openFolder(folder);
  }
  const [editor, setEditor] = useState(null);

  function editFolder(folder = null) {
    setEditor(folders.find((item) => item.id === folder?.id) || { id: null });
  }
  return (
    <section className="library-view" aria-labelledby="library-title">
      <div className="library-heading">
        <div>
          <span className="eyebrow">TUS HISTORIAS, A TU MANERA</span>
          <h1 id="library-title">
            Mi biblioteca<span>.</span>
          </h1>
          <p>
            {section === 'anime'
              ? 'Tus animes, películas de anime, OVAs y ONAs.'
              : 'Tus series y películas, en su propio espacio.'}
          </p>
        </div>
        <button className="btn btn-accent new-folder" onClick={() => editFolder()}>
          <FolderIcon /> Nueva carpeta
        </button>
      </div>
      <nav className="library-tabs library-sections" aria-label="Elegir biblioteca">
        {[
          ['anime', 'Anime'],
          ['screen', 'Series y películas'],
        ].map(([value, label]) => (
          <button
            key={value}
            aria-pressed={section === value}
            onClick={() => {
              selectionControls.reset();
              ordering.reset();
              filters.changeSection(value);
            }}
          >
            {label} <small>{sectionCounts[value]}</small>
          </button>
        ))}
      </nav>
      <nav className="library-tabs" aria-label="Vistas de biblioteca">
        <button aria-pressed={view === 'all'} onClick={() => changeView('all')}>
          <span aria-hidden="true">▦</span> Todos <small>{savedTitles.length}</small>
        </button>
        <button aria-pressed={view === 'folders'} onClick={() => changeView('folders')}>
          <FolderIcon /> Carpetas <small>{scopedFolders.length}</small>
        </button>
      </nav>
      {activeFolder && (
        <div className="folder-heading">
          <div>
            <button className="folder-back" onClick={() => changeView('folders')}>
              ← Todas las carpetas
            </button>
            <h2>
              <FolderIcon />
              {activeFolder.name}
            </h2>
            <p>
              {activeFolder.titleIds.length}{' '}
              {activeFolder.titleIds.length === 1 ? 'título' : 'títulos'} · También disponibles en
              Todos
            </p>
          </div>
          <button className="btn btn-outline-light" onClick={() => editFolder(activeFolder)}>
            Editar carpeta
          </button>
        </div>
      )}
      <LibraryFilters {...filters} />
      {activeFolder && (
        <p className="order-help">
          {canOrder
            ? 'Arrastrá desde el asa o usá las flechas para ordenar esta carpeta.'
            : 'Para mover obras, elegí Orden de carpeta, limpiá los filtros y salí de la selección.'}
        </p>
      )}
      {!folderOverview && (
        <div className="bulk-toggle">
          <button
            className="btn btn-outline-light"
            aria-pressed={selecting}
            onClick={() => {
              setSelecting(!selecting);
              setSelection([]);
            }}
          >
            {selecting ? 'Cancelar selección' : 'Seleccionar varias'}
          </button>
        </div>
      )}
      {selecting && !folderOverview && (
        <BulkActions
          selected={selectedIds}
          visibleIds={visibleTitles.map((t) => t.id)}
          setSelected={setSelection}
          folders={folders}
          onStatus={onBulkStatus}
          onFolders={onBulkFolders}
          onDone={() => {
            setSelecting(false);
            setSelection([]);
          }}
        />
      )}
      {folderOverview ? (
        <FolderGrid
          query={query}
          visibleFolders={visibleFolders}
          savedTitles={savedTitles}
          editFolder={editFolder}
          openFolder={openFolder}
          setQuery={setQuery}
        />
      ) : (
        <>
          <div className="library-results">
            <span>
              {visibleTitles.length}{' '}
              {visibleTitles.length === 1 ? 'título guardado' : 'títulos guardados'}
            </span>
            {!activeFolder && <small>Organizalos en carpetas sin sacarlos de acá.</small>}
          </div>
          <div className="poster-grid">
            {visibleTitles.map((title) => (
              <LibraryCard
                key={title.id}
                title={title}
                library={library}
                onOpen={onOpen}
                activeFolder={activeFolder}
                canOrder={canOrder}
                {...selectionControls}
                {...ordering}
              />
            ))}
          </div>
          {!visibleTitles.length && (
            <div className="empty-state">
              <FolderIcon />
              <h3>
                {activeFolder && !activeFolder.titleIds.length
                  ? 'Esta carpeta está esperando historias'
                  : !savedTitles.length
                    ? 'Tu biblioteca empieza con una historia'
                    : 'No encontramos títulos con estos filtros'}
              </h3>
              <p>
                {activeFolder && !activeFolder.titleIds.length
                  ? 'Elegí títulos de tu biblioteca para reunirlos acá.'
                  : !savedTitles.length
                    ? 'Explorá el catálogo y guardá lo que quieras ver.'
                    : 'Probá otra búsqueda o cambiá los filtros.'}
              </p>
              <button
                className="btn btn-accent"
                onClick={
                  activeFolder && !activeFolder.titleIds.length
                    ? () => editFolder(activeFolder)
                    : !savedTitles.length
                      ? () => onExplore(section)
                      : resetFilters
                }
              >
                {activeFolder && !activeFolder.titleIds.length
                  ? 'Agregar títulos'
                  : !savedTitles.length
                    ? 'Explorar catálogo'
                    : 'Limpiar filtros'}
              </button>
            </div>
          )}
        </>
      )}
      {editor && (
        <FolderEditor
          key={editor.id || 'new'}
          editor={editor}
          folders={folders}
          library={library}
          savedTitles={savedTitles}
          setFolders={setFolders}
          notify={notify}
          onClose={() => setEditor(null)}
          onSaved={(folder) => {
            setEditor(null);
            openFolder(folder);
          }}
          onDelete={(folder) => {
            onRemoveFolder(folder);
            setEditor(null);
            changeView('folders');
          }}
        />
      )}
    </section>
  );
}
