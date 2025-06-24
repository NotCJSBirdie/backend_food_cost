"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (t) => {
      // Add quantitySold column
      await queryInterface.addColumn(
        "Sale",
        "quantitySold",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1, // Default for existing records
          validate: { min: 1, isInt: true },
        },
        { transaction: t }
      );

      // Update existing records to ensure quantitySold is set
      await queryInterface.sequelize.query(
        `UPDATE "Sale" SET "quantitySold" = 1 WHERE "quantitySold" IS NULL;`,
        { transaction: t }
      );
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (t) => {
      // Remove quantitySold column
      await queryInterface.removeColumn("Sale", "quantitySold", {
        transaction: t,
      });
    });
  },
};
