const { Ingredient, Recipe, RecipeIngredient, Sale } = require("./data-source");
const { ApolloError } = require("apollo-server");

const resolvers = {
  Query: {
    dashboardStats: async (_, __, { sequelize }) => {
      try {
        // Fetch sales
        const sales = await Sale.findAll();
        const totalSales = sales.reduce(
          (sum, sale) => sum + (Number(sale.saleAmount) || 0),
          0
        );

        // Fetch recipe ingredients and ingredients to calculate total costs
        const recipeIngredients = await RecipeIngredient.findAll({
          include: [{ model: Ingredient, as: "ingredient" }],
        });
        const salesWithRecipes = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe" }],
        });

        // Calculate total costs based on ingredients used in sales
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

        // Calculate margin
        const totalMargin = totalSales - totalCosts;

        // Fetch low stock ingredients
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

        return {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients,
        };
      } catch (error) {
        console.error("Error in dashboardStats:", error);
        throw new ApolloError("Failed to fetch dashboard stats", "DB_ERROR");
      }
    },
    ingredients: async (_, __, { sequelize }) => {
      try {
        const ingredients = await Ingredient.findAll();
        return ingredients.map((ing) => ({
          id: String(ing.id),
          name: ing.name || "",
          unitPrice: Number(ing.unitPrice) || 0,
          unit: ing.unit || "",
          stockQuantity: Number(ing.stockQuantity) || 0,
          restockThreshold: Number(ing.restockThreshold) || 0,
        }));
      } catch (error) {
        console.error("Error in ingredients:", error);
        throw new ApolloError("Failed to fetch ingredients", "DB_ERROR");
      }
    },
    recipes: async (_, __, { sequelize }) => {
      try {
        const recipes = await Recipe.findAll({
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              required: false,
              include: [{ model: Ingredient, as: "ingredient" }],
            },
          ],
        });
        return recipes.map((recipe) => {
          const ingredients = recipe.ingredients || [];
          const totalCost = ingredients.reduce((sum, ri) => {
            const quantity = Number(ri.quantity) || 0;
            const unitPrice = Number(ri.ingredient?.unitPrice) || 0;
            return sum + quantity * unitPrice;
          }, 0);
          return {
            id: String(recipe.id),
            name: recipe.name || "",
            totalCost,
            suggestedPrice: Number(recipe.suggestedPrice) || 0,
            ingredients: ingredients.map((ri) => ({
              id: String(ri.id),
              quantity: Number(ri.quantity) || 0,
              ingredient: ri.ingredient
                ? {
                    id: String(ri.ingredient.id),
                    name: ri.ingredient.name || "",
                    unitPrice: Number(ri.ingredient.unitPrice) || 0,
                    unit: ri.ingredient.unit || "",
                    stockQuantity: Number(ri.ingredient.stockQuantity) || 0,
                    restockThreshold:
                      Number(ri.ingredient.restockThreshold) || 0,
                  }
                : null,
            })),
          };
        });
      } catch (error) {
        console.error("Error in recipes:", error);
        throw new ApolloError("Failed to fetch recipes", "DB_ERROR");
      }
    },
    sales: async (_, __, { sequelize }) => {
      try {
        const sales = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe", required: true }],
        });
        return sales.map((sale) => {
          if (!sale.recipe) {
            throw new ApolloError(
              `Sale ${sale.id} missing recipe`,
              "DATA_ERROR"
            );
          }
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
              ingredients: Array.isArray(sale.recipe.ingredients)
                ? sale.recipe.ingredients
                : [],
            },
          };
        });
      } catch (error) {
        console.error("Error in sales:", error);
        throw new ApolloError("Failed to fetch sales", "DB_ERROR");
      }
    },
  },
  Mutation: {
    addIngredient: async (
      _,
      { name, unitPrice, unit, stockQuantity, restockThreshold },
      { sequelize }
    ) => {
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
          throw new ApolloError("Invalid ingredient input", "INPUT_ERROR");
        }
        const ingredient = await Ingredient.create({
          name,
          unitPrice,
          unit,
          stockQuantity,
          restockThreshold,
        });
        return {
          id: String(ingredient.id),
          name: ingredient.name,
          unitPrice: Number(ingredient.unitPrice),
          unit: ingredient.unit,
          stockQuantity: Number(ingredient.stockQuantity),
          restockThreshold: Number(ingredient.restockThreshold),
        };
      } catch (error) {
        console.error("Error in addIngredient:", error);
        throw new ApolloError("Failed to create ingredient", "DB_ERROR");
      }
    },
    createRecipe: async (
      _,
      { name, ingredientIds, quantities, targetMargin },
      { sequelize }
    ) => {
      try {
        if (
          !name ||
          !Array.isArray(ingredientIds) ||
          !Array.isArray(quantities) ||
          ingredientIds.length !== quantities.length
        ) {
          throw new ApolloError("Invalid recipe input", "INPUT_ERROR");
        }
        if (Number.isFinite(targetMargin) && targetMargin >= 1) {
          throw new ApolloError("Invalid target margin", "INPUT_ERROR");
        }

        const ingredients = await Ingredient.findAll({
          where: { id: ingredientIds },
        });
        if (ingredients.length !== ingredientIds.length) {
          throw new ApolloError("Some ingredients not found", "DATA_ERROR");
        }

        let totalCost = 0;
        const recipeIngredients = ingredientIds.map((id, i) => {
          const ingredient = ingredients.find((ing) => ing.id === id);
          const quantity = Number(quantities[i]);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new ApolloError(
              `Invalid quantity for ingredient ${ingredient.name}`,
              "INPUT_ERROR"
            );
          }
          totalCost += ingredient.unitPrice * quantity;
          return {
            ingredientId: id,
            quantity,
          };
        });

        const suggestedPrice = Number.isFinite(targetMargin)
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;

        const recipe = await sequelize.transaction(async (t) => {
          const newRecipe = await Recipe.create(
            {
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

        return {
          id: String(savedRecipe.id),
          name: savedRecipe.name,
          totalCost,
          suggestedPrice: Number(savedRecipe.suggestedPrice),
          ingredients: savedRecipe.ingredients.map((ri) => ({
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
          })),
        };
      } catch (error) {
        console.error("Error in createRecipe:", error);
        throw new ApolloError("Failed to create recipe", "DB_ERROR");
      }
    },
    recordSale: async (
      _,
      { recipeId, saleAmount, quantitySold },
      { sequelize }
    ) => {
      try {
        if (!recipeId) {
          throw new ApolloError("Recipe ID is required", "INPUT_ERROR");
        }
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          throw new ApolloError("Sale amount must be positive", "INPUT_ERROR");
        }
        if (!Number.isInteger(quantitySold) || quantitySold <= 0) {
          throw new ApolloError(
            "Quantity sold must be a positive integer",
            "INPUT_ERROR"
          );
        }

        const recipe = await Recipe.findByPk(recipeId, {
          include: [{ model: RecipeIngredient, as: "ingredients" }],
        });
        if (!recipe) {
          throw new ApolloError(`Recipe ${recipeId} not found`, "DATA_ERROR");
        }

        const ingredients = recipe.ingredients || [];
        await sequelize.transaction(async (t) => {
          for (const ri of ingredients) {
            const ingredient = await Ingredient.findByPk(ri.ingredientId, {
              transaction: t,
            });
            if (!ingredient) {
              throw new ApolloError(
                `Ingredient ${ri.ingredientId} not found`,
                "DATA_ERROR"
              );
            }
            const stockDeduction = ri.quantity * quantitySold;
            const newStock = ingredient.stockQuantity - stockDeduction;
            if (!Number.isFinite(newStock) || newStock < 0) {
              throw new ApolloError(
                `Insufficient stock for ${ingredient.name}`,
                "DATA_ERROR"
              );
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

        const savedSale = await Sale.findByPk(sale.id, {
          include: [{ model: Recipe, as: "recipe" }],
        });

        return {
          id: String(savedSale.id),
          saleAmount: Number(savedSale.saleAmount),
          createdAt: savedSale.createdAt.toISOString(),
          recipe: {
            id: String(savedSale.recipe.id),
            name: savedSale.recipe.name,
            totalCost: Number(savedSale.recipe.totalCost) || 0,
            suggestedPrice: Number(savedSale.recipe.suggestedPrice),
            ingredients: Array.isArray(savedSale.recipe.ingredients)
              ? savedSale.recipe.ingredients
              : [],
          },
        };
      } catch (error) {
        console.error("Error in recordSale:", error);
        throw new ApolloError("Failed to record sale", "DB_ERROR");
      }
    },
  },
};

module.exports = resolvers;
