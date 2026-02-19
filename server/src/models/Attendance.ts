import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AttendanceAttributes {
  id: number;
  protocol: string;
  instanceId: number;
  botId: number | null;
  phone: string;
  contactName: string | null;
  title: string;
  subject: string;
  context: string | null;
  status: 'waiting' | 'in_progress' | 'closed';
  attendantId: number | null;
  attendantName: string | null;
  closedAt: Date | null;
  closedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AttendanceCreationAttributes extends Optional<AttendanceAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Attendance extends Model<AttendanceAttributes, AttendanceCreationAttributes> implements AttendanceAttributes {
  public id!: number;
  public protocol!: string;
  public instanceId!: number;
  public botId!: number | null;
  public phone!: string;
  public contactName!: string | null;
  public title!: string;
  public subject!: string;
  public context!: string | null;
  public status!: 'waiting' | 'in_progress' | 'closed';
  public attendantId!: number | null;
  public attendantName!: string | null;
  public closedAt!: Date | null;
  public closedBy!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attendance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    protocol: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    instanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'instances', key: 'id' },
    },
    botId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'bots', key: 'id' },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    contactName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('waiting', 'in_progress', 'closed'),
      defaultValue: 'waiting',
      allowNull: false,
    },
    attendantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'attendants', key: 'id' },
    },
    attendantName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'attendances',
    timestamps: true,
  },
);

export default Attendance;
