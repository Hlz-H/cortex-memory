import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { initDatabase, closeDatabase } from '../db/database';
import { migrateUp, getCurrentVersion } from '../db/migrations';
import { getConfig } from '../config/index';
import { getLogger } from '../utils/logger';

const config = getConfig();
config.dbPath = '/tmp/cortex-test.db'; // override for tests

beforeAll(() => {
  getLogger({ silent: true });
  initDatabase();
  migrateUp();
});

afterAll(() => {
  closeDatabase();
});

describe('Database', () => {
  it('should initialize and apply migrations', () => {
    const version = getCurrentVersion();
    expect(version).toBeGreaterThanOrEqual(1);
  });
});

describe('Config', () => {
  it('should load default config', () => {
    expect(config.serverPort).toBe(3456);
    expect(config.defaultModel).toBe('llama3.2');
    expect(config.agent.timeoutMs).toBe(30000);
    expect(config.agent.maxRetries).toBe(2);
  });
});
