export const catalogOrders = {
  relevance: 'Relevancia',
  newest: 'Estreno: más reciente',
  oldest: 'Estreno: más antiguo',
};

function releaseKey(title) {
  const date = title.metadata?.startDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date))) return date;
  const year = Number(title.year);
  return Number.isInteger(year) && year >= 1000 && year <= 9999 ? `${year}-00-00` : null;
}

export function orderCatalog(titles, order) {
  if (!['newest', 'oldest'].includes(order)) return titles;
  return [...titles].sort((a, b) => {
    const left = releaseKey(a),
      right = releaseKey(b);
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    return order === 'newest' ? right.localeCompare(left) : left.localeCompare(right);
  });
}
