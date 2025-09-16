// prisma-repl.ts
import repl from 'repl';

import { prisma } from './config/prisma';

const r = repl.start({
  prompt: 'prisma> ',
});

r.context.prisma = prisma;

r.on('exit', async () => {
  console.log('Disconnecting Prisma Client...');
  await prisma.$disconnect();
  console.log('Bye!');
});
