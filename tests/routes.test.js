const request = require('supertest');
const app = require('../app');

describe('GET /', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  test('renders all 3 books', async () => {
    const res = await request(app).get('/');
    expect(res.text).toContain('The Art of Doing Science and Engineering');
    expect(res.text).toContain('The Making of Prince of Persia');
    expect(res.text).toContain('Working in Public');
  });
});

describe('GET /checkout', () => {
  test('returns 200 for valid bookId', async () => {
    const res = await request(app).get('/checkout?bookId=1');
    expect(res.status).toBe(200);
    expect(res.text).toContain('The Art of Doing Science and Engineering');
  });

  test('returns 404 for invalid bookId', async () => {
    const res = await request(app).get('/checkout?bookId=99');
    expect(res.status).toBe(404);
  });

  test('renders publishable key in form', async () => {
    const res = await request(app).get('/checkout?bookId=2');
    expect(res.text).toContain('data-publishable-key="pk_test_placeholder"');
  });
});

describe('GET /success', () => {
  test('redirects to / without session_id', async () => {
    const res = await request(app).get('/success');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});
