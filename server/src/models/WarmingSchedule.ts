import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WarmingScheduleAttributes {
  id: number;
  instanceId: number;
  dayNumber: number;
  maxConversations: number;
  minIntervalMinutes: number;
  conversationsDone: number;
  messagesDone: number;
  date?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  createdAt?: Date;
  updatedAt?: Date;
}

interface WarmingScheduleCreationAttributes extends Optional<WarmingScheduleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class WarmingSchedule extends Model<WarmingScheduleAttributes, WarmingScheduleCreationAttributes> implements WarmingScheduleAttributes {
  public id!: number;
  public instanceId!: number;
  public dayNumber!: number;
  public maxConversations!: number;
  public minIntervalMinutes!: number;
  public conversationsDone!: number;
  public messagesDone!: number;
  public date?: Date;
  public status!: 'pending' | 'in_progress' | 'completed' | 'skipped';
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WarmingSchedule.init(
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
    dayNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    maxConversations: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    minIntervalMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    conversationsDone: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    messagesDone: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'skipped'),
      defaultValue: 'pending',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'warming_schedules',
    timestamps: true,
  }
);

export default WarmingSchedule;
