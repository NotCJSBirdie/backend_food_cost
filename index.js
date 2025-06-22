const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { readFileSync } = require("fs");
const { sequelize, syncDatabase } = require("./data-source");
const resolvers = require("./resolvers");

const typeDefs = readFileSync("./src/schema.graphql", { encoding: "utf-8" });

async function startServer() {
  try {
    console.log("Starting Apollo Server...");
    console.log("Environment variables:", {
      PORT: process.env.PORT,
      DB_HOST: process.env.DB_HOST,
      DB_NAME: process.env.DB_NAME,
      NODE_ENV: process.env.NODE_ENV,
    });

    // Sync database
    console.log("Syncing database...");
    await syncDatabase();
    console.log("Database sync completed");

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => {
        console.log("Creating context for request");
        return { sequelize };
      },
    });

    console.log("Starting standalone server...");
    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    });

    console.log(`🚀 Server ready at ${url}`);
  } catch (error) {
    console.error("Failed to start server:", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

startServer();
