import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface DailyMetricAttributes {
  id: number;
  instanceId: number;
  date: Date;
  messagesSent: number;
  messagesReceived: number;
  responsesCount: number;
  blocksCount: number;
  reportsCount: number;
  ignoredCount: number;
  bdiScore?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface DailyMetricCreationAttributes extends Optional<DailyMetricAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class DailyMetric extends Model<DailyMetricAttributes, DailyMetricCreationAttributes> implements DailyMetricAttributes {
  public id!: number;
  public instanceId!: number;
  public date!: Date;
  public messagesSent!: number;
  public messagesReceived!: number;
  public responsesCount!: number;
  public blocksCount!: number;
  public reportsCount!: number;
  public ignoredCount!: number;
  public bdiScore?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DailyMetric.init(
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    messagesSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    messagesReceived: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    responsesCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    blocksCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    reportsCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    ignoredCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    bdiScore: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'daily_metrics',
    timestamps: true,
  }
);

export default DailyMetric;
