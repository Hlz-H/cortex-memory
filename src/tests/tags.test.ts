import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../db/database';
import { migrateUp } from '../db/migrations';
import { getConfig } from '../config/index';
import { getLogger } from '../utils/logger';
import { createMemory } from '../memory/store';
import { createTag, assignTag, getMemoryTags, listTags, deleteTag } from '../tags/index';

const config = getConfig();
config.dbPath = '/tmp/cortex-tags-test.db';

beforeAll(() => {
  getLogger({ silent: true });
  initDatabase();
  migrateUp();
});

afterAll(() => closeDatabase());

describe('Tag System', () => {
  it('should create a tag', () => {
    const tag = createTag('test-tag');
    expect(tag.name).toBe('test-tag');
    expect(tag.id).toHaveLength(36);
  });

  it('should assign tag to memory', () => {
    const mem = createMemory('Tagged memory', 'shortterm');
    const tag = createTag('important');
    assignTag(mem.id, tag.id);
    const tags = getMemoryTags(mem.id);
    expect(tags.length).toBeGreaterThanOrEqual(1);
    expect(tags.some(t => t.name === 'important')).toBe(true);
  });

  it('should list all tags', () => {
    createTag('alpha');
    createTag('beta');
    const tags = listTags();
    expect(tags.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete a tag', () => {
    const tag = createTag('temp-tag');
    deleteTag(tag.id);
    const tags = listTags();
    expect(tags.some(t => t.id === tag.id)).toBe(false);
  });
});
