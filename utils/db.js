require('dotenv').config();

const { Sequelize } = require('sequelize');

function createSequelize() {
  return new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  });
}

const sequelize = createSequelize();

async function connectDb() {
  const {initAssociations} = require('../models/associations');
  await  sequelize.sync({ force: false });
  // await sequelize.authenticate();
  initAssociations();
  return sequelize;
}

module.exports = { sequelize, connectDb };
