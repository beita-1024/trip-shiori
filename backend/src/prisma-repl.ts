// prisma-repl.ts
import { PrismaClient } from '@prisma/client'
import repl from 'repl'

const prisma = new PrismaClient()

const r = repl.start({
  prompt: 'prisma> ',
})

r.context.prisma = prisma

r.on('exit', async () => {
  console.log('Disconnecting Prisma Client...')
  await prisma.$disconnect()
  console.log('Bye!')
})
