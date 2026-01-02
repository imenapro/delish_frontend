import { describe, it, expect } from 'vitest';
import { generateSlug } from './utils';

describe('generateSlug', () => {
  it('should convert to lowercase', () => {
    expect(generateSlug('Bakery')).toBe('bakery');
  });

  it('should replace spaces with hyphens', () => {
    expect(generateSlug('Coffee Shop')).toBe('coffee-shop');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Bakery & Café!')).toBe('bakery-caf');
  });

  it('should handle multiple spaces', () => {
    expect(generateSlug('New   York   Pizza')).toBe('new-york-pizza');
  });

  it('should handle numbers', () => {
    expect(generateSlug('Store 123')).toBe('store-123');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});
