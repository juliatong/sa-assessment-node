const request = require('supertest');

jest.mock('../../config/stripe', () => ({
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({ client_secret: 'cs_test_secret_123' })
    }
  }
}));

const app = require('../../app');

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

describe('POST /checkout', () => {
  test('returns clientSecret for valid bookId', async () => {
    const res = await request(app)
      .post('/checkout')
      .send({ bookId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.clientSecret).toBe('cs_test_secret_123');
  });

  test('returns 400 for invalid bookId', async () => {
    const res = await request(app)
      .post('/checkout')
      .send({ bookId: 99 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
