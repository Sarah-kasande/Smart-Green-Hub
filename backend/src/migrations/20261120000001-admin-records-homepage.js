'use strict';

// Administrator record management and batches on the public homepage (docs/DEVIATIONS.md W47-W49).
//
// nurseries.show_on_homepage   the nursery's consent: "Allow my plants to appear on the public homepage".
//                              OFF by default; the administrator can only publish batches of nurseries
//                              that switched it on.
// batches.published_at         when the administrator published the batch on the homepage (NULL = not
//                              published). A published batch is shown only while it is ready, has free
//                              plants and its nursery is approved, not archived and still agrees.
// batches.featured_rank        the "Featured" position chosen by the administrator: 1 first, then 2, ...;
//                              NULL = after the featured ones, newest published first.
//
// Archive needs no new column: archived_at (Sequelize "paranoid") is already the soft delete (FR16).
// Safe on a database with data: columns are only added (with defaults), no rows are inserted.
// Every step checks first, so the migration can be repeated after a half-finished run.
module.exports = {
  async up(queryInterface, Sequelize) {
    const addIfMissing = async (table, column, definition) => {
      const columns = await queryInterface.describeTable(table);
      if (!columns[column]) await queryInterface.addColumn(table, column, definition);
    };
    await addIfMissing('nurseries', 'show_on_homepage', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false });
    await addIfMissing('batches', 'published_at', { type: Sequelize.DATE, allowNull: true });
    await addIfMissing('batches', 'featured_rank', { type: Sequelize.INTEGER, allowNull: true });
    const indexes = await queryInterface.showIndex('batches');
    if (!indexes.some((index) => index.name === 'batches_published_at')) {
      await queryInterface.addIndex('batches', ['published_at'], { name: 'batches_published_at' });
    }
  },

  async down(queryInterface) {
    const columns = async (table) => queryInterface.describeTable(table);
    const indexes = await queryInterface.showIndex('batches');
    if (indexes.some((index) => index.name === 'batches_published_at')) await queryInterface.removeIndex('batches', 'batches_published_at');
    if ((await columns('batches')).featured_rank) await queryInterface.removeColumn('batches', 'featured_rank');
    if ((await columns('batches')).published_at) await queryInterface.removeColumn('batches', 'published_at');
    if ((await columns('nurseries')).show_on_homepage) await queryInterface.removeColumn('nurseries', 'show_on_homepage');
  },
};
