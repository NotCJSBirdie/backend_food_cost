const { Sequelize, DataTypes } = require("sequelize");

const isProduction = process.env.NODE_ENV === "production";

// Validate environment variables
const requiredEnvVars = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter(
  (varName) => !process.env[varName]
);
if (missingEnvVars.length) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

// Use a connection string for AWS RDS
const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:5432/${process.env.DB_NAME}`;

// Initialize Sequelize
const sequelize = new Sequelize(connectionString, {
  dialect: "postgres",
  dialectOptions: {
    ssl: isProduction ? { require: true, rejectUnauthorized: false } : false,
  },
  logging: isProduction ? false : (msg) => console.log(`Sequelize: ${msg}`),
});

// Define models
const Ingredient = sequelize.define(
  "Ingredient",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    unitPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    stockQuantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    restockThreshold: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  { tableName: "Ingredient" }
);

const Recipe = sequelize.define(
  "Recipe",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { notEmpty: true },
    },
    totalCost: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
    suggestedPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 },
    },
  },
  { tableName: "Recipe" }
);

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    saleAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    recipeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "Sale", timestamps: true }
);

const RecipeIngredient = sequelize.define(
  "RecipeIngredient",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.FLOAT,
      allowNull: false,
      validate: { min: 0 },
    },
    recipeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    ingredientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Ingredient, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "RecipeIngredient" }
);

// Define relationships
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

// Test database connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully");
  } catch (error) {
    console.error("Database connection error:", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

module.exports = {
  sequelize,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Sale,
  testConnection,
};
