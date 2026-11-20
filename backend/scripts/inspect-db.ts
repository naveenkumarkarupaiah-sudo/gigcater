// backend/scripts/inspect-db.ts
// This script performs a read‑only inspection of the live PostgreSQL database.
// It lists tables, columns (name & PostgreSQL data type), enum types and the values
// each enum contains. No data is modified and no migrations are run.

import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  // -------------------------------------------------
  // 1️⃣ List all tables in the public schema
  // -------------------------------------------------
  const tables = await prisma.$queryRaw<
    { table_name: string }[]
  >`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`;

  console.log("=== Tables ===");
  tables.forEach((t) => console.log(`- ${t.table_name}`));

  // -------------------------------------------------
  // 2️⃣ For each table, list its columns (name & type)
  // -------------------------------------------------
  console.log("\n=== Columns per table ===");
  for (const { table_name } of tables) {
    const cols = await prisma.$queryRaw<
      { column_name: string; data_type: string }[]
    >`SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ${table_name}
       ORDER BY ordinal_position;`;

    console.log(`\n${table_name}:`);
    cols.forEach((c) => console.log(`  - ${c.column_name}: ${c.data_type}`));
  }

  // -------------------------------------------------
  // 3️⃣ List all enum types and their values
  // -------------------------------------------------
  const enums = await prisma.$queryRaw<
    { enum_name: string }[]
  >`SELECT t.typname AS enum_name
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     GROUP BY enum_name
     ORDER BY enum_name;`;

  console.log("\n=== Enums and values ===");
  for (const { enum_name } of enums) {
    const values = await prisma.$queryRaw<
      { enumlabel: string }[]
    >`SELECT enumlabel
       FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = ${enum_name}
       ORDER BY enumsortorder;`;
    console.log(`\n${enum_name}:`);
    values.forEach((v) => console.log(`  - ${v.enumlabel}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("❌ Inspection failed:", e);
  process.exit(1);
});
