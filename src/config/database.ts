import { PrismaClient } from '../generated/prisma/client';

type PrismaClientOptions = ConstructorParameters<typeof PrismaClient>[0];

export function createPrismaClient(options: PrismaClientOptions): PrismaClient {
  return new PrismaClient(options);
}
