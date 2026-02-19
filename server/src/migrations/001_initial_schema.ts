import { QueryInterface, DataTypes } from 'sequelize';
import { Migration } from './runner';

const migration: Migration = {
  name: '001_initial_schema',

  async up(queryInterface: QueryInterface) {

    // ─── settings ────────────────────────────────────────────────────
    await queryInterface.createTable('settings', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      settingKey: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      settingValue: { type: DataTypes.TEXT, allowNull: true },
      description: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── instances ───────────────────────────────────────────────────
    await queryInterface.createTable('instances', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: true },
      deviceToken: { type: DataTypes.STRING(255), allowNull: true },
      deviceKey: { type: DataTypes.STRING(255), allowNull: true },
      serverSearch: { type: DataTypes.STRING(255), allowNull: true },
      serverType: {
        type: DataTypes.ENUM('whatsapp', 'baileys'),
        allowNull: false,
        defaultValue: 'whatsapp',
      },
      proxyHost: { type: DataTypes.STRING(255), allowNull: true },
      proxyPort: { type: DataTypes.INTEGER, allowNull: true },
      proxyUser: { type: DataTypes.STRING(100), allowNull: true },
      proxyPass: { type: DataTypes.STRING(100), allowNull: true },
      status: {
        type: DataTypes.ENUM('disconnected', 'connecting', 'connected', 'banned'),
        allowNull: false,
        defaultValue: 'disconnected',
      },
      currentPhase: {
        type: DataTypes.ENUM('manual', 'auto_warming', 'sending'),
        allowNull: false,
        defaultValue: 'manual',
      },
      currentDay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      warmingSpeed: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
      profilePhoto: { type: DataTypes.STRING(255), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── warming_contacts ────────────────────────────────────────────
    await queryInterface.createTable('warming_contacts', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      name: { type: DataTypes.STRING(100), allowNull: true },
      isBot: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      category: {
        type: DataTypes.ENUM('friend', 'family', 'work', 'random'),
        allowNull: false,
        defaultValue: 'random',
      },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── conversations ───────────────────────────────────────────────
    await queryInterface.createTable('conversations', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      instanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'instances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'warming_contacts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      topic: { type: DataTypes.STRING(255), allowNull: true },
      messagesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      startedAt: { type: DataTypes.DATE, allowNull: true },
      completedAt: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── messages ────────────────────────────────────────────────────
    await queryInterface.createTable('messages', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      direction: {
        type: DataTypes.ENUM('sent', 'received'),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'sticker', 'video', 'location', 'contact'),
        allowNull: false,
      },
      content: { type: DataTypes.TEXT, allowNull: true },
      mediaUrl: { type: DataTypes.STRING(500), allowNull: true },
      scheduledAt: { type: DataTypes.DATE, allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: true },
      delivered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      readByContact: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── warming_schedules ───────────────────────────────────────────
    await queryInterface.createTable('warming_schedules', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      instanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'instances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      dayNumber: { type: DataTypes.INTEGER, allowNull: false },
      maxConversations: { type: DataTypes.INTEGER, allowNull: false },
      minIntervalMinutes: { type: DataTypes.INTEGER, allowNull: false },
      conversationsDone: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      messagesDone: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── daily_metrics ───────────────────────────────────────────────
    await queryInterface.createTable('daily_metrics', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      instanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'instances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      date: { type: DataTypes.DATEONLY, allowNull: false },
      messagesSent: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      messagesReceived: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      responsesCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      blocksCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      reportsCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ignoredCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      bdiScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── bots ────────────────────────────────────────────────────────
    await queryInterface.createTable('bots', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      instanceId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'instances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      systemPrompt: { type: DataTypes.TEXT, allowNull: false },
      model: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'gpt-4o-mini' },
      temperature: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0.7 },
      maxTokens: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 500 },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      replyDelay: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
      contextMessages: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
      replyGroups: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── attendants ──────────────────────────────────────────────────
    await queryInterface.createTable('attendants', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(100), allowNull: false },
      sector: { type: DataTypes.STRING(100), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: true },
      active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── attendances ─────────────────────────────────────────────────
    await queryInterface.createTable('attendances', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      protocol: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      instanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'instances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      botId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'bots', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      phone: { type: DataTypes.STRING(20), allowNull: false },
      contactName: { type: DataTypes.STRING(100), allowNull: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      subject: { type: DataTypes.STRING(200), allowNull: false },
      context: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('waiting', 'in_progress', 'closed'),
        allowNull: false,
        defaultValue: 'waiting',
      },
      attendantId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'attendants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      attendantName: { type: DataTypes.STRING(100), allowNull: true },
      closedAt: { type: DataTypes.DATE, allowNull: true },
      closedBy: { type: DataTypes.STRING(100), allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // ─── attendance_messages ─────────────────────────────────────────
    await queryInterface.createTable('attendance_messages', {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      attendanceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'attendances', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      direction: {
        type: DataTypes.ENUM('received', 'sent'),
        allowNull: false,
      },
      content: { type: DataTypes.TEXT, allowNull: false },
      senderName: { type: DataTypes.STRING(100), allowNull: true },
      sentAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  async down(queryInterface: QueryInterface) {
    // Ordem inversa respeitando foreign keys
    await queryInterface.dropTable('attendance_messages');
    await queryInterface.dropTable('attendances');
    await queryInterface.dropTable('attendants');
    await queryInterface.dropTable('bots');
    await queryInterface.dropTable('daily_metrics');
    await queryInterface.dropTable('warming_schedules');
    await queryInterface.dropTable('messages');
    await queryInterface.dropTable('conversations');
    await queryInterface.dropTable('warming_contacts');
    await queryInterface.dropTable('instances');
    await queryInterface.dropTable('settings');
  },
};

export default migration;
