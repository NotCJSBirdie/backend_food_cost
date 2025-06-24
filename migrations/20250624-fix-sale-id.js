"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (t) => {
      // Add new_id column as STRING
      await queryInterface.addColumn(
        "Sale",
        "new_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction: t }
      );

      // Populate new_id with UUIDs for existing records
      const sales = await queryInterface.sequelize.query(
        `SELECT id FROM "Sale";`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      for (const sale of sales) {
        const newId = uuidv4();
        await queryInterface.sequelize.query(
          `UPDATE "Sale" SET new_id = :newId WHERE id = :oldId;`,
          {
            replacements: { newId, oldId: sale.id },
            transaction: t,
          }
        );
      }

      // Remove the old INTEGER id column
      await queryInterface.removeColumn("Sale", "id", { transaction: t });

      // Rename new_id to id
      await queryInterface.renameColumn("Sale", "new_id", "id", {
        transaction: t,
      });

      // Set id as primary key
      await queryInterface.addConstraint("Sale", {
        fields: ["id"],
        type: "primary key",
        name: "Sale_pkey",
        transaction: t,
      });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (t) => {
      // Add old_id column as INTEGER
      await queryInterface.addColumn(
        "Sale",
        "old_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction: t }
      );

      // Populate old_id with sequential integers
      const sales = await queryInterface.sequelize.query(
        `SELECT id FROM "Sale";`,
        { type: Sequelize.QueryTypes.SELECT, transaction: t }
      );
      let counter = 1;
      for (const sale of sales) {
        await queryInterface.sequelize.query(
          `UPDATE "Sale" SET old_id = :counter WHERE id = :uuid;`,
          {
            replacements: { counter, uuid: sale.id },
            transaction: t,
          }
        );
        counter++;
      }

      // Remove UUID id column
      await queryInterface.removeColumn("Sale", "id", { transaction: t });

      // Rename old_id to id
      await queryInterface.renameColumn("Sale", "old_id", "id", {
        transaction: t,
      });

      // Set id as auto-incrementing primary key
      await queryInterface.changeColumn(
        "Sale",
        "id",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        { transaction: t }
      );
    });
  },
};
