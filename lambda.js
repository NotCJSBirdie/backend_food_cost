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
    throw err;
  }
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", {
    message: err.message,
    stack: err.stack,
  });
});

exports.handler = async (event, context) => {
  console.log("Lambda invoked with event:", JSON.stringify(event, null, 2));
  console.log("Lambda context:", JSON.stringify(context, null, 2));

  try {
    await initializeDatabase();

    const { fieldName, arguments: args, info } = event;
    console.log("Processing AppSync event:", {
      fieldName,
      parentTypeName: info?.parentTypeName,
    });

    if (!resolvers[info?.parentTypeName]?.[fieldName]) {
      console.error("Resolver not found for:", {
        parentTypeName: info?.parentTypeName,
        fieldName,
      });
      throw new Error(`Resolver ${info.parentTypeName}.${fieldName} not found`);
    }

    const resolver = resolvers[info.parentTypeName][fieldName];
    console.log(`Executing resolver: ${info.parentTypeName}.${fieldName}`);

    // For nested resolvers, pass the parent (event.source) instead of null
    const parent = event.source || null;
    const result = await resolver(parent, args, { sequelize });
    console.log(
      `Resolver ${info.parentTypeName}.${fieldName} result:`,
      JSON.stringify(result, null, 2)
    );

    return result;
  } catch (error) {
    console.error("Error in Lambda handler:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      errorType: error.name || "Error",
      errorMessage: error.message,
      stackTrace: error.stack,
    };
  }
};
