// lambda.js
Object.keys(require.cache).forEach((key) => delete require.cache[key]);

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
async function initializeDatabase() {
  try {
    console.log("Authenticating database connection...");
    await sequelize.authenticate();
    console.log("Database connection established");
    console.log("Synchronizing database...");
    await sequelize.sync({ force: false });
    console.log("Database synchronized");
  } catch (err) {
    console.error("Database initialization error:", {
      message: err.message,
      stack: err.stack,
    });
    // Log error but don't exit; let handler proceed
    return false;
  }
}

initializeDatabase().catch((err) => {
  console.error("Failed to initialize database:", {
    message: err.message,
    stack: err.stack,
  });
  // Log error but don't exit
});

// Catch uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
  });
  // Log error but don't exit
});

// AppSync-compatible Lambda handler
exports.handler = async (event, context) => {
  console.log("Lambda invoked with event:", JSON.stringify(event, null, 2));
  console.log("Lambda context:", JSON.stringify(context, null, 2));

  try {
    const { fieldName, arguments: args, info } = event;
    console.log("Processing AppSync event:", { fieldName, args });

    if (!resolvers[info?.parentTypeName]?.[fieldName]) {
      console.error("Resolver not found for:", {
        parentTypeName: info?.parentTypeName,
        fieldName,
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Resolver ${fieldName} not found` }),
      };
    }

    const resolver = resolvers[info.parentTypeName][fieldName];
    console.log(`Executing resolver: ${info.parentTypeName}.${fieldName}`);

    const result = await resolver(null, args, { sequelize });
    console.log("Resolver result:", JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Error in Lambda handler:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
