export function belongsToSection(title, section) {
  return section === 'anime'
    ? title.category === 'Anime'
    : ['Series', 'Películas'].includes(title.category);
}

export function sectionFolders(folders, titles) {
  const ids = new Set(titles.map((title) => title.id));
  return folders
    .map((folder) => ({ ...folder, titleIds: folder.titleIds.filter((id) => ids.has(id)) }))
    .filter((folder, index) => folder.titleIds.length || !folders[index].titleIds.length);
}
