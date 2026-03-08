const request = require('supertest');
const app = require('../../app');

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
