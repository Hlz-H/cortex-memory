import { ValidationError } from './error';

export function validateString(value: unknown, field: string, options?: { min?: number; max?: number }): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  if (options?.min !== undefined && value.length < options.min) {
    throw new ValidationError(`${field} must be at least ${options.min} characters`);
  }
  if (options?.max !== undefined && value.length > options.max) {
    throw new ValidationError(`${field} must be at most ${options.max} characters`);
  }
  return value;
}

export function validateTier(value: unknown): string {
  const tier = validateString(value, 'tier');
  const valid = ['permanent', 'longterm', 'shortterm', 'instant'];
  if (!valid.includes(tier)) {
    throw new ValidationError(`tier must be one of: ${valid.join(', ')}`);
  }
  return tier;
}

export function validateNumber(value: unknown, field: string, options?: { min?: number; max?: number }): number {
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  if (Number.isNaN(num)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (options?.min !== undefined && num < options.min) {
    throw new ValidationError(`${field} must be at least ${options.min}`);
  }
  if (options?.max !== undefined && num > options.max) {
    throw new ValidationError(`${field} must be at most ${options.max}`);
  }
  return num;
}

export function validateStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${field} must be an array`);
  }
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new ValidationError(`${field} must be an array of strings`);
    }
  }
  return value as string[];
}

export function validateId(value: unknown): string {
  const id = validateString(value, 'id', { min: 1 });
  // UUID v4 or short form
  if (!/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i.test(id) && id.length < 8) {
    throw new ValidationError('id must be a valid UUID or at least 8 characters');
  }
  return id;
}

export function validateLinkType(value: unknown): string {
  const type = validateString(value, 'link_type');
  const valid = ['related_to', 'depends_on', 'derived_from', 'contradicts', 'generalizes', 'sequential', 'custom'];
  if (!valid.includes(type)) {
    throw new ValidationError(`link_type must be one of: ${valid.join(', ')}`);
  }
  return type;
}

export function sanitizeSearchQuery(query: string): string {
  // Basic FTS5 sanitization: remove control chars, limit length
  return query
    .replace(/[\x00-\x1F\x7F]/g, '')
    .substring(0, 200);
}

export function hashContent(content: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}
