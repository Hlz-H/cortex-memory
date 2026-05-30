export interface DecayConfig {
  tier: 'permanent' | 'longterm' | 'shortterm' | 'instant';
  importance: number;
  hoursSinceLastAccess: number;
  accessCount: number;
}

export interface DecayResult {
  score: number;
  shouldDemote: boolean;
  shouldDelete: boolean;
  suggestedTier: string | undefined;
}

const TIER_CONFIG: Record<string, { decayPeriod: number; autoDeleteAfter: number; promoteAfter: number }> = {
  permanent: { decayPeriod: Infinity, autoDeleteAfter: Infinity, promoteAfter: Infinity },
  longterm: { decayPeriod: 720, autoDeleteAfter: Infinity, promoteAfter: 10 },
  shortterm: { decayPeriod: 168, autoDeleteAfter: 720, promoteAfter: 5 },
  instant: { decayPeriod: 24, autoDeleteAfter: 48, promoteAfter: 3 },
};

export function calculateDecay(config: DecayConfig): DecayResult {
  if (config.tier === 'permanent') {
    return { score: 1, shouldDemote: false, shouldDelete: false, suggestedTier: undefined };
  }

  const tc = TIER_CONFIG[config.tier] || TIER_CONFIG.instant;
  const rawScore = config.importance * (1 - 0.5 * Math.log2(1 + config.hoursSinceLastAccess / tc.decayPeriod));
  const score = Math.max(0, Math.min(1, rawScore));

  let suggestedTier: string | undefined;
  if (config.tier === 'instant' && config.accessCount >= tc.promoteAfter) suggestedTier = 'shortterm';
  else if (config.tier === 'shortterm' && config.accessCount >= tc.promoteAfter) suggestedTier = 'longterm';
  else if (config.tier === 'longterm' && config.accessCount >= tc.promoteAfter) suggestedTier = 'permanent';

  return {
    score,
    shouldDemote: score < 0.2 && config.tier !== 'instant',
    shouldDelete: score < 0.1 || (config.tier === 'instant' && config.hoursSinceLastAccess >= tc.autoDeleteAfter),
    suggestedTier,
  };
}

export function getTierWeight(tier: string): number {
  switch (tier) {
    case 'permanent': return 4.0;
    case 'longterm': return 3.0;
    case 'shortterm': return 2.0;
    case 'instant': return 1.0;
    default: return 1.0;
  }
}
