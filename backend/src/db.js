const fs = require('fs');
const { Sequelize } = require('sequelize');

let ca;
if (process.env.DB_CA_PATH) ca = fs.readFileSync(process.env.DB_CA_PATH, 'utf8');
else if (process.env.DB_CA_CERT) ca = process.env.DB_CA_CERT.replace(/\\n/g, '\n');

const sequelize = new Sequelize(
  process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: 'mysql',
    logging: false,
    dialectOptions: ca ? { ssl: { ca, rejectUnauthorized: true } } : { ssl: { rejectUnauthorized: true } },
  }
);
module.exports = sequelize;