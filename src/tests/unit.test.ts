import { describe, it, expect } from 'vitest';
import { Tier, isValidTier, getTierDecayFactor } from '../types';
import { ValidationError } from '../utils/error';
import { hashContent } from '../utils/validation';

describe('Types', () => {
  it('should validate tiers', () => {
    expect(isValidTier('permanent')).toBe(true);
    expect(isValidTier('longterm')).toBe(true);
    expect(isValidTier('shortterm')).toBe(true);
    expect(isValidTier('instant')).toBe(true);
    expect(isValidTier('invalid')).toBe(false);
  });

  it('should return correct decay factors', () => {
    expect(getTierDecayFactor('permanent')).toBe(1);
    expect(getTierDecayFactor('longterm')).toBe(0.99);
    expect(getTierDecayFactor('shortterm')).toBe(0.90);
    expect(getTierDecayFactor('instant')).toBe(0.50);
  });
});

describe('Validation', () => {
  it('should hash content consistently', () => {
    const h1 = hashContent('hello');
    const h2 = hashContent('hello');
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });
});

describe('Errors', () => {
  it('should create ValidationError', () => {
    const err = new ValidationError('field', 'bad');
    expect(err.message).toBe('Validation failed: field - bad');
    expect(err.field).toBe('field');
  });
});
