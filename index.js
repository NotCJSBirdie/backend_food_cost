const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");
const { readFileSync } = require("fs");
const { sequelize, syncDatabase } = require("./data-source");
const resolvers = require("./resolvers");

const typeDefs = readFileSync("./src/schema.graphql", { encoding: "utf-8" });

async function startServer() {
  try {
    // Sync database
    await syncDatabase();

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ sequelize }),
    });

    const { url } = await startStandaloneServer(server, {
      listen: { port: process.env.PORT || 4000 },
    });

    console.log(`🚀 Server ready at ${url}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
