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
      throw new Error("Database initialization failed");
    }
  }
}

exports.handler = async (event) => {
  console.log("Lambda event:", JSON.stringify(event, null, 2));

  // Initialize database
  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Database initialization error:", error);
    return {
      __typename: "Error",
      message: "Failed to connect to database",
      type: "DatabaseError",
    };
  }

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
      console.error(`Resolver not found for ${parentTypeName}.${fieldName}`);
      throw new Error(`Resolver not found for ${parentTypeName}.${fieldName}`);
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

    // Validate result against schema expectations
    if (parentTypeName === "Query") {
      if (
        fieldName === "dashboardStats" &&
        (!result || typeof result !== "object")
      ) {
        console.error(`Invalid dashboardStats result:`, result);
        return {
          totalSales: 0,
          totalCosts: 0,
          totalMargin: 0,
          lowStockIngredients: [],
        };
      }
      if (
        (fieldName === "ingredients" ||
          fieldName === "recipes" ||
          fieldName === "sales") &&
        !Array.isArray(result)
      ) {
        console.error(`Invalid ${fieldName} result, expected array:`, result);
        return [];
      }
    }

    return result;
  } catch (error) {
    console.error(`Error in ${parentTypeName}.${fieldName}:`, {
      message: error.message,
      stack: error.stack,
      event: JSON.stringify(event, null, 2),
    });

    // Return schema-compliant fallback values for Query fields
    if (parentTypeName === "Query") {
      if (fieldName === "dashboardStats") {
        return {
          totalSales: 0,
          totalCosts: 0,
          totalMargin: 0,
          lowStockIngredients: [],
        };
      }
      if (
        fieldName === "ingredients" ||
        fieldName === "recipes" ||
        fieldName === "sales"
      ) {
        return [];
      }
    }

    return {
      __typename: "Error",
      message: error.message || "Internal server error",
      type: error.name || "InternalError",
    };
  }
};
