import React from 'react';
import Sidebar from '../components/layout/Sidebar.jsx';
import AccountControls from '../components/layout/AccountControls.jsx';
import Notifications from '../components/layout/Notifications.jsx';
import useLibraryWorkspace from '../hooks/useLibraryWorkspace.js';
import LibraryContent from './LibraryContent.jsx';
import LibraryDialogs from './LibraryDialogs.jsx';

export default function LibraryApp({ auth, loginIntent, setLoginIntent }) {
  const workspace = useLibraryWorkspace(auth, loginIntent, setLoginIntent);
  const {
    section,
    navigate,
    library,
    sync,
    titles,
    openTitle,
    accountPanel,
    setAccountPanel,
    theme,
    setTheme,
  } = workspace;
  return (
    <div className="app-shell">
      <Sidebar section={section} navigate={navigate} library={library}>
        {auth.user && sync.ready && (
          <Notifications
            onEpisodeUpdate={workspace.onEpisodeUpdate}
            titles={titles}
            library={library}
            openTitle={openTitle}
            userId={auth.user.id}
          />
        )}
        <AccountControls
          panel={accountPanel}
          setPanel={(value) => {
            setAccountPanel(value);
            if (!value && !auth.user) setLoginIntent(null);
          }}
          loginReason={!!loginIntent && !auth.user}
          theme={theme}
          setTheme={setTheme}
          library={library}
          auth={{
            ...auth,
            pendingChanges: sync.dirty,
            sessionExpired: auth.sessionExpired || sync.sessionExpired,
            onReauthenticated: sync.retry,
          }}
        />
      </Sidebar>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            Tu espacio <span>/</span> <b>{section}</b>
          </div>
          {auth.user && (
            <div className="topbar-actions">
              <span className="demo-pill">
                <i /> MI CUENTA
              </span>
            </div>
          )}
        </header>
        <LibraryContent auth={auth} workspace={workspace} />
      </main>
      <LibraryDialogs workspace={workspace} />
    </div>
  );
}
