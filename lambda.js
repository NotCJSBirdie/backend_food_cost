const {
  sequelize,
  Ingredient,
  Recipe,
  RecipeIngredient,
  Sale,
} = require("./data-source");
const { v4: uuidv4 } = require("uuid");
const { GraphQLError } = require("graphql");

// Initialize database connection on cold start
let isConnected = false;

async function initializeDatabase() {
  if (!isConnected) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      isConnected = true;
      console.log("Database connection established", {
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
      });
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
      throw new GraphQLError("Database initialization failed", {
        extensions: { code: "DATABASE_ERROR" },
      });
    }
  }
}

const resolvers = {
  Query: {
    dashboardStats: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in dashboardStats");
        throw new GraphQLError("Sequelize instance missing", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
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
        const lowStockIngredients = (ingredients || [])
          .filter(
            (ing) =>
              (Number(ing.stockQuantity) || 0) <= Number(ing.restockThreshold)
          )
          .map((ing) => ({
            id: ing.id ? String(ing.id) : null,
            name: ing.name || null,
            unitPrice: ing.unitPrice ? Number(ing.unitPrice) : null,
            unit: ing.unit || null,
            stockQuantity:
              ing.stockQuantity != null ? Number(ing.stockQuantity) : 0,
            restockThreshold: ing.restockThreshold
              ? Number(ing.restockThreshold)
              : null,
          }));

        const result = {
          totalSales: totalSales ? Number(totalSales) : 0,
          totalCosts: totalCosts ? Number(totalCosts) : 0,
          totalMargin: totalMargin ? Number(totalMargin) : 0,
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
        throw new GraphQLError("Failed to fetch dashboard stats", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    ingredients: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in ingredients");
        throw new GraphQLError("Sequelize instance missing", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
      try {
        const ingredients = await Ingredient.findAll();
        const result = (ingredients || []).map((ing) => ({
          id: ing.id ? String(ing.id) : null,
          name: ing.name || null,
          unitPrice: ing.unitPrice ? Number(ing.unitPrice) : null,
          unit: ing.unit || null,
          stockQuantity:
            ing.stockQuantity != null ? Number(ing.stockQuantity) : 0,
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
        throw new GraphQLError("Failed to fetch ingredients", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    recipes: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in recipes");
        throw new GraphQLError("Sequelize instance missing", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
      }
      try {
        const recipes = await Recipe.findAll({
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              required: false,
              include: [
                { model: Ingredient, as: "ingredient", required: false },
              ],
            },
          ],
        });

        const result = (recipes || []).map((recipe) => {
          const ingredients =
            (recipe.ingredients || []).filter((ri) => ri.ingredient) || [];
          const totalCost = ingredients.reduce((sum, ri) => {
            const quantity = Number(ri.quantity) || 0;
            const unitPrice = Number(ri.ingredient?.unitPrice) || 0;
            return sum + quantity * unitPrice;
          }, 0);
          return {
            id: recipe.id ? String(recipe.id) : null,
            name: recipe.name || null,
            totalCost: totalCost ? Number(totalCost) : 0,
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
                stockQuantity:
                  ri.ingredient.stockQuantity != null
                    ? Number(ri.ingredient.stockQuantity)
                    : 0,
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
        return result || [];
      } catch (error) {
        console.error("Error in recipes:", {
          message: error.message,
          stack: error.stack,
        });
        throw new GraphQLError("Failed to fetch recipes", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    sales: async (_, __, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in sales");
        throw new GraphQLError("Sequelize instance missing", {
          extensions: { code: "INTERNAL_SERVER_ERROR" },
        });
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
                    { model: Ingredient, as: "ingredient", required: false },
                  ],
                },
              ],
            },
          ],
        });
        const result = (sales || []).map((sale) => {
          const recipeIngredients =
            (sale.recipe?.ingredients || []).filter((ri) => ri.ingredient) ||
            [];
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
                  stockQuantity:
                    ri.ingredient.stockQuantity != null
                      ? Number(ri.ingredient.stockQuantity)
                      : 0,
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
        throw new GraphQLError("Failed to fetch sales", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
  },
  Mutation: {
    addIngredient: async (_, args, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in addIngredient");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        const { name, unitPrice, unit, stockQuantity, restockThreshold } = args;
        const ingredient = await Ingredient.create({
          id: uuidv4(),
          name: name || null,
          unitPrice: unitPrice ? Number(unitPrice) : null,
          unit: unit || null,
          stockQuantity: stockQuantity ? Number(stockQuantity) : 0,
          restockThreshold: restockThreshold ? Number(restockThreshold) : null,
        });
        const result = {
          id: ingredient.id ? String(ingredient.id) : null,
          name: ingredient.name || null,
          unitPrice: ingredient.unitPrice ? Number(ingredient.unitPrice) : null,
          unit: ingredient.unit || null,
          stockQuantity:
            ingredient.stockQuantity != null
              ? Number(ingredient.stockQuantity)
              : 0,
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
        return {
          success: false,
          error: error.message || "Failed to add ingredient",
        };
      }
    },
    createRecipe: async (_, args, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in createRecipe");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        const { name, ingredientIds, quantities, targetMargin } = args;
        if (
          !ingredientIds ||
          !quantities ||
          ingredientIds.length !== quantities.length
        ) {
          console.error("Invalid recipe input:", { ingredientIds, quantities });
          return {
            success: false,
            error:
              "Invalid recipe input: ingredient IDs and quantities must match",
          };
        }

        const ingredients = await Ingredient.findAll({
          where: { id: ingredientIds },
        });
        if (ingredients.length !== ingredientIds.length) {
          console.error("Some ingredients not found:", ingredientIds);
          return { success: false, error: "Some ingredients not found" };
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
                stockQuantity:
                  ri.ingredient.stockQuantity != null
                    ? Number(ri.ingredient.stockQuantity)
                    : 0,
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
        return {
          success: false,
          error: error.message || "Failed to create recipe",
        };
      }
    },
    recordSale: async (_, args, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in recordSale");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        const { recipeId, saleAmount, quantitySold } = args;

        // Validate inputs
        if (!recipeId) {
          console.error("Recipe ID is required");
          return { success: false, error: "Recipe ID is required" };
        }
        if (!saleAmount || saleAmount <= 0) {
          console.error("Invalid sale amount");
          return {
            success: false,
            error: "Sale amount must be greater than 0",
          };
        }
        if (!quantitySold || quantitySold <= 0) {
          console.error("Invalid quantity sold");
          return {
            success: false,
            error: "Quantity sold must be greater than 0",
          };
        }

        // Fetch recipe with ingredients
        const recipe = await Recipe.findByPk(recipeId, {
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              include: [
                { model: Ingredient, as: "ingredient", required: true },
              ],
            },
          ],
        });
        if (!recipe) {
          console.error(`Recipe ${recipeId} not found`);
          return { success: false, error: `Recipe ${recipeId} not found` };
        }

        // Validate recipe ingredients
        const ingredients = recipe.ingredients || [];
        if (ingredients.length === 0) {
          console.error(`Recipe ${recipeId} has no ingredients`);
          return {
            success: false,
            error: `Recipe ${recipeId} has no ingredients`,
          };
        }

        // Perform stock checks and updates in a transaction
        const sale = await context.sequelize.transaction(async (t) => {
          for (const ri of ingredients) {
            const ingredient = ri.ingredient;
            if (!ingredient) {
              console.error(
                `Ingredient ${ri.ingredientId} not found for recipe ${recipeId}`
              );
              throw new Error(`Ingredient ${ri.ingredientId} not found`);
            }

            const stockDeduction = Number(ri.quantity) * Number(quantitySold);
            const currentStock = Number(ingredient.stockQuantity) || 0;
            const newStock = currentStock - stockDeduction;

            if (newStock < 0) {
              console.error(`Insufficient stock for ${ingredient.name}`);
              throw new Error(`Insufficient stock for ${ingredient.name}`);
            }

            await ingredient.update(
              { stockQuantity: newStock },
              { transaction: t }
            );
          }

          // Create sale record
          const sale = await Sale.create(
            {
              id: uuidv4(),
              saleAmount: Number(saleAmount),
              recipeId,
              createdAt: new Date(),
            },
            { transaction: t }
          );
          return sale;
        });

        // Fetch saved sale with full details
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

        // Format result
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
                  stockQuantity:
                    ri.ingredient.stockQuantity != null
                      ? Number(ri.ingredient.stockQuantity)
                      : 0,
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
          args,
        });
        return {
          success: false,
          error: error.message || "Failed to record sale",
        };
      }
    },
    deleteIngredient: async (_, { id }, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in deleteIngredient");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        console.log(`Attempting to delete ingredient ${id}`);
        const ingredient = await Ingredient.findByPk(id);
        if (!ingredient) {
          console.error(`Ingredient ${id} not found`);
          return { success: false, error: `Ingredient ${id} not found` };
        }

        await context.sequelize.transaction(async (t) => {
          const recipeIngredients = await RecipeIngredient.findAll({
            where: { ingredientId: id },
            transaction: t,
          });
          console.log(
            `Found ${recipeIngredients.length} recipe ingredients for ingredient ${id}`
          );
          await RecipeIngredient.destroy({
            where: { ingredientId: id },
            transaction: t,
          });
          console.log(`Deleting ingredient ${id}`);
          await ingredient.destroy({ transaction: t });
        });

        console.log(`Ingredient ${id} deleted successfully`);
        return { success: true };
      } catch (error) {
        console.error("Error in deleteIngredient:", {
          message: error.message,
          stack: error.stack,
          ingredientId: id,
        });
        return {
          success: false,
          error: error.message || "Failed to delete ingredient",
        };
      }
    },
    deleteRecipe: async (_, { id }, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in deleteRecipe");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        console.log(`Attempting to delete recipe ${id}`);
        const recipe = await Recipe.findByPk(id);
        if (!recipe) {
          console.error(`Recipe ${id} not found`);
          return { success: false, error: `Recipe ${id} not found` };
        }

        await context.sequelize.transaction(async (t) => {
          const sales = await Sale.findAll({
            where: { recipeId: id },
            include: [
              {
                model: Recipe,
                as: "recipe",
                include: [{ model: RecipeIngredient, as: "ingredients" }],
              },
            ],
            transaction: t,
          });
          console.log(`Found ${sales.length} sales for recipe ${id}`);

          for (const sale of sales) {
            const recipeIngredients = sale.recipe?.ingredients || [];
            console.log(
              `Restoring stock for sale ${sale.id} with ${recipeIngredients.length} ingredients`
            );
            for (const ri of recipeIngredients) {
              if (!ri.ingredientId || ri.quantity == null) {
                console.warn(
                  `Invalid recipe ingredient data for sale ${sale.id}:`,
                  ri
                );
                continue;
              }
              const ingredient = await Ingredient.findByPk(ri.ingredientId, {
                transaction: t,
              });
              if (!ingredient) {
                console.warn(
                  `Ingredient ${ri.ingredientId} not found for sale ${sale.id}`
                );
                continue;
              }
              const newStock =
                (ingredient.stockQuantity || 0) + (ri.quantity || 0);
              console.log(
                `Updating stock for ingredient ${ri.ingredientId}: ${ingredient.stockQuantity} + ${ri.quantity} = ${newStock}`
              );
              await ingredient.update(
                { stockQuantity: newStock },
                { transaction: t }
              );
            }
            console.log(`Deleting sale ${sale.id}`);
            await sale.destroy({ transaction: t });
          }

          const recipeIngredients = await RecipeIngredient.findAll({
            where: { recipeId: id },
            transaction: t,
          });
          console.log(
            `Found ${recipeIngredients.length} recipe ingredients for recipe ${id}`
          );
          await RecipeIngredient.destroy({
            where: { recipeId: id },
            transaction: t,
          });

          console.log(`Deleting recipe ${id}`);
          await recipe.destroy({ transaction: t });
        });

        console.log(`Recipe ${id} deleted successfully`);
        return { success: true };
      } catch (error) {
        console.error("Error in deleteRecipe:", {
          message: error.message,
          stack: error.stack,
          recipeId: id,
        });
        return {
          success: false,
          error: error.message || "Failed to delete recipe",
        };
      }
    },
    deleteSale: async (_, { id }, context) => {
      if (!context.sequelize) {
        console.error("Sequelize instance missing in deleteSale");
        return { success: false, error: "Sequelize instance missing" };
      }
      try {
        console.log(`Attempting to delete sale ${id}`);
        const sale = await Sale.findByPk(id);
        if (!sale) {
          console.error(`Sale ${id} not found`);
          return { success: false, error: `Sale ${id} not found` };
        }

        const recipe = await Recipe.findByPk(sale.recipeId, {
          include: [{ model: RecipeIngredient, as: "ingredients" }],
        });
        if (!recipe) {
          console.error(`Recipe ${sale.recipeId} not found for sale ${id}`);
          return { success: false, error: `Recipe ${sale.recipeId} not found` };
        }

        await context.sequelize.transaction(async (t) => {
          const ingredients = recipe.ingredients || [];
          console.log(
            `Restoring stock for sale ${id}, recipe ${sale.recipeId}, ingredients:`,
            ingredients.map((ri) => ({
              ingredientId: ri.ingredientId,
              quantity: ri.quantity,
            }))
          );

          for (const ri of ingredients) {
            if (!ri.ingredientId || ri.quantity == null) {
              console.warn(
                `Invalid recipe ingredient data for sale ${id}:`,
                ri
              );
              continue;
            }
            const ingredient = await Ingredient.findByPk(ri.ingredientId, {
              transaction: t,
            });
            if (!ingredient) {
              console.warn(
                `Ingredient ${ri.ingredientId} not found for sale ${id}`
              );
              continue;
            }
            const newStock =
              (ingredient.stockQuantity || 0) + (ri.quantity || 0);
            console.log(
              `Updating stock for ingredient ${ri.ingredientId}: ${ingredient.stockQuantity} + ${ri.quantity} = ${newStock}`
            );
            await ingredient.update(
              { stockQuantity: newStock },
              { transaction: t }
            );
          }
          console.log(`Deleting sale ${id}`);
          await sale.destroy({ transaction: t });
        });

        console.log(`Sale ${id} deleted successfully`);
        return { success: true };
      } catch (error) {
        console.error("Error in deleteSale:", {
          message: error.message,
          stack: error.stack,
          saleId: id,
        });
        return {
          success: false,
          error: error.message || "Failed to delete sale",
        };
      }
    },
  },
};

exports.handler = async (event) => {
  console.log("Raw Lambda event:", JSON.stringify(event, null, 2));
  console.log("Lambda handler version: 2025-06-24-v3");

  // Parse event for queries and mutations
  const payload = event.payload || event;
  const info = payload.info || {};
  const parentTypeName =
    info.parentTypeName || payload.parentTypeName || "Unknown";
  const fieldName = info.fieldName || payload.fieldName || "unknown";
  const args = payload.arguments || event.arguments || {};

  console.log("Extracted values:", {
    parentTypeName,
    fieldName,
    args: JSON.stringify(args, null, 2),
    hasInfo: !!info.parentTypeName,
    hasPayload: !!payload.parentTypeName,
    eventKeys: Object.keys(event),
    payloadKeys: Object.keys(payload),
    infoKeys: Object.keys(info),
  });

  console.log(`Processing ${parentTypeName}.${fieldName}`);

  try {
    await initializeDatabase();
  } catch (error) {
    console.error("Database initialization error:", {
      message: error.message,
      stack: error.stack,
    });
    return {
      data: null,
      errors: [
        {
          message: "Database initialization failed",
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        },
      ],
    };
  }

  const context = { sequelize };

  try {
    const resolver = resolvers[parentTypeName]?.[fieldName];

    if (!resolver) {
      console.error(`Resolver not found for ${parentTypeName}.${fieldName}`);
      return {
        data: null,
        errors: [
          {
            message: `Resolver not found for ${parentTypeName}.${fieldName}`,
            extensions: { code: "NOT_FOUND" },
          },
        ],
      };
    }

    const result = await resolver(null, args, context, {
      fieldName,
      parentTypeName,
    });

    console.log(
      `Raw resolver result for ${parentTypeName}.${fieldName}:`,
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (error) {
    console.error(`Error in ${parentTypeName}.${fieldName}:`, {
      message: error.message,
      stack: error.stack,
      event: JSON.stringify(event, null, 2),
    });
    return {
      data: null,
      errors: [
        {
          message: error.message,
          extensions: {
            code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
            originalError: error.message,
          },
        },
      ],
    };
  }
};
