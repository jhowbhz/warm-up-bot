import { QueryInterface, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export interface Migration {
  name: string;
  up: (queryInterface: QueryInterface, dataTypes: typeof DataTypes) => Promise<void>;
  down: (queryInterface: QueryInterface, dataTypes: typeof DataTypes) => Promise<void>;
}

const MIGRATIONS_TABLE = 'sequelize_migrations';

async function ensureMigrationsTable(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS \`${MIGRATIONS_TABLE}\` (
      \`id\` INT AUTO_INCREMENT PRIMARY KEY,
      \`name\` VARCHAR(255) NOT NULL UNIQUE,
      \`executed_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getExecutedMigrations(): Promise<string[]> {
  const [rows] = await sequelize.query(
    `SELECT name FROM \`${MIGRATIONS_TABLE}\` ORDER BY id ASC`
  );
  return (rows as any[]).map(r => r.name);
}

async function markAsExecuted(name: string): Promise<void> {
  await sequelize.query(
    `INSERT INTO \`${MIGRATIONS_TABLE}\` (name) VALUES (?)`,
    { replacements: [name] }
  );
}

async function markAsReverted(name: string): Promise<void> {
  await sequelize.query(
    `DELETE FROM \`${MIGRATIONS_TABLE}\` WHERE name = ?`,
    { replacements: [name] }
  );
}

export async function runMigrations(migrations: Migration[]): Promise<{ executed: string[]; skipped: string[] }> {
  await sequelize.authenticate();
  await ensureMigrationsTable();

  const executed = await getExecutedMigrations();
  const queryInterface = sequelize.getQueryInterface();
  const result = { executed: [] as string[], skipped: [] as string[] };

  for (const migration of migrations) {
    if (executed.includes(migration.name)) {
      result.skipped.push(migration.name);
      continue;
    }

    console.log(`⬆ Executando migration: ${migration.name}`);
    const start = Date.now();

    try {
      await migration.up(queryInterface, DataTypes);
      await markAsExecuted(migration.name);
      const elapsed = Date.now() - start;
      console.log(`  ✓ Concluída em ${elapsed}ms`);
      result.executed.push(migration.name);
    } catch (error: any) {
      console.error(`  ✗ Falha na migration ${migration.name}:`, error.message);
      throw error;
    }
  }

  return result;
}

export async function revertLastMigration(migrations: Migration[]): Promise<string | null> {
  await sequelize.authenticate();
  await ensureMigrationsTable();

  const executed = await getExecutedMigrations();
  if (executed.length === 0) {
    console.log('Nenhuma migration para reverter.');
    return null;
  }

  const lastName = executed[executed.length - 1];
  const migration = migrations.find(m => m.name === lastName);
  if (!migration) {
    console.error(`Migration "${lastName}" não encontrada nos arquivos.`);
    return null;
  }

  const queryInterface = sequelize.getQueryInterface();

  console.log(`⬇ Revertendo migration: ${migration.name}`);
  try {
    await migration.down(queryInterface, DataTypes);
    await markAsReverted(migration.name);
    console.log(`  ✓ Revertida com sucesso`);
    return migration.name;
  } catch (error: any) {
    console.error(`  ✗ Falha ao reverter ${migration.name}:`, error.message);
    throw error;
  }
}

export async function getMigrationStatus(migrations: Migration[]): Promise<{
  pending: string[];
  executed: string[];
}> {
  await sequelize.authenticate();
  await ensureMigrationsTable();

  const executed = await getExecutedMigrations();
  const pending = migrations
    .filter(m => !executed.includes(m.name))
    .map(m => m.name);

  return { pending, executed };
}
