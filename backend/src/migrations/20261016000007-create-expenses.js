'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('expenses', {
      id: id(Sequelize),
      nursery_id: fk(Sequelize, 'nurseries'),
      category: { type: Sequelize.STRING(40), allowNull: false },
      amount: { type: Sequelize.INTEGER, allowNull: false },
      spent_at: { type: Sequelize.DATEONLY, allowNull: false },
      note: { type: Sequelize.STRING(255), allowNull: true },
      client_uuid: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      ...timestamps(Sequelize, { archivable: true }),
    });
    await queryInterface.addIndex('expenses', ['nursery_id', 'spent_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('expenses');
  },
};
