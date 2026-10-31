import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterClothingPieces,
  getClothingAttribute,
  getClothingFilterOptions,
  normalizeSearchText,
  sortClothingPieces,
} from './searchPieces.js';

const pieces = [
  {
    title: 'Calça Jeans infantil',
    description: 'Tamanho 4, seminova, estilo casual',
    userId: { name: 'Ana' },
    createdAt: '2026-01-01',
  },
  {
    title: 'Jaqueta jeans',
    description: 'Tamanho 6, usada, estilo casual',
    userId: { name: 'Bia' },
    createdAt: '2026-02-01',
  },
  {
    title: 'Saia rosa',
    description: 'Tamanho P, nova, estilo festa',
    userId: { name: 'Cris' },
    createdAt: '2026-03-01',
  },
];

test('normalizes accents and letter case for text search', () => {
  assert.equal(normalizeSearchText('CALÇA Jeans'), 'calca jeans');
});

test('infers searchable attributes from legacy listing descriptions', () => {
  assert.equal(getClothingAttribute(pieces[0], 'category'), 'Calça');
  assert.equal(getClothingAttribute(pieces[0], 'size'), '4');
  assert.equal(getClothingAttribute(pieces[0], 'condition'), 'Seminova');
  assert.equal(getClothingAttribute(pieces[0], 'style'), 'Casual');
});

test('reads custom legacy attributes explicitly labeled in descriptions', () => {
  const legacyPiece = {
    title: 'Fantasia infantil',
    description:
      'Categoria: Fantasia; tamanho: 5; condição: Ótimo estado; estilo: Personagem',
  };

  assert.equal(getClothingAttribute(legacyPiece, 'category'), 'Fantasia');
  assert.equal(getClothingAttribute(legacyPiece, 'size'), '5');
  assert.equal(getClothingAttribute(legacyPiece, 'condition'), 'Ótimo estado');
  assert.equal(getClothingAttribute(legacyPiece, 'style'), 'Personagem');
});

test('limits filter options to listings matching the text query', () => {
  const options = getClothingFilterOptions(pieces, 'jeans');

  assert.deepEqual(options.category, ['Calça', 'Jaqueta']);
  assert.deepEqual(options.size, ['4', '6']);
});

test('applies text and facets, then sorts the remaining listings', () => {
  const results = filterClothingPieces(pieces, 'jeans', {
    category: 'Jaqueta',
    size: '',
    condition: '',
    style: '',
    sort: 'newest',
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].title, 'Jaqueta jeans');
});

test('structured attributes take priority over inferred legacy text', () => {
  const piece = {
    ...pieces[0],
    category: '  Body  ',
    size: 'RN',
    condition: 'Nova',
    style: 'Festa',
  };
  for (const [field, value] of Object.entries({
    category: 'Body',
    size: 'RN',
    condition: 'Nova',
    style: 'Festa',
  })) {
    assert.equal(getClothingAttribute(piece, field), value);
  }
});

test('combines all four filters with normalized text and owner search', () => {
  const piece = {
    ...pieces[0],
    category: 'Calça',
    size: '4',
    condition: 'Seminova',
    style: 'Casual',
  };
  const filters = {
    category: 'CALCA',
    size: '4',
    condition: 'seminovo',
    style: 'casual',
  };
  assert.deepEqual(filterClothingPieces([piece], 'ANA', filters), [piece]);
  assert.deepEqual(
    filterClothingPieces([piece], 'ANA', { ...filters, size: '8' }),
    []
  );
});

test('accepts masculine/feminine condition variants without changing the item', () => {
  for (const [stored, selected] of [
    ['Novo', 'Nova'],
    ['Seminova', 'Seminovo'],
    ['Usado', 'Usada'],
  ]) {
    const piece = { condition: stored };
    assert.deepEqual(
      filterClothingPieces([piece], '', { condition: selected }),
      [piece]
    );
    assert.equal(piece.condition, stored);
  }
});

test('deduplicates normalized filter options including condition variants', () => {
  const options = getClothingFilterOptions(
    [
      { category: 'Calça', condition: 'Novo' },
      { category: 'calca', condition: 'Nova' },
    ],
    ''
  );
  assert.deepEqual(options.category, ['Calça']);
  assert.equal(options.condition.length, 1);
});

test('missing, empty and null legacy attributes remain searchable', () => {
  const legacy = {
    title: 'Body',
    description: 'Tamanho RN',
    size: null,
    category: '',
    condition: null,
  };
  assert.equal(getClothingAttribute(legacy, 'size'), 'RN');
  assert.equal(getClothingAttribute(legacy, 'category'), 'Body');
  assert.equal(getClothingAttribute(legacy, 'condition'), '');
  assert.deepEqual(filterClothingPieces([legacy], 'body'), [legacy]);
  assert.deepEqual(filterClothingPieces([{}], ''), [{}]);
});

test('empty queries show all listings and unmatched queries show none', () => {
  assert.equal(filterClothingPieces(pieces, '   ').length, pieces.length);
  assert.deepEqual(filterClothingPieces(pieces, 'nonexistent'), []);
});

test('sorts dates both ways and names alphabetically without mutating source', () => {
  const original = structuredClone(pieces);
  assert.deepEqual(
    sortClothingPieces(pieces).map((p) => p.title),
    [pieces[2].title, pieces[1].title, pieces[0].title]
  );
  assert.deepEqual(sortClothingPieces(pieces, 'oldest'), original);
  assert.deepEqual(
    sortClothingPieces([...pieces].reverse(), 'title'),
    original
  );
  assert.deepEqual(pieces, original);
});

test('invalid/missing dates sort last in both chronological orders', () => {
  const items = [
    { _id: 'invalid', createdAt: 'not-a-date' },
    { _id: 'old', createdAt: '2025-01-01' },
    { _id: 'absent' },
    { _id: 'new', createdAt: '2026-01-01' },
  ];
  assert.deepEqual(
    sortClothingPieces(items).map((p) => p._id),
    ['new', 'old', 'invalid', 'absent']
  );
  assert.deepEqual(
    sortClothingPieces(items, 'oldest').map((p) => p._id),
    ['old', 'new', 'invalid', 'absent']
  );
});

test('read-only inference never stores derived attributes on old pieces', () => {
  const before = structuredClone(pieces);
  getClothingFilterOptions(pieces, '');
  filterClothingPieces(pieces, '', { category: 'Calça' });
  assert.deepEqual(pieces, before);
});

test('searches owner email and style in addition to listing text', () => {
  const piece = {
    userId: { email: 'ficticio@example.invalid' },
    style: 'Esportivo',
  };
  assert.deepEqual(filterClothingPieces([piece], 'example.invalid'), [piece]);
  assert.deepEqual(filterClothingPieces([piece], 'ESPORTIVO'), [piece]);
});
