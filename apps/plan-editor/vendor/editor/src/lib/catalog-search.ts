function normalized(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i');
}

export function matchesCatalogSearch(item: { name: string; tags?: readonly string[] }, query: string): boolean {
  const terms = normalized(query).trim().split(/\s+/).filter(Boolean);
  const text = normalized([item.name, ...(item.tags ?? [])].join(' '));
  return terms.every(term => text.includes(term));
}
