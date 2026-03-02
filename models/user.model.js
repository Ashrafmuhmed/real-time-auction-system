const { sequelize } = require('../utils/db');
const { DataTypes } = require('sequelize');

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registeredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpire: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'users',
    timestamps: false,
    indexes: [{ fields: ['email'], unique: true }, { fields: ['resetToken'] }],
  }
);

module.exports = User;
