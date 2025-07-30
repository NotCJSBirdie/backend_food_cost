const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: "ap-southeast-2" });
const { v4: uuidv4 } = require("uuid");
const { GraphQLError } = require("graphql");

// Helper: get all items from a table
const scanAll = async (TableName) => {
  let items = [];
  let params = { TableName };
  do {
    const res = await ddb.scan(params).promise();
    items.push(...(res.Items || []));
    params.ExclusiveStartKey = res.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);
  return items;
};

// Helper: get items in batch (e.g. for ingredients by id)
const batchGet = async (TableName, ids) => {
  if (ids.length === 0) return [];
  const params = {
    RequestItems: {
      [TableName]: {
        Keys: ids.map((id) => ({ id })),
      },
    },
  };
  const res = await ddb.batchGet(params).promise();
  return res.Responses ? res.Responses[TableName] : [];
};

// --- Resolvers ---
const resolvers = {
  Query: {
    // Dashboard statistics (compute in-memory)
    dashboardStats: async () => {
      try {
        // 1. Get all sales, all recipes, all ingredients
        const [sales, recipes, ingredients] = await Promise.all([
          scanAll("Sales"),
          scanAll("Recipes"),
          scanAll("Ingredients"),
        ]);
        const ingredientsMap = Object.fromEntries(
          ingredients.map((i) => [i.id, i])
        );

        // 2. Parse sales and look up recipe costs per sale
        let totalSales = 0,
          totalCosts = 0;
        let recipesMap = Object.fromEntries(recipes.map((r) => [r.id, r]));

        for (const sale of sales) {
          totalSales += Number(sale.saleAmount || 0);

          // Get related recipe with its parsed ingredients
          const recipe = recipesMap[sale.recipeId];
          if (recipe && recipe.ingredients) {
            let ingrArr = recipe.ingredients;
            if (typeof ingrArr === "string") {
              ingrArr = JSON.parse(ingrArr);
            }
            const cost = ingrArr.reduce((sum, ri) => {
              const ing = ingredientsMap[ri.ingredientId];
              return (
                sum +
                (ri.quantity || 0) * (ing ? Number(ing.unitPrice || 0) : 0)
              );
            }, 0);
            totalCosts += cost;
          }
        }

        // 3. Compute margin and find low-stock ingredients
        const totalMargin = totalSales - totalCosts;
        const lowStockIngredients = ingredients.filter(
          (ing) =>
            (Number(ing.stockQuantity) || 0) <= Number(ing.restockThreshold)
        );

        return {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients,
        };
      } catch (error) {
        console.error("Error in dashboardStats:", error);
        throw new GraphQLError("Failed to fetch dashboard stats", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    // List all ingredients
    ingredients: async () => {
      try {
        const ingredients = await scanAll("Ingredients");
        return ingredients;
      } catch (error) {
        console.error("Error in ingredients:", error);
        throw new GraphQLError("Failed to fetch ingredients", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    // List all recipes, parsed with embedded ingredient info and cost computations
    recipes: async () => {
      try {
        const recipes = await scanAll("Recipes");
        const ingredients = await scanAll("Ingredients");
        const ingredientsMap = Object.fromEntries(
          ingredients.map((i) => [i.id, i])
        );
        return recipes.map((recipe) => {
          // Parse the ingredients array (stringified JSON)
          let ingrArr = recipe.ingredients;
          if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
          const ingrWithInfo = (ingrArr || []).map((ri) => ({
            id: ri.id ? String(ri.id) : null,
            quantity: ri.quantity ? Number(ri.quantity) : null,
            ingredient: ingredientsMap[ri.ingredientId] || null,
          }));
          const totalCost = ingrWithInfo.reduce(
            (sum, ri) =>
              sum +
              (ri.quantity || 0) *
                (ri.ingredient ? Number(ri.ingredient.unitPrice || 0) : 0),
            0
          );
          return {
            id: recipe.id,
            name: recipe.name,
            totalCost: totalCost,
            suggestedPrice: recipe.suggestedPrice,
            ingredients: ingrWithInfo,
          };
        });
      } catch (error) {
        console.error("Error in recipes:", error);
        throw new GraphQLError("Failed to fetch recipes", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
    // List all sales, with related recipe details
    sales: async () => {
      try {
        const sales = await scanAll("Sales");
        const recipes = await scanAll("Recipes");
        const ingredients = await scanAll("Ingredients");
        const recipesMap = Object.fromEntries(recipes.map((r) => [r.id, r]));
        const ingredientsMap = Object.fromEntries(
          ingredients.map((i) => [i.id, i])
        );

        return sales.map((sale) => {
          const recipe = recipesMap[sale.recipeId];
          if (recipe) {
            let ingrArr = recipe.ingredients;
            if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
            const ingrWithInfo = (ingrArr || []).map((ri) => ({
              id: ri.id ? String(ri.id) : null,
              quantity: ri.quantity ? Number(ri.quantity) : null,
              ingredient: ingredientsMap[ri.ingredientId] || null,
            }));
            return {
              id: sale.id,
              saleAmount: sale.saleAmount,
              createdAt: sale.createdAt,
              recipe: {
                id: recipe.id,
                name: recipe.name,
                totalCost: recipe.totalCost,
                suggestedPrice: recipe.suggestedPrice,
                ingredients: ingrWithInfo,
              },
            };
          }
          // If recipe reference is missing:
          return {
            id: sale.id,
            saleAmount: sale.saleAmount,
            createdAt: sale.createdAt,
            recipe: null,
          };
        });
      } catch (error) {
        console.error("Error in sales:", error);
        throw new GraphQLError("Failed to fetch sales", {
          extensions: { code: "DATABASE_ERROR", originalError: error.message },
        });
      }
    },
  },
  Mutation: {
    // --- Add Ingredient ---
    addIngredient: async (_, args) => {
      try {
        const { name, unitPrice, unit, stockQuantity, restockThreshold } = args;
        if (!name || name.trim() === "")
          return {
            success: false,
            error: "Ingredient name is required",
            ingredient: null,
          };
        if (unitPrice == null || unitPrice < 0)
          return {
            success: false,
            error: "Unit price must be non-negative",
            ingredient: null,
          };
        if (!unit || unit.trim() === "")
          return {
            success: false,
            error: "Unit is required",
            ingredient: null,
          };
        if (stockQuantity == null || stockQuantity < 0)
          return {
            success: false,
            error: "Stock quantity must be non-negative",
            ingredient: null,
          };
        if (restockThreshold == null || restockThreshold < 0)
          return {
            success: false,
            error: "Restock threshold must be non-negative",
            ingredient: null,
          };

        const ingredient = {
          id: uuidv4(),
          name: name.trim(),
          unitPrice: Number(unitPrice),
          unit: unit.trim(),
          stockQuantity: Number(stockQuantity),
          restockThreshold: Number(restockThreshold),
        };
        await ddb
          .put({
            TableName: "Ingredients",
            Item: ingredient,
            ConditionExpression: "attribute_not_exists(id)",
          })
          .promise();

        return { success: true, error: null, ingredient };
      } catch (error) {
        console.error("Error in addIngredient:", error, args);
        return {
          success: false,
          error: error.message || "Failed to add ingredient",
          ingredient: null,
        };
      }
    },
    // --- Create Recipe ---
    createRecipe: async (_, args) => {
      try {
        const { name, ingredientIds, quantities, targetMargin } = args;
        if (!name || name.trim() === "")
          return {
            success: false,
            error: "Recipe name is required",
            recipe: null,
          };
        if (
          !ingredientIds ||
          !quantities ||
          ingredientIds.length !== quantities.length ||
          ingredientIds.length === 0
        ) {
          return {
            success: false,
            error:
              "Invalid recipe input: ingredient IDs and quantities must match and be non-empty",
            recipe: null,
          };
        }
        if (quantities.some((q) => q == null || q <= 0))
          return {
            success: false,
            error: "All quantities must be positive numbers",
            recipe: null,
          };
        if (targetMargin != null && (targetMargin < 0 || targetMargin >= 1))
          return {
            success: false,
            error: "Target margin must be between 0 and 1",
            recipe: null,
          };

        const ingredientsList = await batchGet("Ingredients", ingredientIds);
        if (ingredientsList.length !== ingredientIds.length) {
          return {
            success: false,
            error: "Some ingredients not found",
            recipe: null,
          };
        }
        let totalCost = 0;
        const recipeIngredientsArr = ingredientIds.map((id, i) => {
          const ingredient = ingredientsList.find((ing) => ing.id == id);
          const quantity = Number(quantities[i]);
          totalCost += (ingredient.unitPrice || 0) * quantity;
          return { ingredientId: id, quantity };
        });
        const suggestedPrice = targetMargin
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;
        const recipe = {
          id: uuidv4(),
          name: name.trim(),
          totalCost,
          suggestedPrice,
          ingredients: JSON.stringify(recipeIngredientsArr),
        };
        await ddb.put({ TableName: "Recipes", Item: recipe }).promise();
        // Return recipe object (parse ingredients for output)
        return {
          success: true,
          error: null,
          recipe: { ...recipe, ingredients: recipeIngredientsArr },
        };
      } catch (error) {
        console.error("Error in createRecipe:", error, args);
        return {
          success: false,
          error: error.message || "Failed to create recipe",
          recipe: null,
        };
      }
    },
    // --- Record Sale ---
    recordSale: async (_, args) => {
      try {
        const { recipeId, saleAmount, quantitySold } = args;
        if (!recipeId || typeof recipeId !== "string")
          return { success: false, error: "Invalid recipe ID", sale: null };
        if (saleAmount == null || saleAmount <= 0 || isNaN(Number(saleAmount)))
          return {
            success: false,
            error: "Sale amount must be a positive number",
            sale: null,
          };
        if (
          quantitySold == null ||
          !Number.isInteger(Number(quantitySold)) ||
          quantitySold <= 0
        )
          return {
            success: false,
            error: "Quantity sold must be a positive integer",
            sale: null,
          };

        // Fetch recipe and parse ingredient requirements
        const recipeRes = await ddb
          .get({ TableName: "Recipes", Key: { id: recipeId } })
          .promise();
        const recipe = recipeRes.Item;
        if (!recipe)
          return {
            success: false,
            error: `Recipe ${recipeId} not found`,
            sale: null,
          };

        let ingrArr = recipe.ingredients;
        if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
        if ((ingrArr || []).length === 0)
          return {
            success: false,
            error: `Recipe ${recipeId} has no ingredients`,
            sale: null,
          };
        const ingredientIds = ingrArr.map((ri) => ri.ingredientId);
        const stockIngredients = await batchGet("Ingredients", ingredientIds);
        // Prepare TransactWrite for stock update and sale record (atomic)
        const transactItems = [];
        for (const ri of ingrArr) {
          const ing = stockIngredients.find(
            (item) => item.id === ri.ingredientId
          );
          if (!ing)
            return {
              success: false,
              error: `Ingredient ${ri.ingredientId} not found`,
              sale: null,
            };
          const stockDeduction = Number(ri.quantity) * Number(quantitySold);
          // Add Update for each ingredient with stock check
          transactItems.push({
            Update: {
              TableName: "Ingredients",
              Key: { id: ing.id },
              UpdateExpression: "SET stockQuantity = stockQuantity - :deduct",
              ConditionExpression: "stockQuantity >= :deduct",
              ExpressionAttributeValues: { ":deduct": stockDeduction },
            },
          });
        }
        // Add sale record
        const sale = {
          id: uuidv4(),
          saleAmount: Number(saleAmount),
          quantitySold: Number(quantitySold),
          recipeId,
          createdAt: new Date().toISOString(),
        };
        transactItems.push({ Put: { TableName: "Sales", Item: sale } });
        // Execute transaction
        await ddb.transactWrite({ TransactItems: transactItems }).promise();

        // Return sale and full recipe info
        return {
          success: true,
          error: null,
          sale: {
            id: sale.id,
            saleAmount: sale.saleAmount,
            createdAt: sale.createdAt,
            recipe: { ...recipe, ingredients: ingrArr },
          },
        };
      } catch (error) {
        // Handle transaction or condition errors
        console.error("Error in recordSale:", error, args);
        return {
          success: false,
          error: error.message || "Failed to record sale",
          sale: null,
        };
      }
    },
    // --- Delete Ingredient ---
    deleteIngredient: async (_, { id }) => {
      try {
        // Remove ingredient and all references. First, update all recipes to remove this ingredient.
        const ingredientsRes = await ddb
          .get({ TableName: "Ingredients", Key: { id } })
          .promise();
        if (!ingredientsRes.Item)
          return { success: false, error: `Ingredient ${id} not found` };

        // Remove from Ingredients Table
        await ddb.delete({ TableName: "Ingredients", Key: { id } }).promise();

        // Remove this ingredient from every recipe.ingredients array
        const recipes = await scanAll("Recipes");
        for (const recipe of recipes) {
          let ingrArr = recipe.ingredients;
          if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
          if ((ingrArr || []).some((ri) => ri.ingredientId === id)) {
            const updatedArr = ingrArr.filter((ri) => ri.ingredientId !== id);
            await ddb
              .update({
                TableName: "Recipes",
                Key: { id: recipe.id },
                UpdateExpression: "SET ingredients = :updated",
                ExpressionAttributeValues: {
                  ":updated": JSON.stringify(updatedArr),
                },
              })
              .promise();
          }
        }
        return { success: true, error: null };
      } catch (error) {
        console.error("Error in deleteIngredient:", error);
        return {
          success: false,
          error: error.message || "Failed to delete ingredient",
        };
      }
    },
    // --- Delete Recipe ---
    deleteRecipe: async (_, { id }) => {
      try {
        // Remove related sales and then the recipe
        const sales = await scanAll("Sales");
        for (const sale of sales.filter((s) => s.recipeId === id)) {
          await ddb
            .delete({ TableName: "Sales", Key: { id: sale.id } })
            .promise();
        }
        await ddb.delete({ TableName: "Recipes", Key: { id } }).promise();
        return { success: true, error: null };
      } catch (error) {
        console.error("Error in deleteRecipe:", error);
        return {
          success: false,
          error: error.message || "Failed to delete recipe",
        };
      }
    },
    // --- Delete Sale ---
    deleteSale: async (_, { id }) => {
      try {
        await ddb.delete({ TableName: "Sales", Key: { id } }).promise();
        return { success: true, error: null };
      } catch (error) {
        console.error("Error in deleteSale:", error);
        return {
          success: false,
          error: error.message || "Failed to delete sale",
        };
      }
    },
  },
};

// --- Main Lambda Handler ---
exports.handler = async (event) => {
  try {
    // Parse event same as before
    const payload = event.payload || event;
    const info = payload.info || {};
    const parentTypeName =
      info.parentTypeName || payload.parentTypeName || "Unknown";
    const fieldName = info.fieldName || payload.fieldName || "unknown";
    const args = payload.arguments || event.arguments || {};

    const resolver = resolvers[parentTypeName]?.[fieldName];
    if (!resolver) {
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
    const result = await resolver(null, args, {}); // No context needed (was { sequelize })
    return result;
  } catch (error) {
    console.error("Unhandled Lambda Error:", error);
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
