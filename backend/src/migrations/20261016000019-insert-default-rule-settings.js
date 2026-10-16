'use strict';

// Inserts the default rule (species_id = NULL) with the Table 5 values.
// Done in a migration so it exists in every database, including production.
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id FROM rule_settings WHERE species_id IS NULL LIMIT 1'
    );
    if (rows.length > 0) return;
    await queryInterface.bulkInsert('rule_settings', [
      {
        species_id: null,
        prime_window_days: null,
        sales_lookback_days: 28,
        medium_risk_ratio: 0.2,
        high_risk_ratio: 0.5,
        safety_margin: 0.1,
        far_days: 28,
        near_days: 7,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('rule_settings', { species_id: null });
  },
};
