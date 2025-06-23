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
            id: String(ing.id),
            name: ing.name || "",
            unitPrice: Number(ing.unitPrice) || 0,
            unit: ing.unit || "",
            stockQuantity: Number(ing.stockQuantity) || 0,
            restockThreshold: Number(ing.restockThreshold) || 0,
          }));

        const result = {
          totalSales: Number(totalSales) || 0,
          totalCosts: Number(totalCosts) || 0,
          totalMargin: Number(totalMargin) || 0,
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
          id: String(ing.id),
          name: ing.name || "",
          unitPrice: Number(ing.unitPrice) || 0,
          unit: ing.unit || "",
          stockQuantity: Number(ing.stockQuantity) || 0,
          restockThreshold: Number(ing.restockThreshold) || 0,
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
            id: String(recipe.id),
            name: recipe.name || "",
            totalCost: Number(totalCost) || 0,
            suggestedPrice: Number(recipe.suggestedPrice) || 0,
            ingredients: ingredients.map((ri) => ({
              id: String(ri.id),
              quantity: Number(ri.quantity) || 0,
              ingredient: {
                id: String(ri.ingredient.id),
                name: ri.ingredient.name || "",
                unitPrice: Number(ri.ingredient.unitPrice) || 0,
                unit: ri.ingredient.unit || "",
                stockQuantity: Number(ri.ingredient.stockQuantity) || 0,
                restockThreshold: Number(ri.ingredient.restockThreshold) || 0,
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
            id: String(sale.id),
            saleAmount: Number(sale.saleAmount) || 0,
            createdAt:
              sale.createdAt?.toISOString() || new Date().toISOString(),
            recipe: {
              id: String(sale.recipe.id),
              name: sale.recipe.name || "",
              totalCost: Number(sale.recipe.totalCost) || 0,
              suggestedPrice: Number(sale.recipe.suggestedPrice) || 0,
              ingredients: recipeIngredients.map((ri) => ({
                id: String(ri.id),
                quantity: Number(ri.quantity) || 0,
                ingredient: {
                  id: String(ri.ingredient.id),
                  name: ri.ingredient.name || "",
                  unitPrice: Number(ri.ingredient.unitPrice) || 0,
                  unit: ri.ingredient.unit || "",
                  stockQuantity: Number(ri.ingredient.stockQuantity) || 0,
                  restockThreshold: Number(ri.ingredient.restockThreshold) || 0,
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
        if (
          !name ||
          !Number.isFinite(unitPrice) ||
          unitPrice <= 0 ||
          !unit ||
          !Number.isFinite(stockQuantity) ||
          stockQuantity < 0 ||
          !Number.isFinite(restockThreshold) ||
          restockThreshold < 0
        ) {
          console.error("Invalid ingredient input:", {
            name,
            unitPrice,
            unit,
            stockQuantity,
            restockThreshold,
          });
          return null;
        }
        const ingredient = await Ingredient.create({
          id: uuidv4(),
          name,
          unitPrice,
          unit,
          stockQuantity,
          restockThreshold,
        });
        const result = {
          id: String(ingredient.id),
          name: ingredient.name,
          unitPrice: Number(ingredient.unitPrice),
          unit: ingredient.unit,
          stockQuantity: Number(ingredient.stockQuantity),
          restockThreshold: Number(ingredient.restockThreshold),
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
          !name ||
          !Array.isArray(ingredientIds) ||
          !Array.isArray(quantities) ||
          ingredientIds.length !== quantities.length
        ) {
          console.error("Invalid recipe input:", {
            name,
            ingredientIds,
            quantities,
          });
          return null;
        }
        if (Number.isFinite(targetMargin) && targetMargin >= 1) {
          console.error("Invalid target margin:", targetMargin);
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
          const quantity = Number(quantities[i]);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            console.error(
              `Invalid quantity for ingredient ${ingredient.name}:`,
              quantity
            );
            return null;
          }
          totalCost += ingredient.unitPrice * quantity;
          return {
            ingredientId: id,
            quantity,
          };
        });

        if (recipeIngredients.includes(null)) {
          return null;
        }

        const suggestedPrice = Number.isFinite(targetMargin)
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;

        const recipe = await context.sequelize.transaction(async (t) => {
          const newRecipe = await Recipe.create(
            {
              id: uuidv4(),
              name,
              totalCost,
              suggestedPrice,
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
          id: String(savedRecipe.id),
          name: savedRecipe.name,
          totalCost: Number(totalCost),
          suggestedPrice: Number(savedRecipe.suggestedPrice),
          ingredients:
            savedRecipe.ingredients?.map((ri) => ({
              id: String(ri.id),
              quantity: Number(ri.quantity),
              ingredient: {
                id: String(ri.ingredient.id),
                name: ri.ingredient.name,
                unitPrice: Number(ri.ingredient.unitPrice),
                unit: ri.ingredient.unit,
                stockQuantity: Number(ri.ingredient.stockQuantity),
                restockThreshold: Number(ri.ingredient.restockThreshold),
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
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          console.error("Invalid sale amount:", saleAmount);
          return null;
        }
        if (!Number.isInteger(quantitySold) || quantitySold <= 0) {
          console.error("Invalid quantity sold:", quantitySold);
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
            const stockDeduction = ri.quantity * quantitySold;
            const newStock = ingredient.stockQuantity - stockDeduction;
            if (!Number.isFinite(newStock) || newStock < 0) {
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
              saleAmount,
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
          id: String(savedSale.id),
          saleAmount: Number(savedSale.saleAmount),
          createdAt: savedSale.createdAt.toISOString(),
          recipe: {
            id: String(savedSale.recipe.id),
            name: savedSale.recipe.name,
            totalCost: Number(savedSale.recipe.totalCost) || 0,
            suggestedPrice: Number(savedSale.recipe.suggestedPrice),
            ingredients:
              savedSale.recipe.ingredients?.map((ri) => ({
                id: String(ri.id),
                quantity: Number(ri.quantity),
                ingredient: {
                  id: String(ri.ingredient.id),
                  name: ri.ingredient.name,
                  unitPrice: Number(ri.ingredient.unitPrice),
                  unit: ri.ingredient.unit,
                  stockQuantity: Number(ri.ingredient.stockQuantity),
                  restockThreshold: Number(ri.ingredient.restockThreshold),
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
