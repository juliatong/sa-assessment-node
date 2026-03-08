const request = require('supertest');

jest.mock('../../config/stripe', () => ({
  webhooks: {
    constructEvent: jest.fn()
  }
}));

const stripe = require('../../config/stripe');
const app = require('../../app');

describe('POST /webhook', () => {
  test('returns 400 when signature verification fails', async () => {
    stripe.webhooks.constructEvent.mockImplementationOnce(() => {
      throw new Error('Invalid signature');
    });

    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'bad_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(res.status).toBe(400);
  });

  test('returns 200 for valid event', async () => {
    stripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_123' } }
    });

    const res = await request(app)
      .post('/webhook')
      .set('stripe-signature', 'valid_sig')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ type: 'checkout.session.completed' }));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
  });
});
