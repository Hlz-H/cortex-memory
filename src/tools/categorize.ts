/**
 * Keyword-based memory categorization heuristics.
 * Maps memory content to a category based on keyword matching.
 * Deterministic, zero-cost (no LLM needed).
 */

export interface CategoryRule {
  category: string;
  /** Keywords that map to this category (case-insensitive match) */
  keywords: string[];
}

const CATEGORY_RULES: CategoryRule[] = [
  // Project & development
  { category: 'bugfix',       keywords: ['bugfix', 'bug fix', '修复', 'fix:', 'patch', 'hotfix', 'tokenizer', '中文搜索'] },
  { category: 'feature',      keywords: ['feature', 'agent系统', 'auto-summariz', 'generat summary', 'summarization', '新增', '实现了'] },
  { category: 'refactoring',  keywords: ['refactor', '重构', '模块化', '优化', '结构化日志'] },
  { category: 'release',      keywords: ['release', 'v0.', '发布', 'e2e验证', '版本'] },
  { category: 'architecture', keywords: ['architecture', 'tier存储', 'fts5', '架构', '存储模型', '设计'] },
  { category: 'deployment',   keywords: ['deploy', 'docker', 'systemd', '容器', 'edge devices', 'local llm deployment'] },

  // Integration & config
  { category: 'integration',  keywords: ['hermes', 'mcp server', 'mcp', '集成', 'plugin', 'cursor', 'vs code'] },
  { category: 'config',       keywords: ['config', '配置', '设置', 'auto-record', '自动记录'] },
  { category: 'setup',        keywords: ['project setup', 'build instructions', 'install', '安装'] },

  // Knowledge & research
  { category: 'research',     keywords: ['gpt-4', 'llm', 'privacy', '人工智能', '机器学习', 'deep learning', 'neural', 'nlp'] },
  { category: 'frontend',     keywords: ['react', 'frontend', 'hooks', 'usememo', 'usestate', 'useeffect', 'component', 'ui', 'css'] },
  { category: 'docs',         keywords: ['doc', 'guide', '手册', 'readme', 'setup guide', 'how to'] },

  // Meta & misc
  { category: 'meta',         keywords: ['系统策略', '自动判断', 'system polic'] },
  { category: 'planning',     keywords: ['需求', '类似git', '四层存储', 'project requirement'] },
  { category: 'demo',         keywords: ['演示', 'demo', '测试cortex'] },
  { category: 'testing',     keywords: ['测试记忆', 'test case', 'e2e test'] },
  { category: 'meeting',     keywords: ['meeting', '会议', 'standup'] },
  { category: 'todo',         keywords: ['todo', 'task', 'check docker', 'action item'] },
  { category: 'idea',         keywords: ['random idea', 'quick idea', 'quick thought', 'maybe', 'brainstorm'] },
  { category: 'stats',        keywords: ['数据库共', 'statistics', 'stats', '总计'] },
];

const DEFAULT_CATEGORY = 'general';

/**
 * Categorize a memory based on its content using keyword heuristics.
 * Returns the first matching category, or 'general' if no keywords match.
 */
export function categorizeByKeywords(content: string): string {
  const lower = content.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return rule.category;
      }
    }
  }

  return DEFAULT_CATEGORY;
}

/**
 * Categorize with optional tag hints.
 * If tags contain a recognizable category keyword, use that;
 * otherwise fall back to content-based categorization.
 */
export function categorizeWithTags(content: string, tags?: string[]): string {
  // Tags often already encode category info (e.g. 'bugfix', 'architecture')
  if (tags && tags.length > 0) {
    const tagLower = tags.map(t => t.toLowerCase());
    for (const rule of CATEGORY_RULES) {
      for (const keyword of rule.keywords) {
        if (tagLower.some(t => t.includes(keyword) || keyword.includes(t))) {
          return rule.category;
        }
      }
    }
  }

  return categorizeByKeywords(content);
}
