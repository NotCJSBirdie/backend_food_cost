const {
  sequelize,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Sale,
} = require("./data-source");
const { v4: uuidv4 } = require("uuid");

// Initialize database connection on cold start
let isConnected = false;

async function initializeDatabase() {
  if (!isConnected) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
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

const resolvers = {
  Query: {
    dashboardStats: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in dashboardStats");
        return null;
      }
      try {
        const sales = await Sale.findAll();
        const totalSales = sales.reduce(
          (sum, sale) => sum + (Number(sale.saleAmount) || 0),
          0
        );

        const recipeIngredients = await RecipeIngredient.findAll({
          include: [{ model: Ingredient, as: "ingredient", required: true }],
        });
        const salesWithRecipes = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe", required: true }],
        });

        const totalCosts = salesWithRecipes.reduce((sum, sale) => {
          const recipeId = sale.recipe?.id;
          if (!recipeId) return sum;
          const recipeIng = recipeIngredients.filter(
            (ri) => ri.recipeId === recipeId
          );
          const cost = recipeIng.reduce((costSum, ri) => {
            const quantity = Number(ri.quantity) || 0;
            const unitPrice = Number(ri.ingredient?.unitPrice) || 0;
            return costSum + quantity * unitPrice;
          }, 0);
          return sum + cost;
        }, 0);

        const totalMargin = totalSales - totalCosts;

        const ingredients = await Ingredient.findAll();
        const lowStockIngredients = ingredients
          .filter(
            (ing) => Number(ing.stockQuantity) <= Number(ing.restockThreshold)
          )
          .map((ing) => ({
            id: ing.id ? String(ing.id) : null,
            name: ing.name || null,
            unitPrice: ing.unitPrice ? Number(ing.unitPrice) : null,
            unit: ing.unit || null,
            stockQuantity: ing.stockQuantity ? Number(ing.stockQuantity) : null,
            restockThreshold: ing.restockThreshold
              ? Number(ing.restockThreshold)
              : null,
          }));

        const result = {
          totalSales: totalSales ? Number(totalSales) : null,
          totalCosts: totalCosts ? Number(totalCosts) : null,
          totalMargin: totalMargin ? Number(totalMargin) : null,
          lowStockIngredients: lowStockIngredients || [],
        };

        console.log(
          "DashboardStats resolver result:",
          JSON.stringify(result, null, 2)
        );
        return result;
      } catch (error) {
        console.error("Error in dashboardStats:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
    ingredients: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in ingredients");
        return null;
      }
      try {
        const ingredients = await Ingredient.findAll();
        const result = ingredients.map((ing) => ({
          id: ing.id ? String(ing.id) : null,
          name: ing.name || null,
          unitPrice: ing.unitPrice ? Number(ing.unitPrice) : null,
          unit: ing.unit || null,
          stockQuantity: ing.stockQuantity ? Number(ing.stockQuantity) : null,
          restockThreshold: ing.restockThreshold
            ? Number(ing.restockThreshold)
            : null,
        }));
        console.log(
          "Ingredients resolver result:",
          JSON.stringify(result, null, 2)
        );
        return result;
      } catch (error) {
        console.error("Error in ingredients:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
    recipes: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in recipes");
        return null;
      }
      try {
        const recipes = await Recipe.findAll({
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              required: false,
              include: [
                { model: Ingredient, as: "ingredient", required: true },
              ],
            },
          ],
        });
        const result = recipes.map((recipe) => {
          const ingredients =
            recipe.ingredients?.filter((ri) => ri.ingredient) || [];
          const totalCost = ingredients.reduce((sum, ri) => {
            const quantity = Number(ri.quantity) || 0;
            const unitPrice = Number(ri.ingredient?.unitPrice) || 0;
            return sum + quantity * unitPrice;
          }, 0);
          return {
            id: recipe.id ? String(recipe.id) : null,
            name: recipe.name || null,
            totalCost: totalCost ? Number(totalCost) : null,
            suggestedPrice: recipe.suggestedPrice
              ? Number(recipe.suggestedPrice)
              : null,
            ingredients: ingredients.map((ri) => ({
              id: ri.id ? String(ri.id) : null,
              quantity: ri.quantity ? Number(ri.quantity) : null,
              ingredient: {
                id: ri.ingredient.id ? String(ri.ingredient.id) : null,
                name: ri.ingredient.name || null,
                unitPrice: ri.ingredient.unitPrice
                  ? Number(ri.ingredient.unitPrice)
                  : null,
                unit: ri.ingredient.unit || null,
                stockQuantity: ri.ingredient.stockQuantity
                  ? Number(ri.ingredient.stockQuantity)
                  : null,
                restockThreshold: ri.ingredient.restockThreshold
                  ? Number(ri.ingredient.restockThreshold)
                  : null,
              },
            })),
          };
        });
        console.log(
          "Recipes resolver result:",
          JSON.stringify(result, null, 2)
        );
        return result;
      } catch (error) {
        console.error("Error in recipes:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
    sales: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in sales");
        return null;
      }
      try {
        const sales = await Sale.findAll({
          include: [
            {
              model: Recipe,
              as: "recipe",
              required: true,
              include: [
                {
                  model: RecipeIngredient,
                  as: "ingredients",
                  required: false,
                  include: [
                    { model: Ingredient, as: "ingredient", required: true },
                  ],
                },
              ],
            },
          ],
        });
        const result = sales.map((sale) => {
          const recipeIngredients =
            sale.recipe?.ingredients?.filter((ri) => ri.ingredient) || [];
          return {
            id: sale.id ? String(sale.id) : null,
            saleAmount: sale.saleAmount ? Number(sale.saleAmount) : null,
            createdAt: sale.createdAt ? sale.createdAt.toISOString() : null,
            recipe: {
              id: sale.recipe.id ? String(sale.recipe.id) : null,
              name: sale.recipe.name || null,
              totalCost: sale.recipe.totalCost
                ? Number(sale.recipe.totalCost)
                : null,
              suggestedPrice: sale.recipe.suggestedPrice
                ? Number(sale.recipe.suggestedPrice)
                : null,
              ingredients: recipeIngredients.map((ri) => ({
                id: ri.id ? String(ri.id) : null,
                quantity: ri.quantity ? Number(ri.quantity) : null,
                ingredient: {
                  id: ri.ingredient.id ? String(ri.ingredient.id) : null,
                  name: ri.ingredient.name || null,
                  unitPrice: ri.ingredient.unitPrice
                    ? Number(ri.ingredient.unitPrice)
                    : null,
                  unit: ri.ingredient.unit || null,
                  stockQuantity: ri.ingredient.stockQuantity
                    ? Number(ri.ingredient.stockQuantity)
                    : null,
                  restockThreshold: ri.ingredient.restockThreshold
                    ? Number(ri.ingredient.restockThreshold)
                    : null,
                },
              })),
            },
          };
        });
        console.log("Sales resolver result:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("Error in sales:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
  },
  Mutation: {
    addIngredient: async (
      _,
      { name, unitPrice, unit, stockQuantity, restockThreshold },
      context
    ) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in addIngredient");
        return null;
      }
      try {
        const ingredient = await Ingredient.create({
          id: uuidv4(),
          name: name || null,
          unitPrice: unitPrice ? Number(unitPrice) : null,
          unit: unit || null,
          stockQuantity: stockQuantity ? Number(stockQuantity) : null,
          restockThreshold: restockThreshold ? Number(restockThreshold) : null,
        });
        const result = {
          id: ingredient.id ? String(ingredient.id) : null,
          name: ingredient.name || null,
          unitPrice: ingredient.unitPrice ? Number(ingredient.unitPrice) : null,
          unit: ingredient.unit || null,
          stockQuantity: ingredient.stockQuantity
            ? Number(ingredient.stockQuantity)
            : null,
          restockThreshold: ingredient.restockThreshold
            ? Number(ingredient.restockThreshold)
            : null,
        };
        console.log("addIngredient result:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("Error in addIngredient:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
    createRecipe: async (
      _,
      { name, ingredientIds, quantities, targetMargin },
      context
    ) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in createRecipe");
        return null;
      }
      try {
        if (
          !ingredientIds ||
          !quantities ||
          ingredientIds.length !== quantities.length
        ) {
          console.error("Invalid recipe input:", { ingredientIds, quantities });
          return null;
        }

        const ingredients = await Ingredient.findAll({
          where: { id: ingredientIds },
        });
        if (ingredients.length !== ingredientIds.length) {
          console.error("Some ingredients not found:", ingredientIds);
          return null;
        }

        let totalCost = 0;
        const recipeIngredients = ingredientIds.map((id, i) => {
          const ingredient = ingredients.find((ing) => ing.id == id);
          const quantity = quantities[i] ? Number(quantities[i]) : 0;
          totalCost += (ingredient.unitPrice || 0) * quantity;
          return {
            ingredientId: id,
            quantity,
          };
        });

        const suggestedPrice = targetMargin
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;

        const recipe = await context.sequelize.transaction(async (t) => {
          const newRecipe = await Recipe.create(
            {
              id: uuidv4(),
              name: name || null,
              totalCost: totalCost || null,
              suggestedPrice: suggestedPrice || null,
            },
            { transaction: t }
          );
          const recipeIngData = recipeIngredients.map((ri) => ({
            ...ri,
            recipeId: newRecipe.id,
          }));
          await RecipeIngredient.bulkCreate(recipeIngData, { transaction: t });
          return newRecipe;
        });

        const savedRecipe = await Recipe.findByPk(recipe.id, {
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              include: [{ model: Ingredient, as: "ingredient" }],
            },
          ],
        });

        const result = {
          id: savedRecipe.id ? String(savedRecipe.id) : null,
          name: savedRecipe.name || null,
          totalCost: totalCost ? Number(totalCost) : null,
          suggestedPrice: savedRecipe.suggestedPrice
            ? Number(savedRecipe.suggestedPrice)
            : null,
          ingredients:
            savedRecipe.ingredients?.map((ri) => ({
              id: ri.id ? String(ri.id) : null,
              quantity: ri.quantity ? Number(ri.quantity) : null,
              ingredient: {
                id: ri.ingredient.id ? String(ri.ingredient.id) : null,
                name: ri.ingredient.name || null,
                unitPrice: ri.ingredient.unitPrice
                  ? Number(ri.ingredient.unitPrice)
                  : null,
                unit: ri.ingredient.unit || null,
                stockQuantity: ri.ingredient.stockQuantity
                  ? Number(ri.ingredient.stockQuantity)
                  : null,
                restockThreshold: ri.ingredient.restockThreshold
                  ? Number(ri.ingredient.restockThreshold)
                  : null,
              },
            })) || [],
        };
        console.log("createRecipe result:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("Error in createRecipe:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
    recordSale: async (_, { recipeId, saleAmount, quantitySold }, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in recordSale");
        return null;
      }
      try {
        if (!recipeId) {
          console.error("Recipe ID is required");
          return null;
        }

        const recipe = await Recipe.findByPk(recipeId, {
          include: [{ model: RecipeIngredient, as: "ingredients" }],
        });
        if (!recipe) {
          console.error(`Recipe ${recipeId} not found`);
          return null;
        }

        const ingredients = recipe.ingredients || [];
        const sale = await context.sequelize.transaction(async (t) => {
          for (const ri of ingredients) {
            const ingredient = await Ingredient.findByPk(ri.ingredientId, {
              transaction: t,
            });
            if (!ingredient) {
              console.error(`Ingredient ${ri.ingredientId} not found`);
              return null;
            }
            const stockDeduction = ri.quantity * (quantitySold || 0);
            const newStock = (ingredient.stockQuantity || 0) - stockDeduction;
            if (newStock < 0) {
              console.error(`Insufficient stock for ${ingredient.name}`);
              return null;
            }
            await ingredient.update(
              { stockQuantity: newStock },
              { transaction: t }
            );
          }

          const sale = await Sale.create(
            {
              saleAmount: saleAmount || null,
              recipeId,
              createdAt: new Date(),
            },
            { transaction: t }
          );
          return sale;
        });

        if (!sale) {
          return null;
        }

        const savedSale = await Sale.findByPk(sale.id, {
          include: [
            {
              model: Recipe,
              as: "recipe",
              include: [
                {
                  model: RecipeIngredient,
                  as: "ingredients",
                  include: [{ model: Ingredient, as: "ingredient" }],
                },
              ],
            },
          ],
        });

        const result = {
          id: savedSale.id ? String(savedSale.id) : null,
          saleAmount: savedSale.saleAmount
            ? Number(savedSale.saleAmount)
            : null,
          createdAt: savedSale.createdAt
            ? savedSale.createdAt.toISOString()
            : null,
          recipe: {
            id: savedSale.recipe.id ? String(savedSale.recipe.id) : null,
            name: savedSale.recipe.name || null,
            totalCost: savedSale.recipe.totalCost
              ? Number(savedSale.recipe.totalCost)
              : null,
            suggestedPrice: savedSale.recipe.suggestedPrice
              ? Number(savedSale.recipe.suggestedPrice)
              : null,
            ingredients:
              savedSale.recipe.ingredients?.map((ri) => ({
                id: ri.id ? String(ri.id) : null,
                quantity: ri.quantity ? Number(ri.quantity) : null,
                ingredient: {
                  id: ri.ingredient.id ? String(ri.ingredient.id) : null,
                  name: ri.ingredient.name || null,
                  unitPrice: ri.ingredient.unitPrice
                    ? Number(ri.ingredient.unitPrice)
                    : null,
                  unit: ri.ingredient.unit || null,
                  stockQuantity: ri.ingredient.stockQuantity
                    ? Number(ri.ingredient.stockQuantity)
                    : null,
                  restockThreshold: ri.ingredient.restockThreshold
                    ? Number(ri.ingredient.restockThreshold)
                    : null,
                },
              })) || [],
          },
        };
        console.log("recordSale result:", JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error("Error in recordSale:", {
          message: error.message,
          stack: error.stack,
        });
        return null;
      }
    },
  },
};

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
    return null;
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
    return null;
  }
};
