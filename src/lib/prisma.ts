import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// 1. Create a pg Pool instance
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// 2. Pass the Pool instance to the adapter
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ 
    adapter, 
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'] 
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;