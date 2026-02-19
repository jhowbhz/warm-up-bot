import { Sequelize } from 'sequelize';
import { config } from './env';

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: config.server.nodeEnv === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;

export async function connectDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✓ Conexão com MySQL estabelecida com sucesso.');

    const { runMigrations } = await import('../migrations/runner');
    const { default: migrations } = await import('../migrations');

    const result = await runMigrations(migrations);
    if (result.executed.length > 0) {
      console.log(`✓ ${result.executed.length} migration(s) executada(s).`);
    } else {
      console.log('✓ Banco de dados atualizado (nenhuma migration pendente).');
    }

    return true;
  } catch (error) {
    console.error('✗ Erro ao conectar ao banco de dados:', error);
    return false;
  }
}
