require('./config/env');
const { Sequelize } = require('sequelize');
const { buildDbConfig } = require('./config/database');

const config = buildDbConfig();

const sequelize = new Sequelize(config.database, config.username, config.password, config);

module.exports = sequelize;
