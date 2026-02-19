import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AttendanceMessageAttributes {
  id: number;
  attendanceId: number;
  direction: 'received' | 'sent';
  content: string;
  senderName: string | null;
  sentAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AttendanceMessageCreationAttributes extends Optional<AttendanceMessageAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class AttendanceMessage extends Model<AttendanceMessageAttributes, AttendanceMessageCreationAttributes> implements AttendanceMessageAttributes {
  public id!: number;
  public attendanceId!: number;
  public direction!: 'received' | 'sent';
  public content!: string;
  public senderName!: string | null;
  public sentAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

AttendanceMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    attendanceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'attendances', key: 'id' },
    },
    direction: {
      type: DataTypes.ENUM('received', 'sent'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    senderName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'attendance_messages',
    timestamps: true,
  },
);

export default AttendanceMessage;
