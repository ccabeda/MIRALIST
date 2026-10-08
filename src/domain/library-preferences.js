import { statuses } from './library.js';
export const defaultPreferences = {
  section: 'anime',
  query: '',
  category: 'Todos',
  status: 'Todos',
  favoritesOnly: false,
  order: 'recent',
  view: 'all',
  activeFolderId: null,
};
export function parsePreferences(raw) {
  try {
    const item = JSON.parse(raw);
    if (!item || Array.isArray(item) || typeof item !== 'object') return { ...defaultPreferences };
    return {
      section: item.section === 'screen' ? 'screen' : 'anime',
      query: typeof item.query === 'string' ? item.query.slice(0, 300) : '',
      category: ['Todos', 'Anime', 'Series', 'Películas'].includes(item.category)
        ? item.category
        : 'Todos',
      status: ['Todos', ...statuses].includes(item.status) ? item.status : 'Todos',
      favoritesOnly: item.favoritesOnly === true,
      order: ['recent', 'manual', 'score', 'title', 'finished'].includes(item.order)
        ? item.order
        : 'recent',
      view: item.view === 'folders' ? 'folders' : 'all',
      activeFolderId: typeof item.activeFolderId === 'string' ? item.activeFolderId : null,
    };
  } catch {
    return { ...defaultPreferences };
  }
}

// Keep the previous flat format readable when upgrading existing libraries.
export function parseSectionPreferences(raw) {
  let item;
  try {
    item = JSON.parse(raw);
  } catch {
    item = null;
  }
  const previous = parsePreferences(raw);
  const section = previous.section;
  const sections = Object.fromEntries(
    ['anime', 'screen'].map((name) => {
      const source = item?.sections?.[name] ?? (name === section ? previous : {});
      const preferences = parsePreferences(JSON.stringify(source));
      return [
        name,
        {
          ...preferences,
          section: name,
          category:
            name === 'screen' && ['Series', 'Películas'].includes(preferences.category)
              ? preferences.category
              : 'Todos',
        },
      ];
    }),
  );
  return { section, sections };
}
