#!/usr/bin/env node
import { Command } from 'commander';
import {
  initCommand, statsCommand, serveCommand, mcpCommand, getCommand,
} from './cli/system';
import {
  addCommand, listCommand, searchCommand, promoteCommand, demoteCommand, forgetCommand,
} from './cli/memory';
import { tagCreateCommand, tagDeleteCommand, tagListCommand } from './cli/tags';
import { linkCommand } from './cli/links';
import { agentListCommand, agentRunCommand } from './cli/agent';

const program = new Command();

program
  .name('cortex')
  .description('Local AI Memory Engine - CLI')
  .version('0.1.0');

program.command('init').description('Initialize the memory database').action(initCommand);

program.command('add <content>')
  .description('Add a new memory')
  .option('-t, --tag <tags...>', 'Tags to assign')
  .option('-c, --category <category>', 'Category')
  .option('-i, --important', 'Mark as important (longterm tier)')
  .option('--instant', 'Mark as instant tier')
  .action(addCommand);

program.command('list')
  .description('List memories')
  .option('--tier <tier>', 'Filter by tier')
  .option('--tag <tag>', 'Filter by tag name')
  .option('--category <category>', 'Filter by category')
  .option('-l, --limit <n>', 'Max results', parseInt)
  .option('--offset <n>', 'Result offset', parseInt)
  .action(listCommand);

program.command('search <query>')
  .description('Search memories')
  .option('--tier <tier>', 'Filter by tier')
  .option('--tag <tag>', 'Filter by tag')
  .action(searchCommand);

program.command('get <id>').description('Get memory details').action(getCommand);

program.command('promote <id>').description('Promote memory to higher tier').action(promoteCommand);

program.command('demote <id>').description('Demote memory to lower tier').action(demoteCommand);

program.command('forget <id>').description('Delete a memory').action(forgetCommand);

program.command('tag')
  .description('Manage tags')
  .argument('<subcommand>', 'create, delete, or list')
  .argument('[args...]', 'Arguments')
  .action((subcommand: string, args: string[]) => {
    switch (subcommand) {
      case 'create': tagCreateCommand(args[0], args.slice(1).join(' ') || undefined); break;
      case 'delete': tagDeleteCommand(args[0]); break;
      case 'list': tagListCommand(); break;
      default: console.error('Unknown subcommand. Use: create, delete, list'); process.exit(1);
    }
  });

program.command('link <sourceId> <targetId>')
  .description('Link two memories')
  .option('--type <type>', 'Link type', 'related_to')
  .option('--weight <w>', 'Link weight', parseFloat)
  .action(linkCommand);

program.command('stats').description('Show system statistics').action(statsCommand);

program.command('serve')
  .description('Start the web server')
  .option('-p, --port <port>', 'Port number', parseInt)
  .action(serveCommand);

program.command('mcp').description('Start MCP server (stdio)').action(mcpCommand);

program.command('agent')
  .description('Manage agents')
  .argument('<action>', 'list or run')
  .argument('[id]', 'Agent ID (for run)')
  .action(async (action: string, id?: string) => {
    if (action === 'list') agentListCommand();
    else if (action === 'run') {
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      await agentRunCommand(id);
    } else {
      console.error('Unknown action. Use: list, run <id>');
      process.exit(1);
    }
  });

program.parse(process.argv);
