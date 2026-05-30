import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../db/database';
import { migrateUp } from '../db/migrations';
import { getConfig } from '../config/index';
import { getLogger } from '../utils/logger';
import { createMemory } from '../memory/store';
import { createLink, getRelatedMemories, getLinkStats } from '../links/index';
import { ValidationError } from '../utils/error';

const config = getConfig();
config.dbPath = '/tmp/cortex-links-test.db';

beforeAll(() => {
  getLogger({ silent: true });
  initDatabase();
  migrateUp();
});

afterAll(() => closeDatabase());

describe('Link System', () => {
  it('should create a link between memories', () => {
    const m1 = createMemory('Memory A', 'shortterm');
    const m2 = createMemory('Memory B', 'shortterm');
    const link = createLink(m1.id, m2.id, 'related_to', 0.8);
    expect(link.source_id).toBe(m1.id);
    expect(link.target_id).toBe(m2.id);
    expect(link.link_type).toBe('related_to');
    expect(link.weight).toBe(0.8);
  });

  it('should get related memories', () => {
    const m1 = createMemory('Source', 'shortterm');
    const m2 = createMemory('Target', 'shortterm');
    createLink(m1.id, m2.id, 'derived_from');
    const related = getRelatedMemories(m1.id);
    expect(related.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject self-links', () => {
    const m = createMemory('Self', 'shortterm');
    expect(() => createLink(m.id, m.id)).toThrow(ValidationError);
  });

  it('should provide link stats', () => {
    const stats = getLinkStats();
    expect(Array.isArray(stats)).toBe(true);
  });
});
