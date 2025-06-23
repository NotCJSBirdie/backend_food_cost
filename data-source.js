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

// Initialize Sequelize
const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.DB_HOST,
  port: 5432,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
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
      type: DataTypes.STRING, // Match your database's string IDs
      primaryKey: true,
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
  { tableName: "Ingredient", timestamps: false } // Disable timestamps
);

const Recipe = sequelize.define(
  "Recipe",
  {
    id: {
      type: DataTypes.STRING, // Match string IDs
      primaryKey: true,
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
  { tableName: "Recipe", timestamps: false } // Disable timestamps
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
      type: DataTypes.STRING, // Match string recipeId
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "RESTRICT",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "Sale", timestamps: true } // Keep timestamps
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
      type: DataTypes.STRING, // Match string recipeId
      allowNull: false,
      references: { model: Recipe, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    ingredientId: {
      type: DataTypes.STRING, // Match string ingredientId
      allowNull: false,
      references: { model: Ingredient, key: "id" },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
  },
  { tableName: "RecipeIngredient", timestamps: false } // Disable timestamps
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

// Sync database
async function syncDatabase() {
  try {
    await sequelize.sync({ force: false }); // Don't drop tables
    console.log("Database synced successfully");
  } catch (error) {
    console.error("Database sync error:", {
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
  syncDatabase,
};
