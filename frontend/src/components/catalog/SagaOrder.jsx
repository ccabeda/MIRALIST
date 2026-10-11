import React, { useEffect, useState } from 'react';
import { loadSaga } from '../../services/catalog/discovery.js';
import { orderSaga } from '../../domain/discovery.js';
import RelatedCover from './RelatedCover.jsx';

export default function SagaOrder({ title, onOpen }) {
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState('release');
  const [limit, setLimit] = useState(24);
  useEffect(() => {
    if (!requested) return;
    let active = true;
    setResult(null);
    loadSaga(title, () => active, limit, { force: attempt > 0 })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((error) => {
        if (active) setResult({ error: error.message });
      });
    return () => {
      active = false;
    };
  }, [title, requested, attempt, limit]);
  const ordered = result?.items ? orderSaga(result.items, result.relations, mode) : null;
  return (
    <section className="detail-recommendations saga-order">
      <h3>Orden de la saga</h3>
      {!requested ? (
        <button className="btn btn-outline-light" onClick={() => setRequested(true)}>
          Consultar orden de la saga
        </button>
      ) : (
        <>
          {!result && <p role="status">Consultando las entregas relacionadas…</p>}
          {result?.error && (
            <p role="alert">
              {result.error}{' '}
              <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>
                Reintentar saga
              </button>
            </p>
          )}
          {ordered && (
            <>
              <label>
                Ordenar entregas{' '}
                <select
                  className="form-select"
                  value={mode}
                  onChange={(event) => setMode(event.target.value)}
                >
                  <option value="release">Orden de estreno</option>
                  <option value="suggested">Orden sugerido</option>
                </select>
              </label>
              <p className="muted">
                {mode === 'release'
                  ? 'Por fecha de estreno; las fechas desconocidas quedan al final.'
                  : 'Sugerencia según relaciones de precuela y secuela. Las demás entregas se ordenan por estreno; no es un orden oficial ni garantiza la cronología narrativa.'}
              </p>
              {ordered.cycle && (
                <p className="muted">
                  Hay relaciones contradictorias; el resto conserva el orden de estreno.
                </p>
              )}
              {result.partial && (
                <p role="status">
                  Vista parcial: hay más entregas relacionadas o algunas fichas no respondieron.
                </p>
              )}
              {result.hasMore && (
                <button
                  className="btn btn-outline-light"
                  onClick={() => setLimit((value) => value + 24)}
                >
                  Cargar más entregas
                </button>
              )}
              {ordered.items.length < 2 ? (
                <p>No hay suficientes entregas relacionadas para ordenar esta saga.</p>
              ) : (
                <ol className="saga-list">
                  {ordered.items.map((item) => (
                    <li key={item.id}>
                      <button onClick={() => onOpen(item)}>
                        <RelatedCover title={item} />
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.format} ·{' '}
                            {item.metadata?.startDate || item.year || 'Sin fecha de estreno'}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
