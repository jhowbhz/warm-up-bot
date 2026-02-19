import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface ConversationAttributes {
  id: number;
  instanceId: number;
  contactId: number;
  topic?: string;
  messagesCount: number;
  startedAt?: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt?: Date;
  updatedAt?: Date;
}

interface ConversationCreationAttributes extends Optional<ConversationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Conversation extends Model<ConversationAttributes, ConversationCreationAttributes> implements ConversationAttributes {
  public id!: number;
  public instanceId!: number;
  public contactId!: number;
  public topic?: string;
  public messagesCount!: number;
  public startedAt?: Date;
  public completedAt?: Date;
  public status!: 'pending' | 'in_progress' | 'completed' | 'failed';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Conversation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'instances',
        key: 'id',
      },
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'warming_contacts',
        key: 'id',
      },
    },
    topic: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    messagesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'conversations',
    timestamps: true,
  }
);

export default Conversation;
