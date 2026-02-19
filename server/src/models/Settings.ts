import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SettingsAttributes {
  id: number;
  settingKey: string;
  settingValue?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SettingsCreationAttributes extends Optional<SettingsAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Settings extends Model<SettingsAttributes, SettingsCreationAttributes> implements SettingsAttributes {
  public id!: number;
  public settingKey!: string;
  public settingValue?: string;
  public description?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Settings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    settingKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    settingValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'settings',
    timestamps: true,
  }
);

export default Settings;
