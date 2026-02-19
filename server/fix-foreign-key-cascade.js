const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixForeignKeyOnDeleteCascade() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Conectado ao MySQL remoto!');
    
    // 1. Remover a constraint antiga
    console.log('\n🔄 Removendo constraint antiga...');
    await connection.execute(`
      ALTER TABLE attendance_messages 
      DROP FOREIGN KEY attendance_messages_ibfk_1
    `);
    console.log('✅ Constraint antiga removida');
    
    // 2. Adicionar a nova constraint com ON DELETE CASCADE
    console.log('\n🔄 Adicionando nova constraint com ON DELETE CASCADE...');
    await connection.execute(`
      ALTER TABLE attendance_messages 
      ADD CONSTRAINT attendance_messages_ibfk_1 
      FOREIGN KEY (attendanceId) 
      REFERENCES attendances(id) 
      ON DELETE CASCADE 
      ON UPDATE CASCADE
    `);
    console.log('✅ Nova constraint adicionada com sucesso!');
    
    console.log('\n✅ Foreign key cascade corrigida! Agora deletar um attendance vai deletar suas mensagens automaticamente.');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada.');
    }
  }
}

fixForeignKeyOnDeleteCascade();
