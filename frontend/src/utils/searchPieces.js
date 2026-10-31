export const normalizeSearchText = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const categoryLabels = [
  ['body', 'Body'],
  ['blusa', 'Blusa'],
  ['calca', 'Calça'],
  ['camisa', 'Camisa'],
  ['camiseta', 'Camiseta'],
  ['casaco', 'Casaco'],
  ['jaqueta', 'Jaqueta'],
  ['macacao', 'Macacão'],
  ['moletom', 'Moletom'],
  ['saia', 'Saia'],
  ['shorts', 'Shorts'],
  ['vestido', 'Vestido'],
];

const inferredLabels = {
  condition: [
    ['seminovo', 'Seminovo'],
    ['seminova', 'Seminova'],
    ['usado', 'Usado'],
    ['usada', 'Usada'],
    ['novo', 'Novo'],
    ['nova', 'Nova'],
  ],
  style: [
    ['casual', 'Casual'],
    ['esportivo', 'Esportivo'],
    ['esportiva', 'Esportiva'],
    ['festa', 'Festa'],
    ['formal', 'Formal'],
    ['praia', 'Praia'],
    ['social', 'Social'],
    ['streetwear', 'Streetwear'],
  ],
};

const attributeLabels = {
  category: /(?:categoria|tipo)\s*[:=-]\s*([^,\n;.]+)/i,
  size: /(?:tamanho|tam)\s*[:#=-]?\s*([^,\n;.]+)/i,
  condition: /(?:condi[cç][aã]o|estado)\s*[:=-]\s*([^,\n;.]+)/i,
  style: /estilo\s*[:=-]\s*([^,\n;.]+)/i,
};

const getItemText = (item) =>
  normalizeSearchText(
    [
      item.title,
      item.description,
      item.category,
      item.size,
      item.condition,
      item.style,
      item.userId?.name,
      item.userId?.email,
    ]
      .filter(Boolean)
      .join(' ')
  );

const inferLabel = (text, labels) =>
  labels.find(([keyword]) => new RegExp(`\\b${keyword}\\b`).test(text))?.[1] ||
  '';

export const getClothingAttribute = (item, key) => {
  const value = typeof item[key] === 'string' ? item[key].trim() : '';
  if (value) return value;

  const rawText = `${item.title || ''}\n${item.description || ''}`;
  const labeledValue = rawText.match(attributeLabels[key])?.[1]?.trim();
  if (labeledValue) return labeledValue;

  const text = normalizeSearchText(rawText);

  if (key === 'category') {
    return inferLabel(text, categoryLabels);
  }

  if (key === 'size') {
    const match = text.match(
      /\b(?:tamanho|tam)\s*[:#-]?\s*(rn|0?\d{1,2}|xgg|xg|gg|pp|p|m|g)\b/
    );
    return match?.[1]?.toUpperCase() || '';
  }

  return inferLabel(text, inferredLabels[key] || []);
};

const matchesQuery = (item, query) =>
  !query || getItemText(item).includes(normalizeSearchText(query));

// Compare equivalent condition labels without rewriting stored values.
const normalizeAttribute = (value, key) => {
  const text = normalizeSearchText(value);
  if (key === 'condition') {
    return { novo: 'nova', seminovo: 'seminova', usado: 'usada' }[text] || text;
  }
  return text;
};

export const getClothingFilterOptions = (items, query) => {
  const matchingItems = items.filter((item) => matchesQuery(item, query));
  const getOptions = (key) => {
    const options = new Map();
    for (const item of matchingItems) {
      const label = getClothingAttribute(item, key);
      const normalized = normalizeAttribute(label, key);
      if (label && !options.has(normalized)) options.set(normalized, label);
    }
    return [...options.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  };

  return {
    category: getOptions('category'),
    size: getOptions('size'),
    condition: getOptions('condition'),
    style: getOptions('style'),
  };
};

const getTimestamp = (item) => {
  if (!item.createdAt) return null;
  const timestamp = new Date(item.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const sortClothingPieces = (items, sort = 'newest') =>
  [...items].sort((first, second) => {
    if (sort === 'title') {
      return (first.title || '').localeCompare(second.title || '', 'pt-BR');
    }
    const a = getTimestamp(first);
    const b = getTimestamp(second);
    // Listings without a valid date remain visible, after dated listings.
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    return sort === 'oldest' ? a - b : b - a;
  });

export const filterClothingPieces = (items, query = '', filters = {}) =>
  sortClothingPieces(
    items.filter((item) => {
      if (!matchesQuery(item, query)) return false;

      return ['category', 'size', 'condition', 'style'].every((key) => {
        const selected = filters[key];
        if (!selected) return true;

        return (
          normalizeAttribute(getClothingAttribute(item, key), key) ===
          normalizeAttribute(selected, key)
        );
      });
    }),
    filters.sort
  );
