import React, { useState } from 'react';
import Hero from '../components/home/Hero.jsx';
import ContinueWatching from '../components/home/ContinueWatching.jsx';
import HomeDiscovery from '../components/home/HomeDiscovery.jsx';
import ReleaseCalendar from '../components/home/ReleaseCalendar.jsx';
import RemoteCatalog from '../components/catalog/RemoteCatalog.jsx';
import LibraryTools from '../components/tools/LibraryTools.jsx';
import LibraryView from '../components/library/LibraryView.jsx';
import LibrarySync from '../components/layout/LibrarySync.jsx';
import CatalogCredits from '../components/layout/CatalogCredits.jsx';

export default function LibraryContent({ auth, workspace }) {
  const [catalogQueries, setCatalogQueries] = useState({});
  const {
    section,
    navigate,
    titles,
    library,
    watching,
    folders,
    registerTitles,
    openTitle,
    importCollection,
    setNotice,
    setFolders,
    removeFolder,
    changeManyStatuses,
    changeManyFolders,
    add,
    sync,
  } = workspace;
  return (
    <div className="page-content">
      {auth.message && (
        <div className="library-sync" role="status">
          {auth.message}{' '}
          <button className="text-button" onClick={auth.clearMessage}>
            Entendido
          </button>
        </div>
      )}
      {auth.user && <LibrarySync sync={sync} />}
      {sync.ready && (
        <>
          {section === 'Inicio' && (
            <Hero navigate={navigate} titles={titles.filter((title) => library[title.id])} />
          )}
          {auth.user && section === 'Inicio' && (
            <ContinueWatching
              library={library}
              watching={watching}
              navigate={navigate}
              openTitle={openTitle}
            />
          )}
          {auth.user && (section === 'Inicio' || section === 'Mi biblioteca') && (
            <LibraryTools
              titles={titles}
              library={library}
              folders={folders}
              onOpen={openTitle}
              onImport={importCollection}
              notify={setNotice}
            />
          )}
          {auth.user && section === 'Mi biblioteca' && (
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
          {auth.user && section === 'Inicio' && (
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
          {['Anime', 'Series', 'Películas'].includes(section) && (
            <RemoteCatalog
              key={section}
              section={section}
              query={catalogQueries[section] || ''}
              setQuery={(query) =>
                setCatalogQueries((current) => ({ ...current, [section]: query }))
              }
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
        </>
      )}
    </div>
  );
}
