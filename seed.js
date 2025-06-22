const {
  sequelize,
  Invoice,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Sale,
} = require("./data-source");

async function seedDatabase() {
  let connection;
  try {
    // Open a new connection for the seeding process
    connection = await sequelize.connectionManager.getConnection();
    console.log("Acquired database connection");

    // Sync with force: true, but handle potential errors
    try {
      await sequelize.sync({ force: true });
      console.log("Database synced, tables cleared");
    } catch (syncError) {
      console.error("Sync failed, attempting to proceed:", syncError);
      // Proceed with seeding, assuming tables might exist
    }

    // Insert Ingredients with unique IDs
    const [ingredient1, ingredient2] = await Promise.all([
      Ingredient.findOrCreate({
        where: { id: "ing1" },
        defaults: { name: "Flour", unitPrice: 2.5, unit: "kg" },
      }),
      Ingredient.findOrCreate({
        where: { id: "ing2" },
        defaults: { name: "Sugar", unitPrice: 1.8, unit: "kg" },
      }),
    ]);
    console.log("Ingredients inserted:", { ingredient1, ingredient2 });

    // Insert Invoice
    const invoice = await Invoice.create({
      fileName: "invoice1.pdf",
      totalAmount: 50.0,
    });
    console.log("Invoice inserted:", invoice);

    // Insert Recipe
    const recipe = await Recipe.create({
      id: "rec1",
      name: "Cake",
      totalCost: 0,
    });
    console.log("Recipe created:", recipe);

    // Insert RecipeIngredients without hardcoded IDs
    const recipeIngredient1 = await RecipeIngredient.create({
      recipeId: "rec1",
      ingredientId: "ing1",
      quantity: 1.0,
    });
    const recipeIngredient2 = await RecipeIngredient.create({
      recipeId: "rec1",
      ingredientId: "ing2",
      quantity: 0.5,
    });
    console.log("RecipeIngredients inserted:", {
      recipeIngredient1,
      recipeIngredient2,
    });

    // Update totalCost
    const totalCost =
      ingredient1[0].unitPrice * 1.0 + ingredient2[0].unitPrice * 0.5;
    recipe.totalCost = totalCost;
    await recipe.save();
    console.log("Recipe totalCost updated:", recipe);

    // Insert Sale without hardcoded ID
    const sale = await Sale.create({
      saleAmount: 15.0,
      recipeId: "rec1",
    });
    console.log("Sale inserted:", sale);

    console.log("Seed data inserted successfully:", {
      invoice,
      ingredient1: ingredient1[0],
      ingredient2: ingredient2[0],
      recipe,
      sale,
    });
  } catch (error) {
    console.error("Seeding failed:", error);
    // Optionally rethrow or handle specific errors
  } finally {
    if (connection) {
      await sequelize.connectionManager.releaseConnection(connection);
      console.log("Released database connection");
    } else {
      await sequelize.close(); // Fallback if no connection was acquired
      console.log("Closed database connection");
    }
  }
}

seedDatabase().catch((err) => {
  console.error("Uncaught seeding error:", err);
  process.exit(1);
});
