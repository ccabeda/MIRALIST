import { defineConfig, loadEnv } from 'vite';
import { createCatalogApi } from './server/catalog-api.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['TMDB_', 'MAL_', 'ANIMESCHEDULE_']);
  const middleware = createCatalogApi({
    token: env.TMDB_READ_TOKEN || process.env.TMDB_READ_TOKEN,
    malClientId: env.MAL_CLIENT_ID || process.env.MAL_CLIENT_ID,
    animeScheduleToken: env.ANIMESCHEDULE_TOKEN || process.env.ANIMESCHEDULE_TOKEN,
  });
  return {
    plugins: [
      {
        name: 'miralist-catalog',
        configureServer(server) {
          server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(middleware);
        },
      },
    ],
  };
});
