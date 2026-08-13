import { PrismaClient } from '@prisma/client';

const prisma = globalThis.prisma || new PrismaClient();

globalThis.prisma = prisma;

export default prisma;
