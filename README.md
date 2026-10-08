# MiráList

Biblioteca personal de anime, series y películas, hecha con React, Vite y Bootstrap.

## Ejecutar

Requiere Node.js 22.12 o posterior.

```powershell
npm.cmd install
npm.cmd run dev
```

Abrí la dirección que muestra Vite.

## Comprobar

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
```

## Datos

Copiá `.env.example` como `.env.local`, completá `MAL_CLIENT_ID` (MyAnimeList), `TMDB_READ_TOKEN` (series y películas) y `ANIMESCHEDULE_TOKEN` (estrenos de anime), y reiniciá Vite. Las credenciales quedan en el servidor local. El proxy funciona con `dev` y `preview`; publicar solo `dist` no incluye ese servidor.

La biblioteca se guarda en este navegador con localStorage. No hay cuentas ni sincronización entre dispositivos. Podés exportar una copia de seguridad desde la aplicación.
