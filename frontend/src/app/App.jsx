import React, { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth.js';
import ResetPasswordPage from '../components/account/ResetPasswordPage.jsx';
import EmailVerificationPage from '../components/account/EmailVerification.jsx';
import LibraryApp from './LibraryApp.jsx';
import '../styles/library-sync.css';
import '../styles/account-settings.css';

export default function App() {
  const auth = useAuth();
  const [loginIntent, setLoginIntent] = useState(null);
  const [recoveryHash, setRecoveryHash] = useState(() => window.location.hash);
  useEffect(() => {
    const changed = () => {
      if (/^#(reset-password|verify-email)/.test(window.location.hash))
        setRecoveryHash(window.location.hash);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  if (recoveryHash.startsWith('#reset-password')) return <ResetPasswordPage hash={recoveryHash} />;
  if (recoveryHash.startsWith('#verify-email'))
    return <EmailVerificationPage hash={recoveryHash} />;
  if (!auth.ready)
    return (
      <main className="page-content" role="status">
        Cargando tu cuenta…
      </main>
    );
  return (
    <LibraryApp
      key={auth.user?.id || 'visitor'}
      auth={auth}
      loginIntent={loginIntent}
      setLoginIntent={setLoginIntent}
    />
  );
}
