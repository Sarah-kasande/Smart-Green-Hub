'use strict';
const { fk } = require('../utils/migrationHelpers');

// "Available plants": institutions may also request ready batches directly, not only surplus
// listings (docs/DEVIATIONS.md W42-W44).
//
// batches.show_to_institutions          per-batch switch, ON by default (nursery opt-out)
// nurseries.show_available_plants        whole-nursery switch, ON by default (nursery opt-out)
// surplus_requests.batch_id              a request for an available batch (listing_id is then NULL);
//                                        a request for a surplus offer keeps listing_id (batch_id NULL).
//                                        Exactly one of the two is set; the rest of the request
//                                        (statuses, reservation, two-sided hand-over) is shared.
// surplus_requests.listing_id            becomes optional for that reason
// surplus_requests.preferred_pickup_date, message   optional details from the institution
// unique (batch_id, institution_id)      one request per institution per batch, like per listing
// impact_records.impact_type             surplus_redirected | greening_supply. Existing records all
//                                        came from surplus listings, so the default
//                                        "surplus_redirected" keeps their meaning.
//
// Safe on a database with data: columns are only added or made optional, no rows are inserted.
// Every step checks first, so a half-finished run (MySQL cannot undo table changes) can be repeated.
module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, definition) => {
      const columns = await queryInterface.describeTable(table);
      if (!columns[column]) await queryInterface.addColumn(table, column, definition);
    };
    await addIfMissing('batches', 'show_to_institutions', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });
    await addIfMissing('nurseries', 'show_available_plants', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true });

    // Only the NULL rule changes; the existing foreign key to surplus_listings stays as it is
    await queryInterface.changeColumn('surplus_requests', 'listing_id', { type: Sequelize.INTEGER, allowNull: true });
    await addIfMissing('surplus_requests', 'batch_id', fk(Sequelize, 'batches', { allowNull: true }));
    await addIfMissing('surplus_requests', 'preferred_pickup_date', { type: Sequelize.DATEONLY, allowNull: true });
    await addIfMissing('surplus_requests', 'message', { type: Sequelize.STRING(500), allowNull: true });
    const indexes = await queryInterface.showIndex('surplus_requests');
    if (!indexes.some((index) => index.name === 'uq_surplus_requests_batch_institution')) {
      await queryInterface.addIndex('surplus_requests', ['batch_id', 'institution_id'], { unique: true, name: 'uq_surplus_requests_batch_institution' });
    }

    await addIfMissing('impact_records', 'impact_type', {
      type: Sequelize.ENUM('surplus_redirected', 'greening_supply'),
      allowNull: false,
      defaultValue: 'surplus_redirected',
    });
  },

  async down(queryInterface, Sequelize) {
    const [[{ direct }]] = await queryInterface.sequelize.query('SELECT COUNT(*) AS direct FROM surplus_requests WHERE batch_id IS NOT NULL');
    if (Number(direct) > 0) throw new Error('Cannot undo: some requests are for available plants (batch_id is set).');
    await queryInterface.removeColumn('impact_records', 'impact_type');
    await queryInterface.removeIndex('surplus_requests', 'uq_surplus_requests_batch_institution');
    await queryInterface.removeColumn('surplus_requests', 'message');
    await queryInterface.removeColumn('surplus_requests', 'preferred_pickup_date');
    await queryInterface.removeColumn('surplus_requests', 'batch_id');
    await queryInterface.changeColumn('surplus_requests', 'listing_id', { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.removeColumn('nurseries', 'show_available_plants');
    await queryInterface.removeColumn('batches', 'show_to_institutions');
  },
};
