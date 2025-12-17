/**
 * Make a user an admin
 * Usage: npx ts-node scripts/make-admin.ts your@email.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
    const email = process.argv[2];

    if (!email) {
        console.log('Usage: npx ts-node scripts/make-admin.ts your@email.com');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { email },
            data: { role: 'admin' },
        });

        console.log(`\n✅ Success! ${user.email} is now an admin.\n`);
        console.log('You can now access /admin after logging in.\n');
    } catch (error) {
        console.error(`\n❌ Error: User with email "${email}" not found.\n`);
        console.log('Make sure you registered first at /register\n');
    } finally {
        await prisma.$disconnect();
    }
}

makeAdmin();
