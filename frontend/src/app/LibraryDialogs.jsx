import React from 'react';
import TitleDialog from '../components/catalog/TitleDialog.jsx';
import FolderPicker from '../components/library/FolderPicker.jsx';
import CollectionNotices from '../components/layout/CollectionNotices.jsx';

export default function LibraryDialogs({ workspace }) {
  const {
    registerTitles,
    selected,
    detail,
    titles,
    library,
    suggestion,
    openTitle,
    add,
    openFolders,
    requestAccount,
    toggleFavorite,
    save,
    acceptDate,
    setSuggestion,
    removeTitle,
    setDetail,
    folderTarget,
    folders,
    setFolders,
    setFolderTarget,
    setNotice,
    undo,
    restoreLast,
    clearUndo,
    notice,
  } = workspace;
  return (
    <>
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
        toggleFavorite={(title) => {
          if (!requestAccount({ type: 'favorite', title })) toggleFavorite(title);
        }}
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
    </>
  );
}
