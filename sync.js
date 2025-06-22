const { syncDatabase } = require("./data-source");

syncDatabase()
  .then(() => {
    console.log("Database sync completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error syncing database:", error);
    process.exit(1);
  });
