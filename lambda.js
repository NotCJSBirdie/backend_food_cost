const { sequelize } = require("./data-source");

let resolvers;
try {
  console.log("Loading resolvers...");
  const resolverModule = require("./resolvers");
  resolvers =
    resolverModule.resolvers || resolverModule.default || resolverModule;
  console.log("Resolvers loaded successfully");
} catch (err) {
  console.error("Error loading resolvers:", {
    message: err.message,
    stack: err.stack,
  });
  throw new Error("Failed to load resolvers module");
}

// Initialize Sequelize during cold start
let isDbInitialized = false;
async function initializeDatabase() {
  if (isDbInitialized) return true;
  try {
    console.log("Authenticating database connection...");
    await sequelize.authenticate();
    console.log("Database connection established");
    isDbInitialized = true;
    return true;
  } catch (err) {
    console.error("Database initialization error:", {
      message: err.message,
      stack: err.stack,
    });
    throw err; // Throw to fail fast
  }
}

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
  });
});

// AppSync-compatible Lambda handler
exports.handler = async (event, context) => {
  console.log("Lambda invoked with event:", JSON.stringify(event, null, 2));
  console.log("Lambda context:", JSON.stringify(context, null, 2));

  try {
    // Initialize database
    await initializeDatabase();

    const { fieldName, arguments: args, info } = event;
    console.log("Processing AppSync event:", { fieldName, args });

    if (!resolvers[info?.parentTypeName]?.[fieldName]) {
      console.error("Resolver not found for:", {
        parentTypeName: info?.parentTypeName,
        fieldName,
      });
      throw new Error(`Resolver ${fieldName} not found`);
    }

    const resolver = resolvers[info.parentTypeName][fieldName];
    console.log(`Executing resolver: ${info.parentTypeName}.${fieldName}`);

    const result = await resolver(null, args, { sequelize });
    console.log("Resolver result:", JSON.stringify(result, null, 2));

    return result; // Return result directly for AppSync
  } catch (error) {
    console.error("Error in Lambda handler:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      errorType: error.name || "Error",
      errorMessage: error.message,
      stackTrace: error.stack,
    }; // AppSync error format
  }
};
