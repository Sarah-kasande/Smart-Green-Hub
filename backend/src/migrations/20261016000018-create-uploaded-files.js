'use strict';
const { id, fk, timestamps } = require('../utils/migrationHelpers');

// Supporting table: verification documents and batch photos are stored inside MySQL
// (Render's disk is wiped on every deploy). Max 10 MB, PDF/PNG/JPEG only (NFR03).
// Files are only ever served through routes that check who is asking.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('uploaded_files', {
      id: id(Sequelize),
      owner_user_id: fk(Sequelize, 'users'),
      purpose: { type: Sequelize.ENUM('verification_document', 'batch_photo'), allowNull: false },
      // What the file belongs to, e.g. entity_type "nursery", entity_id 3
      entity_type: { type: Sequelize.STRING(40), allowNull: false },
      entity_id: { type: Sequelize.INTEGER, allowNull: false },
      original_name: { type: Sequelize.STRING(255), allowNull: false },
      mime_type: { type: Sequelize.STRING(50), allowNull: false },
      size_bytes: { type: Sequelize.INTEGER, allowNull: false },
      data: { type: Sequelize.BLOB('long'), allowNull: false },
      ...timestamps(Sequelize, { archivable: true }),
    });
    await queryInterface.addIndex('uploaded_files', ['entity_type', 'entity_id']);
  },
  async down(queryInterface) {
    await queryInterface.dropTable('uploaded_files');
  },
};
