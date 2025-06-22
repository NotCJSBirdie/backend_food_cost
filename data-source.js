const { Sequelize } = require("sequelize");
require("dotenv").config();

const isLocal = process.env.NODE_ENV === "local";

console.log("Initializing Sequelize with config:", {
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  port: 5432,
  isLocal,
});

const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dialectOptions: isLocal
    ? { ssl: false }
    : { ssl: { require: true, rejectUnauthorized: false } },
  logging: (msg) => console.log("Sequelize:", msg),
});

const Ingredient = sequelize.define(
  "Ingredient",
  {
    id: { type: Sequelize.DataTypes.STRING, primaryKey: true },
    name: { type: Sequelize.DataTypes.STRING, allowNull: false },
    unitPrice: { type: Sequelize.DataTypes.FLOAT, allowNull: false },
    unit: { type: Sequelize.DataTypes.STRING, allowNull: false },
    stockQuantity: {
      type: Sequelize.DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    restockThreshold: {
      type: Sequelize.DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: "Ingredient", timestamps: false }
);

const Recipe = sequelize.define(
  "Recipe",
  {
    id: { type: Sequelize.DataTypes.STRING, primaryKey: true },
    name: { type: Sequelize.DataTypes.STRING, allowNull: false },
    totalCost: {
      type: Sequelize.DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    suggestedPrice: {
      type: Sequelize.DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: "Recipe", timestamps: false }
);

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    saleAmount: { type: Sequelize.DataTypes.FLOAT, allowNull: false },
    recipeId: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
    createdAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
    updatedAt: {
      type: Sequelize.DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
    },
  },
  { tableName: "Sale", timestamps: true }
);

const RecipeIngredient = sequelize.define(
  "RecipeIngredient",
  {
    id: {
      type: Sequelize.DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: { type: Sequelize.DataTypes.FLOAT, allowNull: false },
    recipeId: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    ingredientId: {
      type: Sequelize.DataTypes.STRING,
      allowNull: false,
      references: { model: Ingredient, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "RecipeIngredient", timestamps: false }
);

// Define relationships
console.log("Defining model relationships...");
Recipe.hasMany(RecipeIngredient, { foreignKey: "recipeId", as: "ingredients" });
RecipeIngredient.belongsTo(Recipe, { foreignKey: "recipeId", as: "recipe" });
RecipeIngredient.belongsTo(Ingredient, {
  foreignKey: "ingredientId",
  as: "ingredient",
});
Ingredient.hasMany(RecipeIngredient, {
  foreignKey: "ingredientId",
  as: "recipeIngredients",
});
Sale.belongsTo(Recipe, { foreignKey: "recipeId", as: "recipe" });
Recipe.hasMany(Sale, { foreignKey: "recipeId", as: "sales" });

// Log associations to verify
console.log("Recipe associations:", Object.keys(Recipe.associations));
console.log("Sale associations:", Object.keys(Sale.associations));
console.log(
  "RecipeIngredient associations:",
  Object.keys(RecipeIngredient.associations)
);
console.log("Ingredient associations:", Object.keys(Ingredient.associations));

// Sync tables in order
async function syncDatabase() {
  try {
    console.log("Authenticating database...");
    await sequelize.authenticate();
    console.log("Database authenticated successfully");
    console.log("Syncing Ingredient table...");
    await Ingredient.sync({ alter: true });
    console.log("Syncing Recipe table...");
    await Recipe.sync({ alter: true });
    console.log("Syncing Sale table...");
    await Sale.sync({ alter: true });
    console.log("Syncing RecipeIngredient table...");
    await RecipeIngredient.sync({ alter: true });
    console.log("Database synced successfully");
  } catch (err) {
    console.error("Database sync error:", {
      message: err.message,
      stack: err.stack,
    });
    throw err;
  }
}

module.exports = {
  sequelize,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Sale,
  syncDatabase,
};
