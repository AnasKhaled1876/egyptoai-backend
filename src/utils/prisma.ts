import { PrismaClient } from '@prisma/client';

// Add Prisma to the Node.js global type
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'error', 'warn'] 
    : ['error']
});

// Enable global prisma instance in development to prevent hot-reload issues
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Handle application shutdown
const shutdown = async () => {
  if (process.env.NODE_ENV === 'test') return;
  
  try {
    await prisma.$disconnect();
    console.log('Prisma Client disconnected');
  } catch (error) {
    console.error('Error disconnecting Prisma Client:', error);
    process.exit(1);
  }
};

// Handle different types of process termination
process.on('beforeExit', shutdown);
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  shutdown().finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown().finally(() => process.exit(1));
});

export default prisma;