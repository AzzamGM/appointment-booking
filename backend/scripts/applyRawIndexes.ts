import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const RAW_SQL_MIGRATIONS = [
  '20260720000000_add_active_appointment_slot_backstop',
];

async function main() {
  const prisma = new PrismaClient();
  try {
    for (const name of RAW_SQL_MIGRATIONS) {
      const file = join(__dirname, '..', 'prisma', 'migrations', name, 'migration.sql');
      const sql = readFileSync(file, 'utf8');

      const statements = sql
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        await prisma.$executeRawUnsafe(statement);
      }
      console.log(`[raw-indexes] applied ${name} (${statements.length} statement(s))`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[raw-indexes] failed:', err);
  process.exit(1);
});
