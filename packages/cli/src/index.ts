#!/usr/bin/env node
import { Command } from 'commander';
import open from 'open';
import { startServer } from '@npvm/server';

const program = new Command();

program
  .name('npvm')
  .description('Node Package Manager Visual Platform')
  .version('0.1.0');

program
  .command('start')
  .description('Start the visual package manager')
  .option('-p, --port <port>', 'Server port', '3456')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const projectPath = options.dir;

    console.log('🚀 Starting NPVM...');
    console.log(`📁 Project: ${projectPath}`);

    await startServer({
      port,
      host: 'localhost',
      projectPath,
    });

    const url = `http://localhost:${port}`;

    if (options.open !== false) {
      console.log(`🌐 Opening browser at ${url}`);
      await open(url);
    } else {
      console.log(`🌐 Server running at ${url}`);
    }
  });

program
  .command('dev')
  .description('Start in development mode (server only)')
  .option('-p, --port <port>', 'Server port', '3456')
  .option('-d, --dir <directory>', 'Project directory', process.cwd())
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const projectPath = options.dir;

    console.log('🔧 Starting NPVM in dev mode...');
    console.log(`📁 Project: ${projectPath}`);

    await startServer({
      port,
      host: 'localhost',
      projectPath,
    });
  });

program.parse();
