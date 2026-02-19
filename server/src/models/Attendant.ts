import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface AttendantAttributes {
  id: number;
  name: string;
  sector: string;
  email: string | null;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface AttendantCreationAttributes extends Optional<AttendantAttributes, 'id' | 'email' | 'active' | 'createdAt' | 'updatedAt'> {}

class Attendant extends Model<AttendantAttributes, AttendantCreationAttributes> implements AttendantAttributes {
  public id!: number;
  public name!: string;
  public sector!: string;
  public email!: string | null;
  public active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Attendant.init(
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
    sector: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'attendants',
    timestamps: true,
  },
);

export default Attendant;
