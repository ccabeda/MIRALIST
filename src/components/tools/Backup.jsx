import React, { useRef, useState } from 'react';
import { makeBackup, readBackup } from '../../domain/backup.js';
import { localToday } from '../../domain/watch-dates.js';
import { readStorage, storageKeys } from '../../services/storage.js';

export default function Backup({ titles, library, folders, onImport, notify }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [useImported, setUseImported] = useState(false);
  const [reading, setReading] = useState(false);
  const sequence = useRef(0);
  const previousBackup = readStorage(storageKeys.demoBackup);
  function download(savedCopy) {
    const url = URL.createObjectURL(
      new Blob([savedCopy || JSON.stringify(makeBackup(library, folders, titles), null, 2)], {
        type: 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `miralist-${savedCopy ? 'antes-de-limpiar-' : ''}${localToday()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Copia preparada para descargar');
  }
  async function load(event) {
    const file = event.target.files?.[0];
    const request = ++sequence.current;
    setPreview(null);
    setError('');
    setUseImported(false);
    if (!file) {
      setReading(false);
      return;
    }
    setReading(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('La copia supera el límite de 5 MB.');
      const parsed = readBackup(await file.text(), titles);
      if (request === sequence.current) setPreview(parsed);
    } catch (error) {
      if (request === sequence.current) setError(error.message);
    } finally {
      if (request === sequence.current) setReading(false);
    }
  }
  const repeated = preview
    ? Object.keys(preview.library).filter((id) => Object.hasOwn(library, id)).length
    : 0;
  return (
    <>
      <p>Guardá una copia con tus capítulos, estrellas, notas, favoritos, fechas y carpetas.</p>
      <button className="btn btn-accent" onClick={() => download()}>
        Exportar copia JSON
      </button>
      {previousBackup && (
        <p className="tools-help">
          Se guardó una copia antes de retirar los ejemplos.{' '}
          <button className="text-button" onClick={() => download(previousBackup)}>
            Descargar copia anterior
          </button>
        </p>
      )}
      <hr />
      <label className="backup-file">
        Importar una copia
        <input
          type="file"
          accept=".json,application/json"
          onChange={load}
          className="form-control"
        />
      </label>
      <p className="tools-help">
        Máximo 5 MB. Revisá el resumen antes de importar. Tus obras actuales no se eliminan.
      </p>
      {reading && <p role="status">Leyendo copia…</p>}
      {error && (
        <p role="alert" className="folder-error">
          {error}
        </p>
      )}
      {preview && (
        <div className="backup-preview">
          <h3>Lista para importar</h3>
          {preview.duplicateCount > 0 && (
            <p role="status">
              {preview.duplicateCount} fichas duplicadas detectadas. Se conserva la primera ficha de
              cada obra y se combinan sus carpetas.
            </p>
          )}
          <p>
            {Object.keys(preview.library).length} obras · {preview.folders.length} carpetas ·{' '}
            {repeated} obras ya presentes.
          </p>
          <label>
            Si una obra ya existe
            <select
              className="form-select"
              value={useImported ? 'imported' : 'current'}
              onChange={(e) => setUseImported(e.target.value === 'imported')}
            >
              <option value="current">Conservar mis datos actuales</option>
              <option value="imported">Usar los datos de la copia</option>
            </select>
          </label>
          <p className="tools-help">
            Las pertenencias a carpetas se combinan. Los nombres duplicados reciben un sufijo.
          </p>
          <div className="tools-actions">
            <button
              className="btn btn-accent"
              onClick={() => {
                onImport(preview, useImported);
                setPreview(null);
              }}
            >
              Importar ahora
            </button>
            <button className="btn btn-outline-light" onClick={() => setPreview(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
