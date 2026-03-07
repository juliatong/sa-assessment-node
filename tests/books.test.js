const books = require('../data/books');

describe('books data', () => {
  test('has 3 books', () => {
    expect(books).toHaveLength(3);
  });

  test('each book has required fields', () => {
    books.forEach(book => {
      expect(book).toHaveProperty('id');
      expect(book).toHaveProperty('title');
      expect(book).toHaveProperty('author');
      expect(book).toHaveProperty('price');
      expect(book).toHaveProperty('image');
      expect(book).toHaveProperty('description');
    });
  });

  test('prices are positive integers (cents)', () => {
    books.forEach(book => {
      expect(Number.isInteger(book.price)).toBe(true);
      expect(book.price).toBeGreaterThan(0);
    });
  });

  test('ids are unique', () => {
    const ids = books.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('book 1 price is 2300', () => {
    expect(books.find(b => b.id === 1).price).toBe(2300);
  });
});
