// Clear module cache to prevent corruption
Object.keys(require.cache).forEach((key) => delete require.cache[key]);

const { sequelize } = require("./data-source");
let resolvers;
try {
  const resolverModule = require("./resolvers");
  resolvers =
    resolverModule.resolvers || resolverModule.default || resolverModule;
  console.log("Resolvers loaded:", resolvers);
} catch (err) {
  console.error("Error loading resolvers:", err.stack);
  throw new Error("Failed to load resolvers module");
}

// Initialize Sequelize during cold start
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");
    await sequelize.sync({ force: false });
    console.log("Database synchronized");
  } catch (err) {
    console.error("Database initialization error:", err.stack);
    throw err;
  }
}

initializeDatabase().catch((err) => {
  console.error("Failed to initialize database:", err.stack);
  process.exit(1);
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err.stack);
  process.exit(1);
});

exports.handler = async (event) => {
  const { operation, payload } = event;

  try {
    let result;
    switch (operation) {
      case "getRecipes":
        result = await resolvers.Query.recipes();
        break;
      case "getSales":
        result = await resolvers.Query.sales();
        break;
      case "createRecipe":
        result = await resolvers.Mutation.createRecipe(null, payload);
        break;
      case "recordSale":
        result = await resolvers.Mutation.recordSale(null, payload);
        break;
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Unknown operation" }),
        };
    }
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
