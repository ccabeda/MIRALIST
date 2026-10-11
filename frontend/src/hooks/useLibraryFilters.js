import { useEffect, useState } from 'react';
import { storageKeys, readStorage, writeStorage } from '../services/storage.js';
import { parseSectionPreferences } from '../domain/library-preferences.js';
import { sortTitles } from '../domain/title-sorting.js';
import { matchesTitle } from '../domain/organization.js';
import { belongsToSection, sectionFolders } from '../domain/library-sections.js';

export default function useLibraryFilters({ library, titles, folders, selecting }) {
  const [preferences, setPreferences] = useState(() =>
    parseSectionPreferences(readStorage(storageKeys.preferences)),
  );
  const { section } = preferences;
  const { favoritesOnly, view, activeFolderId, query, status, category } =
    preferences.sections[section];
  const storedOrder = preferences.sections[section].order;
  function update(patch) {
    setPreferences((current) => ({
      ...current,
      sections: {
        ...current.sections,
        [current.section]: { ...current.sections[current.section], ...patch },
      },
    }));
  }
  const setFavoritesOnly = (favoritesOnly) => update({ favoritesOnly });
  const setOrder = (order) => update({ order });
  const setQuery = (query) => update({ query });
  const setStatus = (status) => update({ status });
  const setCategory = (category) => update({ category });
  useEffect(() => {
    writeStorage(storageKeys.preferences, JSON.stringify(preferences));
  }, [preferences]);
  const allSavedTitles = titles.filter((title) => Object.hasOwn(library, title.id));
  const savedTitles = allSavedTitles.filter((title) => belongsToSection(title, section));
  const scopedFolders = sectionFolders(folders, savedTitles);
  const activeFolder = scopedFolders.find((folder) => folder.id === activeFolderId);
  const order = !activeFolder && storedOrder === 'manual' ? 'recent' : storedOrder;
  const folderOverview = view === 'folders' && !activeFolder;
  const canOrder =
    activeFolder &&
    order === 'manual' &&
    !selecting &&
    !query.trim() &&
    !favoritesOnly &&
    status === 'Todos' &&
    category === 'Todos';
  const visibleTitles = sortTitles(
    savedTitles.filter(
      (title) =>
        (!activeFolder || activeFolder.titleIds.includes(title.id)) &&
        (!favoritesOnly || library[title.id].favorite) &&
        (category === 'Todos' || title.category === category) &&
        (status === 'Todos' || library[title.id].status === status) &&
        matchesTitle(title, query),
    ),
    library,
    order,
  );
  if (activeFolder && order === 'manual')
    visibleTitles.sort(
      (a, b) => activeFolder.titleIds.indexOf(a.id) - activeFolder.titleIds.indexOf(b.id),
    );
  const visibleFolders = scopedFolders.filter((folder) =>
    folder.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  function resetFilters() {
    update({ favoritesOnly: false, query: '', status: 'Todos', category: 'Todos' });
  }
  function changeView(view) {
    update({
      view,
      order: 'recent',
      activeFolderId: null,
      favoritesOnly: false,
      query: '',
      status: 'Todos',
      category: 'Todos',
    });
  }
  function changeSection(section) {
    setPreferences((current) => ({ ...current, section }));
  }
  function openFolder(folder) {
    update({
      view: 'folders',
      order: 'manual',
      activeFolderId: folder.id,
      favoritesOnly: false,
      query: '',
      status: 'Todos',
      category: 'Todos',
    });
  }

  return {
    section,
    changeSection,
    sectionCounts: {
      anime: allSavedTitles.filter((title) => belongsToSection(title, 'anime')).length,
      screen: allSavedTitles.filter((title) => belongsToSection(title, 'screen')).length,
    },
    scopedFolders,
    favoritesOnly,
    setFavoritesOnly,
    order,
    setOrder,
    view,
    query,
    setQuery,
    status,
    setStatus,
    category,
    setCategory,
    savedTitles,
    activeFolder,
    folderOverview,
    canOrder,
    visibleTitles,
    visibleFolders,
    resetFilters,
    changeView,
    openFolder,
  };
}
