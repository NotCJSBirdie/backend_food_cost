const resolvers = require("./resolvers");
const { sequelize, testConnection, syncDatabase } = require("./data-source");

// Initialize database connection on cold start
let isConnected = false;

async function initializeDatabase() {
  if (!isConnected) {
    try {
      await testConnection();
      await syncDatabase();
      isConnected = true;
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Failed to initialize database:", {
        message: error.message,
        stack: error.stack,
        env: {
          DB_HOST: process.env.DB_HOST,
          DB_NAME: process.env.DB_NAME,
          DB_USER: process.env.DB_USER,
        },
      });
      throw error;
    }
  }
}

exports.handler = async (event) => {
  console.log("Lambda event:", JSON.stringify(event, null, 2));

  // Extract resolver details
  const parentTypeName = event.info?.parentTypeName || "Unknown";
  const fieldName = event.info?.fieldName || "unknown";
  const args = event.arguments || {};
  const parent = event.source || null;

  // Log context
  console.log(`Processing ${parentTypeName}.${fieldName}`);

  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Database initialization error:", error);
    return null; // Nullable schema allows null
  }

  // Context for resolvers
  const context = { sequelize };

  try {
    // Map the resolver
    const resolver = resolvers[parentTypeName]?.[fieldName];

    if (!resolver) {
      console.error(`Resolver not found for ${parentTypeName}.${fieldName}`);
      return null;
    }

    // Execute the resolver
    const result = await resolver(parent, args, context, {
      fieldName,
      parentTypeName,
    });

    console.log(
      `Resolver result for ${parentTypeName}.${fieldName}:`,
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error(`Error in ${parentTypeName}.${fieldName}:`, {
      message: error.message,
      stack: error.stack,
      event: JSON.stringify(event, null, 2),
    });
    return null; // Nullable schema allows null
  }
};
