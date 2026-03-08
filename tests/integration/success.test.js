const request = require('supertest');

jest.mock('../../config/stripe', () => ({
  checkout: {
    sessions: {
      retrieve: jest.fn().mockResolvedValue({
        status: 'complete',
        payment_intent: {
          id: 'pi_test_123',
          amount: 2300
        }
      })
    }
  }
}));

const app = require('../../app');

describe('GET /success', () => {
  test('redirects to / without session_id', async () => {
    const res = await request(app).get('/success');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  test('renders pi_ ID and amount for complete session', async () => {
    const res = await request(app).get('/success?session_id=cs_test_123');
    expect(res.status).toBe(200);
    expect(res.text).toContain('pi_test_123');
    expect(res.text).toContain('$23.00');
  });
});
