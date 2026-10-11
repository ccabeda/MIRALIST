export const folderOrders = {
  original: 'Orden original',
  recent: 'Agregadas recientemente',
  name: 'Nombre: A–Z',
  'name-desc': 'Nombre: Z–A',
  most: 'Más obras',
  least: 'Menos obras',
};

const compareNames = (a, b) =>
  a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true });

export function sortFolders(folders, order) {
  if (order === 'recent') return [...folders].reverse();
  if (order === 'name') return [...folders].sort(compareNames);
  if (order === 'name-desc') return [...folders].sort((a, b) => compareNames(b, a));
  if (order === 'most' || order === 'least')
    return [...folders].sort((a, b) => {
      const difference = a.titleIds.length - b.titleIds.length;
      return (order === 'most' ? -difference : difference) || compareNames(a, b);
    });
  return folders;
}
