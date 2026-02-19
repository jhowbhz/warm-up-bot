import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BotAttributes {
  id: number;
  name: string;
  instanceId: number | null;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  active: boolean;
  replyDelay: number;
  contextMessages: number;
  replyGroups: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BotCreationAttributes extends Optional<BotAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Bot extends Model<BotAttributes, BotCreationAttributes> implements BotAttributes {
  public id!: number;
  public name!: string;
  public instanceId!: number | null;
  public systemPrompt!: string;
  public model!: string;
  public temperature!: number;
  public maxTokens!: number;
  public active!: boolean;
  public replyDelay!: number;
  public contextMessages!: number;
  public replyGroups!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Bot.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'instances', key: 'id' },
    },
    systemPrompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING(50),
      defaultValue: 'gpt-4o-mini',
      allowNull: false,
    },
    temperature: {
      type: DataTypes.FLOAT,
      defaultValue: 0.7,
      allowNull: false,
    },
    maxTokens: {
      type: DataTypes.INTEGER,
      defaultValue: 500,
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    replyDelay: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false,
    },
    contextMessages: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
      allowNull: false,
    },
    replyGroups: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'bots',
    timestamps: true,
  },
);

export default Bot;
