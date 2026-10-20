'use strict';

// Hand-over details, kept on the request until BOTH parties have confirmed (FR11, FR12):
//  - the institution gives the planting site and its district when it confirms receipt
//  - the nursery gives the land cleared (m²) when it confirms the hand-over
// When both have confirmed, these values are copied into IMPACT_RECORDS. (docs/DEVIATIONS.md D14)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('surplus_requests', 'planting_site', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('surplus_requests', 'planting_district', { type: Sequelize.STRING(60), allowNull: true });
    await queryInterface.addColumn('surplus_requests', 'land_cleared_sqm', { type: Sequelize.DECIMAL(10, 2), allowNull: true });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn('surplus_requests', 'land_cleared_sqm');
    await queryInterface.removeColumn('surplus_requests', 'planting_district');
    await queryInterface.removeColumn('surplus_requests', 'planting_site');
  },
};
