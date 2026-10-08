import RemoteCatalog from '../components/catalog/RemoteCatalog.jsx';
import HomeDiscovery from '../components/home/HomeDiscovery.jsx';
import ContinueWatching from '../components/home/ContinueWatching.jsx';
import Hero from '../components/home/Hero.jsx';
import Sidebar from '../components/layout/Sidebar.jsx';
import useTheme from '../hooks/useTheme.js';
import useLibrary from '../hooks/useLibrary.js';
import React, { useCallback, useEffect, useState } from 'react';
import { mergeCatalog } from '../domain/catalog-registry.js';
import TitleDialog from '../components/catalog/TitleDialog.jsx';
import CollectionNotices from '../components/layout/CollectionNotices.jsx';
import LibraryView from '../components/library/LibraryView.jsx';
import FolderPicker from '../components/library/FolderPicker.jsx';
import LibraryTools from '../components/tools/LibraryTools.jsx';
import { canonicalTitle } from '../domain/organization.js';
import CatalogCredits from '../components/layout/CatalogCredits.jsx';
import Notifications from '../components/layout/Notifications.jsx';
import AccountControls from '../components/layout/AccountControls.jsx';
import ReleaseCalendar from '../components/home/ReleaseCalendar.jsx';

export default function App() {
  const [theme, setTheme] = useTheme();
  const [section, setSection] = useState('Inicio');
  const [availableTitles, setAvailableTitles] = useState([]);
  const registerTitles = useCallback(
    (items) => setAvailableTitles((current) => mergeCatalog(current, items)),
    [],
  );
  const [detail, setDetail] = useState(null);
  const selected = detail?.title ?? null;
  function openTitle(title) {
    const known = canonicalTitle(title, titles);
    if (!known) registerTitles([title]);
    setDetail({ title: known || title, mode: 'info' });
  }
  const [notice, setNotice] = useState('');
  const [folderTarget, setFolderTarget] = useState(null);
  const {
    titles,
    library,
    folders,
    setFolders,
    suggestion,
    setSuggestion,
    undo,
    clearUndo,
    ensureSaved,
    save,
    acceptDate,
    removeTitle: removeFromLibrary,
    removeFolder,
    restoreLast,
    toggleFavorite,
    changeManyStatuses,
    changeManyFolders,
    importCollection,
  } = useLibrary({
    titles: availableTitles,
    notify: setNotice,
    onDuplicate: openTitle,
  });
  function removeTitle(title) {
    removeFromLibrary(title);
    setDetail(null);
  }
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  function navigate(value) {
    setSection(value);
  }
  function openFolders(title) {
    const result = ensureSaved(title);
    if (result) setFolderTarget(result.title);
  }
  function add(title) {
    const result = ensureSaved(title);
    if (!result) return;
    setDetail({ title: result.title, mode: 'edit' });
    setNotice(
      result.alreadySaved
        ? `Ya tenés ${result.title.title} en tu biblioteca`
        : `${result.title.title} se agregó a tu biblioteca`,
    );
  }
  const watching = titles.filter((t) => library[t.id]?.status === 'Viendo');
  return (
    <div className="app-shell">
      <Sidebar section={section} navigate={navigate} library={library}>
        <Notifications titles={titles} library={library} openTitle={openTitle} />
        <AccountControls theme={theme} setTheme={setTheme} library={library} />
      </Sidebar>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Tu espacio <span>/</span> <b>{section}</b>
          </div>
          <div className="topbar-actions">
            <span className="demo-pill">
              <i /> BIBLIOTECA LOCAL
            </span>
          </div>
        </header>
        <div className="page-content">
          {section === 'Inicio' && (
            <Hero navigate={navigate} titles={titles.filter((title) => library[title.id])} />
          )}
          <div className="demo-banner">
            <span>✧</span> Explorá nuevas historias. Tu biblioteca se guarda en este navegador;
            podés exportarla desde Copia de seguridad.
          </div>
          {section === 'Inicio' && (
            <ContinueWatching
              library={library}
              watching={watching}
              navigate={navigate}
              openTitle={openTitle}
            />
          )}
          {(section === 'Inicio' || section === 'Mi biblioteca') && (
            <LibraryTools
              titles={titles}
              library={library}
              folders={folders}
              onOpen={openTitle}
              onImport={importCollection}
              notify={setNotice}
            />
          )}
          {section === 'Mi biblioteca' && (
            <LibraryView
              library={library}
              titles={titles}
              folders={folders}
              setFolders={setFolders}
              onOpen={openTitle}
              onExplore={(section) => navigate(section === 'screen' ? 'Series' : 'Anime')}
              notify={setNotice}
              onRemoveFolder={removeFolder}
              onBulkStatus={changeManyStatuses}
              onBulkFolders={changeManyFolders}
            />
          )}
          {section === 'Inicio' && (
            <HomeDiscovery
              titles={titles}
              onTitles={registerTitles}
              library={library}
              openTitle={openTitle}
              add={add}
            />
          )}
          {section === 'Calendario' && (
            <ReleaseCalendar titles={titles} library={library} openTitle={openTitle} />
          )}
          {section !== 'Mi biblioteca' && section !== 'Calendario' && (
            <RemoteCatalog
              key={section}
              section={section}
              titles={titles}
              onTitles={registerTitles}
              library={library}
              openTitle={openTitle}
              add={add}
            />
          )}
          <CatalogCredits />
          <footer>
            <span className="footer-brand">MiráList.</span>
            <span>Hecho para quienes siempre tienen algo más por ver.</span>
            <small>
              Anime:{' '}
              <a href="https://myanimelist.net" target="_blank" rel="noreferrer">
                MyAnimeList
              </a>{' '}
              · Series y películas:{' '}
              <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
                TMDB
              </a>
            </small>
          </footer>
        </div>
      </main>
      <TitleDialog
        onTitles={registerTitles}
        selected={selected}
        mode={detail?.mode}
        titles={titles}
        library={library}
        suggestion={suggestion}
        openTitle={openTitle}
        add={add}
        openFolders={openFolders}
        toggleFavorite={toggleFavorite}
        save={save}
        acceptDate={acceptDate}
        onDismissDate={() => setSuggestion(null)}
        removeTitle={removeTitle}
        onClose={() => setDetail(null)}
        onModeChange={(mode) => setDetail((current) => (current ? { ...current, mode } : null))}
      />
      {folderTarget && (
        <FolderPicker
          key={folderTarget.id}
          title={folderTarget}
          folders={folders}
          setFolders={setFolders}
          onClose={() => setFolderTarget(null)}
          notify={setNotice}
        />
      )}
      <CollectionNotices
        undo={undo}
        restoreLast={restoreLast}
        onDismissUndo={clearUndo}
        suggestion={suggestion}
        selected={selected}
        titles={titles}
        acceptDate={acceptDate}
        onDismissDate={() => setSuggestion(null)}
        notice={notice}
      />
    </div>
  );
}
