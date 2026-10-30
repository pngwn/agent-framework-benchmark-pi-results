import { dexNumber, humanize, orDash } from './format';

describe('format', () => {
  it('humanizes API names', () => {
    expect(humanize('mr-mime')).toBe('Mr Mime');
    expect(humanize('thunder-punch')).toBe('Thunder Punch');
    expect(humanize('pikachu')).toBe('Pikachu');
  });

  it('formats dex numbers', () => {
    expect(dexNumber(25)).toBe('#0025');
    expect(dexNumber(1026)).toBe('#1026');
  });

  it('shows missing values as an em dash', () => {
    expect(orDash(null)).toBe('—');
    expect(orDash(0)).toBe('0');
    expect(orDash('Special')).toBe('Special');
  });
});
