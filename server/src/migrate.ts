import 'dotenv/config';
import { runMigrations, revertLastMigration, getMigrationStatus } from './migrations/runner';
import migrations from './migrations';

const command = process.argv[2] || 'up';

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       Migration Runner v1.0           ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  switch (command) {
    case 'up': {
      console.log('▶ Executando migrations pendentes...\n');
      const result = await runMigrations(migrations);

      console.log('');
      if (result.executed.length > 0) {
        console.log(`✅ ${result.executed.length} migration(s) executada(s):`);
        result.executed.forEach(m => console.log(`   • ${m}`));
      } else {
        console.log('✅ Banco de dados já está atualizado.');
      }
      if (result.skipped.length > 0) {
        console.log(`⏭  ${result.skipped.length} migration(s) já executada(s)`);
      }
      break;
    }

    case 'down': {
      console.log('▶ Revertendo última migration...\n');
      const reverted = await revertLastMigration(migrations);
      if (reverted) {
        console.log(`\n✅ Migration "${reverted}" revertida.`);
      } else {
        console.log('\n⚠ Nada para reverter.');
      }
      break;
    }

    case 'status': {
      console.log('▶ Status das migrations:\n');
      const status = await getMigrationStatus(migrations);

      if (status.executed.length > 0) {
        console.log(`Executadas (${status.executed.length}):`);
        status.executed.forEach(m => console.log(`   ✓ ${m}`));
      }
      if (status.pending.length > 0) {
        console.log(`\nPendentes (${status.pending.length}):`);
        status.pending.forEach(m => console.log(`   ○ ${m}`));
      }
      if (status.executed.length === 0 && status.pending.length === 0) {
        console.log('   Nenhuma migration registrada.');
      }
      break;
    }

    default:
      console.log('Uso: npx ts-node src/migrate.ts [up|down|status]');
      console.log('');
      console.log('  up      Executa todas as migrations pendentes (padrão)');
      console.log('  down    Reverte a última migration executada');
      console.log('  status  Mostra o status de todas as migrations');
  }

  console.log('');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Erro fatal:', err.message);
  process.exit(1);
});
