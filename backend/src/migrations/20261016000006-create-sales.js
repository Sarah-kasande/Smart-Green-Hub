'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sales', {
      id: id(Sequelize),
      batch_id: fk(Sequelize, 'batches'),
      nursery_id: fk(Sequelize, 'nurseries'),
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      unit_price: { type: Sequelize.INTEGER, allowNull: false },
      sold_at: { type: Sequelize.DATE, allowNull: false },
      customer_note: { type: Sequelize.STRING(255), allowNull: true },
      client_uuid: { type: Sequelize.CHAR(36), allowNull: false, unique: true },
      ...timestamps(Sequelize, { archivable: true }),
    });
    // The risk engine reads "sales of this nursery in the last L days"
    await queryInterface.addIndex('sales', ['nursery_id', 'sold_at']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('sales');
  },
};
