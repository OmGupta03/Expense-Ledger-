/**
 * Returns a category emoji icon based on keyword matching in description text.
 * @param {string} description - The description of the expense
 * @returns {string} Category Emoji icon
 */
export function getCategoryIcon(description = '') {
  const d = description.toLowerCase();
  if (d.includes('rent'))        return '🏠';
  if (d.includes('grocer'))      return '🛒';
  if (d.includes('wifi') || d.includes('electricity') || d.includes('bill')) return '⚡';
  if (d.includes('dinner') || d.includes('food') || d.includes('pizza') || d.includes('lunch')) return '🍽️';
  if (d.includes('flight') || d.includes('cab') || d.includes('airport')) return '✈️';
  if (d.includes('maid') || d.includes('clean')) return '🧹';
  if (d.includes('movie'))       return '🎬';
  if (d.includes('cake') || d.includes('birthday')) return '🎂';
  if (d.includes('scooter') || d.includes('rentals')) return '🛵';
  if (d.includes('cylinder') || d.includes('gas')) return '🔥';
  if (d.includes('parasail') || d.includes('beach')) return '🌊';
  if (d.includes('villa') || d.includes('hotel')) return '🏨';
  if (d.includes('brunch'))      return '☕';
  return '💰';
}
