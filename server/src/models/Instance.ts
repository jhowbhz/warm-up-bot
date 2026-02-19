import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface InstanceAttributes {
  id: number;
  phone: string;
  name?: string;
  deviceToken?: string;
  deviceKey?: string;
  serverSearch?: string;
  serverType: 'whatsapp' | 'baileys';
  proxyHost?: string;
  proxyPort?: number;
  proxyUser?: string;
  proxyPass?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'banned';
  currentPhase: 'manual' | 'auto_warming' | 'sending';
  currentDay: number;
  warmingSpeed: number;
  profilePhoto?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface InstanceCreationAttributes extends Optional<InstanceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Instance extends Model<InstanceAttributes, InstanceCreationAttributes> implements InstanceAttributes {
  public id!: number;
  public phone!: string;
  public name?: string;
  public deviceToken?: string;
  public deviceKey?: string;
  public serverSearch?: string;
  public serverType!: 'whatsapp' | 'baileys';
  public proxyHost?: string;
  public proxyPort?: number;
  public proxyUser?: string;
  public proxyPass?: string;
  public status!: 'disconnected' | 'connecting' | 'connected' | 'banned';
  public currentPhase!: 'manual' | 'auto_warming' | 'sending';
  public currentDay!: number;
  public warmingSpeed!: number;
  public profilePhoto?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Instance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    deviceToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    deviceKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    serverSearch: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    serverType: {
      type: DataTypes.ENUM('whatsapp', 'baileys'),
      defaultValue: 'whatsapp',
      allowNull: false,
    },
    proxyHost: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    proxyPort: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    proxyUser: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    proxyPass: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('disconnected', 'connecting', 'connected', 'banned'),
      defaultValue: 'disconnected',
      allowNull: false,
    },
    currentPhase: {
      type: DataTypes.ENUM('manual', 'auto_warming', 'sending'),
      defaultValue: 'manual',
      allowNull: false,
    },
    currentDay: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    warmingSpeed: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
    profilePhoto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'instances',
    timestamps: true,
  }
);

export default Instance;
