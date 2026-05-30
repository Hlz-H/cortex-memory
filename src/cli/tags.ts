import { createTag, deleteTag, listTags, getTagByName } from '../tags/index';
import { ValidationError } from '../utils/error';

function getShortId(id: string): string { return id.substring(0, 8); }

export function tagCreateCommand(name: string, description?: string): void {
  try {
    const tag = createTag(name, undefined, description);
    console.log(`✓ Tag created: ${tag.name} (${getShortId(tag.id)})`);
  } catch (e: unknown) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

export function tagDeleteCommand(nameOrId: string): void {
  try {
    const tag = getTagByName(nameOrId) || { id: nameOrId };
    deleteTag(tag.id);
    console.log(`✓ Tag deleted: ${nameOrId}`);
  } catch (e: unknown) {
    console.error(`Error: ${(e as Error).message}`);
    process.exit(1);
  }
}

export function tagListCommand(): void {
  const tags = listTags();
  if (tags.length === 0) { console.log('No tags.'); return; }
  console.log(`\n${tags.length} tags:\n`);
  for (const t of tags) {
    console.log(`  ${t.name.padEnd(20)} ${getShortId(t.id)}`);
  }
  console.log();
}
