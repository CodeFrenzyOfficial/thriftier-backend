import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const initPrisma = async () => {
    try {
        await prisma.$queryRaw`SELECT 1`; // Simple DB ping
        console.log("✅ PostgreSQL connected via Prisma");
    } catch (error) {
        console.error("❌ Prisma failed to connect to PostgreSQL:", error);
        process.exit(1); // Exit if DB connection is critical
    }
};
