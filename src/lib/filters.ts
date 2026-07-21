// Template filter helpers (replaces Nunjucks filters)

/**
 * Get current year (for copyright)
 */
export function year(): number {
  return new Date().getFullYear();
}

/**
 * Extract unique categories from array
 */
export function uniqueCategories<T extends { categorie: string }>(items: T[]): string[] {
  return [...new Set(items.map((item) => item.categorie))].sort();
}

/**
 * Filter featured items
 */
export function featured<T extends { misEnAvant: boolean }>(items: T[], max = 6): T[] {
  return items.filter((item) => item.misEnAvant).slice(0, max);
}

/**
 * Get related items (all except one, limited by max)
 */
export function others<T extends { slug: string }>(items: T[], slug: string, max = 4): T[] {
  return items.filter((item) => item.slug !== slug).slice(0, max);
}

/**
 * Sort array by field
 */
export function sortBy<T>(items: T[], field: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  const sorted = [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Format price with currency
 */
export function formatPrice(amount: number, currency = 'XOF'): string {
  if (currency === 'XOF') {
    return `${amount.toLocaleString('fr-FR')} F`;
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert price between currencies
 */
export function convertPrice(
  amount: number,
  fromRate: number,
  toRate: number
): number {
  return Math.round((amount / fromRate) * toRate);
}

/**
 * Truncate text to word limit
 */
export function truncate(text: string, wordLimit: number): string {
  const words = text.split(' ');
  if (words.length <= wordLimit) return text;
  return words.slice(0, wordLimit).join(' ') + '...';
}

/**
 * Create URL slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/--+/g, '-')
    .trim();
}
