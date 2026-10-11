import React from 'react';

export default function LibrarySync({ sync }) {
  return (
    <section className="library-sync" aria-label="Guardado de biblioteca">
      <p role="status">
        {sync.status === 'loading'
          ? 'Cargando tu biblioteca…'
          : sync.status === 'saving' || sync.status === 'pending'
            ? 'Guardando cambios…'
            : sync.status === 'saved'
              ? 'Biblioteca guardada en tu cuenta'
              : 'No se pudo sincronizar la biblioteca'}
      </p>
      {sync.error && (
        <div role="alert">
          <p>{sync.error}</p>
          {sync.sessionExpired && (
            <p>Abrí Mi perfil para volver a iniciar sesión. Tus cambios pendientes se conservan.</p>
          )}
          <div className="sync-actions">
            {sync.conflict ? (
              <button className="text-button" onClick={sync.reloadServer}>
                {sync.invalidDraft
                  ? 'Exportar borrador dañado y cargar servidor'
                  : 'Exportar pendientes y cargar versión del servidor'}
              </button>
            ) : (
              <button className="text-button" onClick={sync.retry}>
                Reintentar
              </button>
            )}
            {sync.ready && (
              <button className="text-button" onClick={sync.download}>
                {sync.invalidDraft ? 'Descargar borrador original' : 'Exportar cambios pendientes'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
