import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface MessageAttributes {
  id: number;
  conversationId: number;
  direction: 'sent' | 'received';
  type: 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'location' | 'contact';
  content?: string;
  mediaUrl?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  delivered: boolean;
  readByContact: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MessageCreationAttributes extends Optional<MessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Message extends Model<MessageAttributes, MessageCreationAttributes> implements MessageAttributes {
  public id!: number;
  public conversationId!: number;
  public direction!: 'sent' | 'received';
  public type!: 'text' | 'image' | 'audio' | 'sticker' | 'video' | 'location' | 'contact';
  public content?: string;
  public mediaUrl?: string;
  public scheduledAt?: Date;
  public sentAt?: Date;
  public delivered!: boolean;
  public readByContact!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Message.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    conversationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'conversations',
        key: 'id',
      },
    },
    direction: {
      type: DataTypes.ENUM('sent', 'received'),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'audio', 'sticker', 'video', 'location', 'contact'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mediaUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    scheduledAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivered: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    readByContact: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'messages',
    timestamps: true,
  }
);

export default Message;
