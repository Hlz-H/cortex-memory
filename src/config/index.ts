import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CortexConfig {
  dbPath: string;
  serverPort: number;
  ollamaBaseUrl: string;
  defaultModel: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logFile?: string;
  agent: {
    enabled: boolean;
    defaultModel: string;
    timeoutMs: number;
    maxRetries: number;
  };
}

const DEFAULT_CONFIG: CortexConfig = {
  dbPath: path.join(os.homedir(), '.cortex', 'memory.db'),
  serverPort: 3456,
  ollamaBaseUrl: 'http://localhost:11434',
  defaultModel: 'llama3.2',
  logLevel: 'info',
  agent: {
    enabled: true,
    defaultModel: 'llama3.2',
    timeoutMs: 30000,
    maxRetries: 2,
  },
};

let cachedConfig: CortexConfig | null = null;

function getConfigDir(): string {
  return path.join(os.homedir(), '.cortex');
}

function getConfigFilePath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function loadConfig(): CortexConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = getConfigFilePath();
  let fileConfig: Partial<CortexConfig> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      fileConfig = JSON.parse(raw);
    } catch {
      // Ignore corrupt config, use defaults
    }
  }

  // Environment variable overrides
  const envConfig: Partial<CortexConfig> = {};
  if (process.env.CORTEX_DB_PATH) envConfig.dbPath = process.env.CORTEX_DB_PATH;
  if (process.env.CORTEX_PORT) envConfig.serverPort = parseInt(process.env.CORTEX_PORT, 10);
  if (process.env.CORTEX_OLLAMA_URL) envConfig.ollamaBaseUrl = process.env.CORTEX_OLLAMA_URL;
  if (process.env.CORTEX_MODEL) envConfig.defaultModel = process.env.CORTEX_MODEL;
  if (process.env.CORTEX_LOG_LEVEL) {
    const level = process.env.CORTEX_LOG_LEVEL as CortexConfig['logLevel'];
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      envConfig.logLevel = level;
    }
  }

  cachedConfig = {
    ...DEFAULT_CONFIG,
    ...fileConfig,
    ...envConfig,
    agent: {
      ...DEFAULT_CONFIG.agent,
      ...fileConfig.agent,
      ...envConfig.agent,
    },
  };

  return cachedConfig;
}

export function saveConfig(config: Partial<CortexConfig>): void {
  const current = loadConfig();
  const merged = { ...current, ...config, agent: { ...current.agent, ...config.agent } };
  const dir = getConfigDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(merged, null, 2));
  cachedConfig = merged as CortexConfig;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export function getConfig(): CortexConfig {
  return loadConfig();
}
