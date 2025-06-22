const { Ingredient, Recipe, RecipeIngredient, Sale } = require("./data-source");

const resolvers = {
  Query: {
    dashboardStats: async () => {
      console.log("Entering dashboardStats resolver...");
      try {
        const sales = await Sale.findAll();
        const recipes = await Recipe.findAll();
        const ingredients = await Ingredient.findAll();

        const totalSales = sales.reduce((sum, sale) => {
          const amount = Number(sale.saleAmount);
          return sum + (Number.isFinite(amount) ? amount : 0);
        }, 0);

        const totalCosts = recipes.reduce((sum, recipe) => {
          const cost = Number(recipe.totalCost);
          return sum + (Number.isFinite(cost) ? cost : 0);
        }, 0);

        const totalMargin =
          Number.isFinite(totalSales) && Number.isFinite(totalCosts)
            ? totalSales - totalCosts
            : 0;

        const lowStockIngredients = ingredients.filter(
          (ing) =>
            Number.isFinite(ing.stockQuantity) &&
            Number.isFinite(ing.restockThreshold) &&
            Number(ing.stockQuantity) <= Number(ing.restockThreshold)
        );

        console.log("Dashboard stats:", {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients: lowStockIngredients.length,
        });

        if (
          !Number.isFinite(totalSales) ||
          !Number.isFinite(totalCosts) ||
          !Number.isFinite(totalMargin)
        ) {
          console.error("Non-finite values detected:", {
            totalSales,
            totalCosts,
            totalMargin,
          });
          throw new Error("Invalid numerical values in dashboard stats");
        }

        return {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients: lowStockIngredients.map((ing) => ({
            ...ing.toJSON(),
            id: ing.id.toString(),
            stockQuantity: Number.isFinite(ing.stockQuantity)
              ? ing.stockQuantity
              : 0,
            restockThreshold: Number.isFinite(ing.restockThreshold)
              ? ing.restockThreshold
              : 0,
          })),
        };
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
      }
    },
    ingredients: async () => {
      console.log("Entering ingredients resolver...");
      try {
        const ingredients = await Ingredient.findAll();
        console.log("Fetched ingredients:", ingredients.length);
        return ingredients.map((i) => ({
          ...i.toJSON(),
          id: i.id.toString(),
          unitPrice: Number.isFinite(i.unitPrice) ? i.unitPrice : 0,
          stockQuantity: Number.isFinite(i.stockQuantity) ? i.stockQuantity : 0,
          restockThreshold: Number.isFinite(i.restockThreshold)
            ? i.restockThreshold
            : 0,
        }));
      } catch (error) {
        console.error("Error fetching ingredients:", error);
        return [];
      }
    },
    recipes: async () => {
      console.log("Entering recipes resolver...");
      try {
        const recipes = await Recipe.findAll({
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              required: false,
              include: [
                {
                  model: Ingredient,
                  as: "ingredient",
                  required: true,
                },
              ],
            },
          ],
        });
        console.log("Fetched recipes:", recipes.length);
        return recipes.map((r) => ({
          ...r.toJSON(),
          id: r.id.toString(),
          totalCost: Number.isFinite(r.totalCost) ? r.totalCost : 0,
          suggestedPrice: Number.isFinite(r.suggestedPrice)
            ? r.suggestedPrice
            : 0,
          ingredients:
            r.ingredients && r.ingredients.length > 0
              ? r.ingredients.map((ri) => ({
                  ...ri.toJSON(),
                  id: ri.id.toString(),
                  quantity: Number.isFinite(ri.quantity) ? ri.quantity : 0,
                  ingredient: {
                    ...ri.ingredient.toJSON(),
                    id: ri.ingredient.id.toString(),
                    unitPrice: Number.isFinite(ri.ingredient.unitPrice)
                      ? ri.ingredient.unitPrice
                      : 0,
                  },
                }))
              : [],
        }));
      } catch (error) {
        console.error("Error fetching recipes:", error);
        return [];
      }
    },
    sales: async () => {
      console.log("Entering sales resolver...");
      try {
        const sales = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe" }],
        });
        console.log("Fetched sales:", sales.length);
        return sales
          .map((s) => {
            if (!s.recipe) {
              console.warn(
                `Sale ${s.id} has no recipe, skipping due to schema`
              );
              return null;
            }
            return {
              ...s.toJSON(),
              id: s.id.toString(),
              saleAmount: Number.isFinite(s.saleAmount) ? s.saleAmount : 0,
              createdAt: s.createdAt.toISOString(),
              recipe: {
                ...s.recipe.toJSON(),
                id: s.recipe.id.toString(),
                totalCost: Number.isFinite(s.recipe.totalCost)
                  ? s.recipe.totalCost
                  : 0,
                suggestedPrice: Number.isFinite(s.recipe.suggestedPrice)
                  ? s.recipe.suggestedPrice
                  : 0,
              },
            };
          })
          .filter((s) => s !== null);
      } catch (error) {
        console.error("Error fetching sales:", error);
        return [];
      }
    },
  },
  Mutation: {
    addIngredient: async (
      _,
      { name, unitPrice, unit, stockQuantity, restockThreshold }
    ) => {
      console.log("Adding ingredient:", {
        name,
        unitPrice,
        unit,
        stockQuantity,
        restockThreshold,
      });
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
          throw new Error("Invalid ingredient input values");
        }
        const id = `ing-${Date.now()}`;
        const ingredient = await Ingredient.create({
          id,
          name,
          unitPrice,
          unit,
          stockQuantity,
          restockThreshold,
        });
        console.log("Ingredient created:", id);
        return {
          ...ingredient.toJSON(),
          id: ingredient.id.toString(),
        };
      } catch (error) {
        console.error("Error adding ingredient:", error);
        throw new Error(`Failed to add ingredient: ${error.message}`);
      }
    },
    createRecipe: async (
      _,
      { name, ingredientIds, quantities, targetMargin }
    ) => {
      console.log("Creating recipe:", {
        name,
        ingredientIds,
        quantities,
        targetMargin,
      });
      try {
        if (
          !name ||
          !ingredientIds?.length ||
          !quantities?.length ||
          ingredientIds.length !== quantities.length
        ) {
          throw new Error("Invalid recipe input values");
        }

        if (Number.isFinite(targetMargin) && targetMargin >= 1) {
          throw new Error(
            "Target margin cannot be 100% or greater (would cause invalid price calculation)"
          );
        }

        const id = `rec-${Date.now()}`;
        let totalCost = 0;
        const recipeIngredients = [];

        for (let i = 0; i < ingredientIds.length; i++) {
          const ingredient = await Ingredient.findByPk(ingredientIds[i]);
          if (!ingredient) {
            throw new Error(`Ingredient with ID ${ingredientIds[i]} not found`);
          }
          if (!Number.isFinite(quantities[i]) || quantities[i] <= 0) {
            throw new Error(
              `Invalid quantity for ingredient ${ingredient.name}`
            );
          }
          const cost = ingredient.unitPrice * quantities[i];
          if (!Number.isFinite(cost)) {
            throw new Error(`Invalid cost calculation for ${ingredient.name}`);
          }
          totalCost += cost;
          recipeIngredients.push({
            recipeId: id,
            ingredientId: ingredientIds[i],
            quantity: quantities[i],
          });
        }

        if (!Number.isFinite(totalCost)) {
          throw new Error("Invalid total cost calculation");
        }

        console.log("Recipe totalCost calculated:", totalCost);

        const suggestedPrice = Number.isFinite(targetMargin)
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;

        if (!Number.isFinite(suggestedPrice)) {
          throw new Error("Invalid suggested price calculation");
        }

        const recipe = await Recipe.create({
          id,
          name,
          totalCost,
          suggestedPrice,
        });
        console.log("Recipe created:", id);

        await RecipeIngredient.bulkCreate(recipeIngredients);
        console.log("Recipe ingredients saved:", recipeIngredients.length);

        const savedRecipe = await Recipe.findByPk(id, {
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              include: [{ model: Ingredient, as: "ingredient" }],
            },
          ],
        });

        return {
          ...savedRecipe.toJSON(),
          id: savedRecipe.id.toString(),
          totalCost: Number.isFinite(savedRecipe.totalCost)
            ? savedRecipe.totalCost
            : 0,
          suggestedPrice: Number.isFinite(savedRecipe.suggestedPrice)
            ? savedRecipe.suggestedPrice
            : 0,
          ingredients: savedRecipe.ingredients.map((ri) => ({
            ...ri.toJSON(),
            id: ri.id.toString(),
            quantity: Number.isFinite(ri.quantity) ? ri.quantity : 0,
            ingredient: {
              ...ri.ingredient.toJSON(),
              id: ri.ingredient.id.toString(),
              unitPrice: Number.isFinite(ri.ingredient.unitPrice)
                ? ri.ingredient.unitPrice
                : 0,
            },
          })),
        };
      } catch (error) {
        console.error("Error creating recipe:", error);
        throw new Error(`Failed to create recipe: ${error.message}`);
      }
    },
    recordSale: async (_, { recipeId, saleAmount, quantitySold }) => {
      console.log("Starting recordSale:", {
        recipeId,
        saleAmount,
        quantitySold,
      });
      try {
        // Input validation
        if (!recipeId) {
          throw new Error("Recipe ID is required");
        }
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          throw new Error("Sale amount must be a positive number");
        }
        if (!Number.isInteger(quantitySold) || quantitySold <= 0) {
          throw new Error("Quantity sold must be a positive integer");
        }

        const recipe = await Recipe.findByPk(recipeId, {
          include: [{ model: RecipeIngredient, as: "ingredients" }],
        });
        if (!recipe) throw new Error(`Recipe with ID ${recipeId} not found`);
        console.log("Recipe found:", recipe.id);

        // Deduct inventory with validation
        for (const ri of recipe.ingredients) {
          const ingredient = await Ingredient.findByPk(ri.ingredientId);
          if (!ingredient) {
            throw new Error(`Ingredient with ID ${ri.ingredientId} not found`);
          }
          const stockDeduction = ri.quantity * quantitySold;
          if (!Number.isFinite(stockDeduction)) {
            throw new Error(`Invalid stock deduction for ${ingredient.name}`);
          }
          const newStock = ingredient.stockQuantity - stockDeduction;
          if (!Number.isFinite(newStock) || newStock < 0) {
            throw new Error(
              `Insufficient or invalid stock for ${ingredient.name}`
            );
          }
          await ingredient.update({ stockQuantity: newStock });
          console.log(`Updated stock for ${ingredient.name}: ${newStock}`);
        }

        const sale = await Sale.create({
          saleAmount,
          recipeId,
          createdAt: new Date(),
        });
        console.log("Sale created:", sale.id);

        const savedSale = await Sale.findByPk(sale.id, {
          include: [{ model: Recipe, as: "recipe" }],
        });

        if (!savedSale.recipe) {
          throw new Error("Failed to associate sale with recipe");
        }

        return {
          ...savedSale.toJSON(),
          id: savedSale.id.toString(),
          saleAmount: Number.isFinite(savedSale.saleAmount)
            ? savedSale.saleAmount
            : 0,
          createdAt: savedSale.createdAt.toISOString(),
          recipe: {
            ...savedSale.recipe.toJSON(),
            id: savedSale.recipe.id.toString(),
            totalCost: Number.isFinite(savedSale.recipe.totalCost)
              ? savedSale.recipe.totalCost
              : 0,
            suggestedPrice: Number.isFinite(savedSale.recipe.suggestedPrice)
              ? savedSale.recipe.suggestedPrice
              : 0,
          },
        };
      } catch (error) {
        console.error("Error in recordSale:", error);
        throw new Error(`Failed to record sale: ${error.message}`);
      }
    },
  },
};

module.exports = resolvers;
