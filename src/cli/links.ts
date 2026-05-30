import { createLink } from '../links/index';
import { ValidationError } from '../utils/error';

export function linkCommand(sourceId: string, targetId: string, options: { type?: string; weight?: number }): void {
  try {
    const link = createLink(sourceId, targetId, options.type, options.weight);
    console.log(`✓ Linked ${sourceId.substring(0, 8)} → ${targetId.substring(0, 8)} (${link.link_type})`);
  } catch (e: unknown) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}
