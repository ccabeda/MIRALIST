import { useCallback, useEffect, useState } from 'react';
import useTheme from './useTheme.js';
import useLibrary from './useLibrary.js';
import { mergeCatalog } from '../domain/catalog-registry.js';
import { canonicalTitle } from '../domain/organization.js';

export default function useLibraryWorkspace(auth, loginIntent, setLoginIntent) {
  const [theme, setTheme] = useTheme();
  const [section, setSection] = useState(loginIntent?.section || 'Inicio');
  const [availableTitles, setAvailableTitles] = useState(() =>
    loginIntent?.title ? [loginIntent.title] : [],
  );
  const [accountPanel, setAccountPanel] = useState(null);
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
    sync,
  } = useLibrary({
    userId: auth.user?.id,
    titles: availableTitles,
    notify: setNotice,
    onDuplicate: openTitle,
  });
  useEffect(() => {
    if (!auth.user || !sync.ready || !loginIntent) return;
    setLoginIntent(null);
    if (!loginIntent.title) return;
    const result = ensureSaved(loginIntent.title);
    if (!result) return;
    if (loginIntent.type === 'favorite') toggleFavorite(result.title);
    else if (loginIntent.type === 'folder') setFolderTarget(result.title);
    else setDetail({ title: result.title, mode: 'edit' });
  }, [auth.user, sync.ready, loginIntent, setLoginIntent, ensureSaved, toggleFavorite]);
  function requestAccount(intent) {
    if (auth.user) return false;
    setLoginIntent({ section, ...intent });
    setDetail(null);
    setAccountPanel('profile');
    return true;
  }
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
    if (
      ['Mi biblioteca', 'Calendario'].includes(value) &&
      requestAccount({ type: 'navigate', section: value })
    )
      return;
    setSection(value);
  }
  function openFolders(title) {
    if (requestAccount({ type: 'folder', title })) return;
    const result = ensureSaved(title);
    if (result) setFolderTarget(result.title);
  }
  function add(title) {
    if (requestAccount({ type: 'add', title })) return;
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
  return {
    theme,
    setTheme,
    section,
    navigate,
    titles,
    library,
    folders,
    setFolders,
    watching,
    accountPanel,
    setAccountPanel,
    registerTitles,
    openTitle,
    detail,
    selected,
    setDetail,
    notice,
    setNotice,
    folderTarget,
    setFolderTarget,
    suggestion,
    setSuggestion,
    undo,
    clearUndo,
    save,
    acceptDate,
    removeTitle,
    removeFolder,
    restoreLast,
    toggleFavorite,
    changeManyStatuses,
    changeManyFolders,
    importCollection,
    sync,
    requestAccount,
    openFolders,
    add,
  };
}
