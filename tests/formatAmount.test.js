const formatAmount = require('../lib/formatAmount');

describe('formatAmount', () => {
  test('converts 2300 to $23.00', () => {
    expect(formatAmount(2300)).toBe('$23.00');
  });

  test('converts 2500 to $25.00', () => {
    expect(formatAmount(2500)).toBe('$25.00');
  });

  test('converts 2800 to $28.00', () => {
    expect(formatAmount(2800)).toBe('$28.00');
  });

  test('handles zero cents', () => {
    expect(formatAmount(0)).toBe('$0.00');
  });

  test('always returns two decimal places', () => {
    expect(formatAmount(100)).toBe('$1.00');
    expect(formatAmount(150)).toBe('$1.50');
  });
});
