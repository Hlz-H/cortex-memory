import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { initDatabase, closeDatabase } from '../db/database';
import { migrateUp } from '../db/migrations';
import { getConfig } from '../config/index';
import { getLogger } from '../utils/logger';
import {
  createMemory, getMemory, listMemories, updateMemory, deleteMemory,
  promoteMemory, demoteMemory, getStats,
} from '../memory/store';
import { ValidationError, NotFoundError } from '../utils/error';

const config = getConfig();
config.dbPath = '/tmp/cortex-memory-test.db';

beforeAll(() => {
  getLogger({ silent: true });
  initDatabase();
  migrateUp();
});

beforeEach(() => {
  // clean slate for each test
});

afterAll(() => closeDatabase());

describe('Memory Store', () => {
  it('should create a memory', () => {
    const mem = createMemory('Test memory content', 'shortterm', 'test');
    expect(mem).toBeDefined();
    expect(mem.content).toBe('Test memory content');
    expect(mem.tier).toBe('shortterm');
    expect(mem.category).toBe('test');
    expect(mem.id).toHaveLength(36);
  });

  it('should get memory by id', () => {
    const mem = createMemory('Get test', 'longterm');
    const found = getMemory(mem.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(mem.id);
  });

  it('should return null for unknown id', () => {
    expect(getMemory('nonexistent-uuid')).toBeNull();
  });

  it('should list memories with filters', () => {
    createMemory('Alpha', 'shortterm');
    createMemory('Beta', 'longterm');
    const all = listMemories({ limit: 100 });
    expect(all.length).toBeGreaterThanOrEqual(2);
    const short = listMemories({ tier: 'shortterm', limit: 100 });
    expect(short.every(m => m.tier === 'shortterm')).toBe(true);
  });

  it('should update memory content', () => {
    const mem = createMemory('Original', 'shortterm');
    const updated = updateMemory(mem.id, { content: 'Updated' });
    expect(updated).toBeDefined();
    expect(updated!.content).toBe('Updated');
  });

  it('should delete memory', () => {
    const mem = createMemory('To delete', 'shortterm');
    expect(deleteMemory(mem.id)).toBe(true);
    expect(getMemory(mem.id)).toBeNull();
    expect(deleteMemory(mem.id)).toBe(false);
  });

  it('should promote memory tiers', () => {
    const mem = createMemory('Promote me', 'shortterm');
    expect(promoteMemory(mem.id)!.tier).toBe('longterm');
    expect(promoteMemory(mem.id)!.tier).toBe('permanent');
    expect(promoteMemory(mem.id)!.tier).toBe('permanent'); // capped
  });

  it('should demote memory tiers', () => {
    const mem = createMemory('Demote me', 'permanent');
    expect(demoteMemory(mem.id)!.tier).toBe('longterm');
    expect(demoteMemory(mem.id)!.tier).toBe('shortterm');
    expect(demoteMemory(mem.id)!.tier).toBe('instant');
    expect(demoteMemory(mem.id)!.tier).toBe('instant'); // capped
  });

  it('should reject invalid tier in create', () => {
    expect(() => createMemory('x', 'invalid' as any)).toThrow(ValidationError);
  });

  it('should provide stats', () => {
    const stats = getStats();
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.total_tags).toBeGreaterThanOrEqual(0);
    expect(Object.keys(stats.by_tier)).toContain('permanent');
  });
});
