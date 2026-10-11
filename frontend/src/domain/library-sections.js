export function belongsToSection(title, section) {
  return section === 'anime'
    ? title.category === 'Anime'
    : ['Series', 'Películas'].includes(title.category);
}

export function folderAccepts(folder, title, titles) {
  const section = title.category === 'Anime' ? 'anime' : 'screen';
  return folder.titleIds.every((id) => {
    const member = titles.find((item) => item.id === id);
    return member && belongsToSection(member, section);
  });
}

export function validateFolderSections(folders, titles) {
  for (const folder of folders) {
    const first = titles.find((title) => title.id === folder.titleIds[0]);
    if (first && !folderAccepts(folder, first, titles))
      throw new Error(
        `La carpeta «${folder.name}» mezcla anime con series o películas. Separá su contenido en carpetas distintas.`,
      );
  }
}

// Split old mixed folders without losing works or their order.
export function separateMixedFolders(folders, titles) {
  const result = [];
  const ids = new Set(folders.map((folder) => folder.id));
  const names = new Set(folders.map((folder) => folder.name.toLocaleLowerCase()));
  for (const folder of folders) {
    const first = titles.find((title) => title.id === folder.titleIds[0]);
    if (!first || folderAccepts(folder, first, titles)) {
      result.push(folder);
      continue;
    }
    const animeFirst = first.category === 'Anime';
    const firstIds = [],
      otherIds = [];
    for (const id of folder.titleIds) {
      const title = titles.find((item) => item.id === id);
      ((title?.category === 'Anime') === animeFirst ? firstIds : otherIds).push(id);
    }
    const suffix = animeFirst ? 'Series y películas' : 'Anime';
    let id = `${folder.id.slice(0, 125)}-${animeFirst ? 'screen' : 'anime'}`;
    while (ids.has(id)) id += '-2';
    let name = `${folder.name.slice(0, 35)} (${suffix})`;
    let number = 2;
    while (names.has(name.toLocaleLowerCase()))
      name = `${folder.name.slice(0, 30)} (${suffix} ${number++})`;
    ids.add(id);
    names.add(name.toLocaleLowerCase());
    result.push({ ...folder, titleIds: firstIds }, { id, name, titleIds: otherIds });
  }
  return result;
}

export function sectionFolders(folders, titles) {
  const ids = new Set(titles.map((title) => title.id));
  return folders
    .map((folder) => ({ ...folder, titleIds: folder.titleIds.filter((id) => ids.has(id)) }))
    .filter((folder, index) => folder.titleIds.length || !folders[index].titleIds.length);
}
