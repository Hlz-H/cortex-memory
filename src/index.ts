#!/usr/bin/env node
import { Command } from 'commander';
import * as commands from './cli/commands';

const program = new Command();

program
  .name('cortex')
  .description('Local AI Memory Engine - CLI')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize the memory database')
  .action(commands.initCommand);

program
  .command('add <content>')
  .description('Add a new memory')
  .option('-t, --tag <tags...>', 'Tags to assign')
  .option('-c, --category <category>', 'Category')
  .option('-i, --important', 'Mark as important (longterm tier)')
  .option('--instant', 'Mark as instant tier')
  .action(commands.addCommand);

program
  .command('list')
  .description('List memories')
  .option('--tier <tier>', 'Filter by tier (permanent/longterm/shortterm/instant)')
  .option('--tag <tag>', 'Filter by tag name')
  .option('--category <category>', 'Filter by category')
  .option('-l, --limit <n>', 'Maximum results', parseInt)
  .option('--offset <n>', 'Result offset', parseInt)
  .action(commands.listCommand);

program
  .command('search <query>')
  .description('Search memories')
  .option('--tier <tier>', 'Filter by tier')
  .option('--tag <tag>', 'Filter by tag name')
  .action(commands.searchCommand);

program
  .command('get <id>')
  .description('Get memory details')
  .action(commands.getCommand);

program
  .command('promote <id>')
  .description('Promote memory to higher tier')
  .action(commands.promoteCommand);

program
  .command('demote <id>')
  .description('Demote memory to lower tier')
  .action(commands.demoteCommand);

program
  .command('forget <id>')
  .description('Delete a memory')
  .action(commands.forgetCommand);

program
  .command('tag')
  .description('Manage tags')
  .argument('<subcommand>', 'create, delete, or list')
  .argument('[args...]', 'Arguments for subcommand')
  .action(commands.tagCommand);

program
  .command('link <sourceId> <targetId>')
  .description('Link two memories')
  .option('--type <type>', 'Link type', 'related_to')
  .option('--weight <w>', 'Link weight', parseFloat)
  .action(commands.linkCommand);

program
  .command('stats')
  .description('Show system statistics')
  .action(commands.statsCommand);

program
  .command('serve')
  .description('Start the web server')
  .option('-p, --port <port>', 'Port number', parseInt)
  .action(commands.serveCommand);

program
  .command('mcp')
  .description('Start MCP server (stdio)')
  .action(commands.mcpCommand);

program
  .command('agent')
  .description('Manage agents')
  .argument('<action>', 'list or run')
  .argument('[id]', 'Agent ID (for run)')
  .action(async (action: string, id?: string) => {
    if (action === 'list') {
      commands.agentListCommand();
    } else if (action === 'run') {
      if (!id) { console.error('Agent ID required'); process.exit(1); }
      await commands.agentRunCommand(id);
    } else {
      console.error('Unknown action. Use: list, run <id>');
      process.exit(1);
    }
  });

program.parse(process.argv);
