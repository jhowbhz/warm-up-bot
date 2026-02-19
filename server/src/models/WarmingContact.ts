import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface WarmingContactAttributes {
  id: number;
  phone: string;
  name?: string;
  isBot: boolean;
  category: 'friend' | 'family' | 'work' | 'random';
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface WarmingContactCreationAttributes extends Optional<WarmingContactAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class WarmingContact extends Model<WarmingContactAttributes, WarmingContactCreationAttributes> implements WarmingContactAttributes {
  public id!: number;
  public phone!: string;
  public name?: string;
  public isBot!: boolean;
  public category!: 'friend' | 'family' | 'work' | 'random';
  public active!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WarmingContact.init(
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
    isBot: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('friend', 'family', 'work', 'random'),
      defaultValue: 'random',
      allowNull: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'warming_contacts',
    timestamps: true,
  }
);

export default WarmingContact;
