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
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }
}

exports.handler = async (event) => {
  console.log("Lambda event:", JSON.stringify(event, null, 2));

  // Initialize database
  await initializeDatabase();

  // Extract resolver details from the event
  const {
    fieldName,
    parentTypeName,
    arguments: args,
    identity,
    source: parent,
  } = event;

  // Context to pass to resolvers
  const context = { sequelize };

  try {
    // Map the resolver based on parentTypeName and fieldName
    const resolver = resolvers[parentTypeName]?.[fieldName];

    if (!resolver) {
      throw new Error(`Resolver not found for ${parentTypeName}.${fieldName}`);
    }

    // Execute the resolver
    const result = await resolver(parent, args, context, {
      fieldName,
      parentTypeName,
    });

    console.log(`Resolver result for ${parentTypeName}.${fieldName}:`, result);

    // Return the result in AppSync-compatible format
    return result;
  } catch (error) {
    console.error(`Error in ${parentTypeName}.${fieldName}:`, error);
    return {
      __typename: "Error",
      message: error.message || "Internal server error",
      type: error.name || "InternalError",
    };
  }
};
