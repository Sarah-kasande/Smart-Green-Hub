'use strict';
const { fk } = require('../utils/migrationHelpers');

// Species proposed by nurseries and approved by the administrator (docs/DEVIATIONS.md W39).
//
// Design: a proposed species is a normal PLANT_SPECIES row with a status, not a separate table.
// A batch can then point to it straight away (species_id stays required), and approving it only
// changes its status and fills in its rules.
//
// plant_species
//   status                    approved | pending | rejected | merged (existing rows become approved)
//   requested_by_nursery_id   the nursery that proposed it (NULL = added by the administrator)
//   decided_by, decided_at    the administrator who decided, and when
//   decision_reason           why it was rejected (required) or merged (optional)
//   merged_into_id            the approved species a spelling duplicate was joined to
//   default_days_to_ready, default_prime_days: may be NULL while pending (the nursery never
//                             enters rules; the administrator fills them in when approving)
// batches
//   expected_ready_date, prime_end_date: may be NULL while the batch's species waits for approval
//
// Safe on a database that already has data: columns are only added or made optional, existing
// species get status "approved", and no rows are inserted. Every step first checks whether it was
// already done, so a run that stopped half-way (MySQL cannot undo table changes) can simply be
// run again when Render starts.
module.exports = {
  async up(queryInterface, Sequelize) {
    const species = await queryInterface.describeTable('plant_species');
    const addIfMissing = async (column, definition) => {
      if (!species[column]) await queryInterface.addColumn('plant_species', column, definition);
    };
    await addIfMissing('status', {
      type: Sequelize.ENUM('approved', 'pending', 'rejected', 'merged'),
      allowNull: false,
      defaultValue: 'approved',
    });
    await addIfMissing('requested_by_nursery_id', fk(Sequelize, 'nurseries', { allowNull: true }));
    await addIfMissing('decided_by', fk(Sequelize, 'users', { allowNull: true }));
    await addIfMissing('decided_at', { type: Sequelize.DATE, allowNull: true });
    await addIfMissing('decision_reason', { type: Sequelize.STRING(500), allowNull: true });
    await addIfMissing('merged_into_id', fk(Sequelize, 'plant_species', { allowNull: true }));

    // Making a column optional is harmless to repeat
    await queryInterface.changeColumn('plant_species', 'default_days_to_ready', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.changeColumn('plant_species', 'default_prime_days', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.changeColumn('batches', 'expected_ready_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.changeColumn('batches', 'prime_end_date', { type: Sequelize.DATEONLY, allowNull: true });

    const indexes = await queryInterface.showIndex('plant_species');
    if (!indexes.some((index) => index.name === 'plant_species_status')) {
      await queryInterface.addIndex('plant_species', ['status'], { name: 'plant_species_status' });
    }
  },

  async down(queryInterface, Sequelize) {
    // Going back is only possible while nothing depends on the new data
    const [[{ waiting }]] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS waiting FROM plant_species WHERE status <> 'approved' OR default_days_to_ready IS NULL OR default_prime_days IS NULL"
    );
    const [[{ undated }]] = await queryInterface.sequelize.query('SELECT COUNT(*) AS undated FROM batches WHERE expected_ready_date IS NULL OR prime_end_date IS NULL');
    if (Number(waiting) > 0 || Number(undated) > 0) {
      throw new Error('Cannot undo: some species are not approved or some batches wait for species approval.');
    }
    await queryInterface.changeColumn('batches', 'prime_end_date', { type: Sequelize.DATEONLY, allowNull: false });
    await queryInterface.changeColumn('batches', 'expected_ready_date', { type: Sequelize.DATEONLY, allowNull: false });
    await queryInterface.changeColumn('plant_species', 'default_prime_days', { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.changeColumn('plant_species', 'default_days_to_ready', { type: Sequelize.INTEGER, allowNull: false });
    await queryInterface.removeIndex('plant_species', 'plant_species_status');
    // removeColumn also drops the foreign key of the column first (Sequelize, MySQL)
    for (const column of ['merged_into_id', 'decision_reason', 'decided_at', 'decided_by', 'requested_by_nursery_id', 'status']) {
      await queryInterface.removeColumn('plant_species', column);
    }
  },
};
