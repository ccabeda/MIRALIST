import { normalizeTitle } from '../../domain/catalog.js';

const formats = {
  tv: 'TV',
  ova: 'OVA',
  ona: 'ONA',
  movie: 'Película',
  special: 'Especial',
  tv_special: 'Especial de TV',
  cm: 'Anuncio',
  pv: 'Promocional',
  music: 'Música',
  unknown: 'Desconocido',
};
const seasons = { winter: 'Invierno', spring: 'Primavera', summer: 'Verano', fall: 'Otoño' };
const states = {
  finished_airing: 'Finalizado',
  currently_airing: 'En emisión',
  not_yet_aired: 'Próximamente',
  'Finished Airing': 'Finalizado',
  'Currently Airing': 'En emisión',
  'Not yet aired': 'Próximamente',
  Ended: 'Finalizado',
  'Returning Series': 'En emisión',
  Released: 'Estrenada',
  Canceled: 'Cancelada',
  'In Production': 'En producción',
  Planned: 'Planificada',
};
const genres = {
  Action: 'Acción',
  Adventure: 'Aventura',
  Comedy: 'Comedia',
  Drama: 'Drama',
  Fantasy: 'Fantasía',
  Horror: 'Terror',
  Mystery: 'Misterio',
  Romance: 'Romance',
  'Sci-Fi': 'Ciencia ficción',
  Sports: 'Deportes',
  'Slice of Life': 'Vida cotidiana',
  Supernatural: 'Sobrenatural',
  Suspense: 'Suspenso',
};
const tmdbGenres = {
  28: 'Acción',
  12: 'Aventura',
  16: 'Animación',
  35: 'Comedia',
  80: 'Crimen',
  99: 'Documental',
  18: 'Drama',
  10751: 'Familia',
  14: 'Fantasía',
  36: 'Historia',
  27: 'Terror',
  10402: 'Música',
  9648: 'Misterio',
  10749: 'Romance',
  878: 'Ciencia ficción',
  10770: 'Película de TV',
  53: 'Suspenso',
  10752: 'Guerra',
  37: 'Western',
  10759: 'Acción y aventura',
  10765: 'Ciencia ficción y fantasía',
  10762: 'Infantil',
  10763: 'Noticias',
  10764: 'Reality',
  10766: 'Telenovela',
  10767: 'Talk show',
  10768: 'Guerra y política',
};
const year = (date) => (date ? Number(date.slice(0, 4)) || null : null);
const day = (value) => value?.slice(0, 10) || null;
const score = (value) => (Number.isFinite(value) ? Math.round(value * 10) : null);
const text = (value) => (typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : '');

export function fromMal(data) {
  if (!Number.isInteger(data?.id)) return null;
  return normalizeTitle({
    id: `mal-${data.id}`,
    providerIds: { mal: data.id },
    title: data.alternative_titles?.en || data.title,
    subtitle: data.alternative_titles?.en ? data.title : '',
    aliases: [
      ...new Set(
        [
          data.title,
          data.alternative_titles?.ja,
          ...(data.alternative_titles?.synonyms || []),
        ].filter(Boolean),
      ),
    ],
    category: 'Anime',
    format: formats[data.media_type] || data.media_type || 'Desconocido',
    year: data.start_season?.year || year(data.start_date),
    total: data.media_type === 'movie' ? 1 : data.num_episodes || null,
    genre: (data.genres || []).map((g) => genres[g.name] || g.name).join(', ') || 'Sin género',
    description: text(data.synopsis),
    cover: data.main_picture?.large || data.main_picture?.medium,
    color: '#cb693b',
    mark: '◉',
    relatedIds: (data.related_anime || []).map(({ node }) => `mal-${node.id}`),
    metadata: {
      provider: 'MyAnimeList',
      url: `https://myanimelist.net/anime/${data.id}`,
      duration:
        data.average_episode_duration > 0
          ? `${Math.round(data.average_episode_duration / 60)} min`
          : null,
      status: states[data.status] || data.status || null,
      startDate: /^\d{4}-\d{2}-\d{2}$/.test(data.start_date || '') ? data.start_date : null,
      endDate: /^\d{4}-\d{2}-\d{2}$/.test(data.end_date || '') ? data.end_date : null,
      season: data.start_season
        ? `${seasons[data.start_season.season] || data.start_season.season} ${data.start_season.year || ''}`.trim()
        : null,
      averageScore: score(data.mean),
      popularity: data.num_list_users ?? null,
      favorites: null,
      studios: data.studios?.map((s) => s.name).join(', ') || null,
      source: data.source || null,
      broadcastDay: data.broadcast?.day_of_the_week || null,
      broadcastTime: data.broadcast?.start_time || null,
    },
  });
}

export function fromTmdb(data, kind) {
  if (!Number.isInteger(data?.id)) return null;
  const movie = kind === 'movie';
  const date = movie ? data.release_date : data.first_air_date;
  return normalizeTitle({
    id: `tmdb-${kind}-${data.id}`,
    providerIds: { tmdb: data.id },
    title: movie ? data.title : data.name,
    subtitle: data.tagline || '',
    aliases: [movie ? data.original_title : data.original_name].filter(Boolean),
    category: movie ? 'Películas' : 'Series',
    format: movie ? 'Película' : 'Serie',
    year: year(date),
    total: movie ? 1 : data.number_of_episodes,
    genre:
      data.genres?.map((g) => g.name).join(', ') ||
      data.genre_ids
        ?.map((id) => tmdbGenres[id])
        .filter(Boolean)
        .join(', ') ||
      'Sin género',
    description: text(data.overview),
    cover: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
    color: '#397fc2',
    mark: '◉',
    // Season zero contains specials and is not part of TMDB's number_of_episodes total.
    seasons: !movie
      ? data.seasons
          ?.filter((s) => s.season_number > 0)
          .map((s) => ({ number: s.season_number, total: s.episode_count }))
      : undefined,
    metadata: {
      provider: 'TMDB',
      url: `https://www.themoviedb.org/${kind}/${data.id}`,
      startDate: day(date),
      endDate: !movie && data.status === 'Ended' ? day(data.last_air_date) : null,
      duration: (movie ? data.runtime : data.episode_run_time?.[0])
        ? `${movie ? data.runtime : data.episode_run_time[0]} min`
        : null,
      status: states[data.status] || data.status || null,
      averageScore: data.vote_count > 0 ? score(data.vote_average) : null,
      popularity: data.popularity ?? null,
      studios: data.production_companies?.map((c) => c.name).join(', ') || null,
      collectionId: movie ? (data.belongs_to_collection?.id ?? null) : null,
      nextEpisodeDate: !movie ? data.next_episode_to_air?.air_date || null : null,
      nextEpisodeNumber: !movie ? (data.next_episode_to_air?.episode_number ?? null) : null,
      nextEpisodeSeason: !movie ? (data.next_episode_to_air?.season_number ?? null) : null,
      nextEpisodeName: !movie ? data.next_episode_to_air?.name || null : null,
      lastEpisodeDate: !movie ? data.last_episode_to_air?.air_date || null : null,
      lastEpisodeNumber: !movie ? (data.last_episode_to_air?.episode_number ?? null) : null,
      lastEpisodeSeason: !movie ? (data.last_episode_to_air?.season_number ?? null) : null,
    },
  });
}
