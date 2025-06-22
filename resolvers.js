const { Ingredient, Recipe, RecipeIngredient, Sale } = require("./data-source");

const resolvers = {
  Query: {
    dashboardStats: async (_, __, { sequelize }) => {
      console.log("Entering dashboardStats resolver...");
      try {
        console.log("Fetching sales...");
        const sales = await Sale.findAll().catch((err) => {
          console.error("Sale.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(`Fetched sales: ${sales ? sales.length : 0}`);

        console.log("Fetching recipes...");
        const recipes = await Recipe.findAll().catch((err) => {
          console.error("Recipe.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(`Fetched recipes: ${recipes ? recipes.length : 0}`);

        console.log("Fetching ingredients...");
        const ingredients = await Ingredient.findAll().catch((err) => {
          console.error("Ingredient.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(
          `Fetched ingredients: ${ingredients ? ingredients.length : 0}`
        );

        const totalSales =
          Array.isArray(sales) && sales.length
            ? sales.reduce((sum, sale) => {
                const amount = Number(sale?.saleAmount || 0);
                console.log(
                  `Processing sale ${sale?.id || "unknown"}: amount=${amount}`
                );
                return sum + (Number.isFinite(amount) ? amount : 0);
              }, 0)
            : 0;

        const totalCosts =
          Array.isArray(recipes) && recipes.length
            ? recipes.reduce((sum, recipe) => {
                const cost = Number(recipe?.totalCost || 0);
                console.log(
                  `Processing recipe ${recipe?.id || "unknown"}: cost=${cost}`
                );
                return sum + (Number.isFinite(cost) ? cost : 0);
              }, 0)
            : 0;

        const totalMargin =
          Number.isFinite(totalSales) && Number.isFinite(totalCosts)
            ? totalSales - totalCosts
            : 0;

        const lowStockIngredients =
          Array.isArray(ingredients) && ingredients.length
            ? ingredients.filter((ing) => {
                const isLowStock =
                  Number.isFinite(ing?.stockQuantity) &&
                  Number.isFinite(ing?.restockThreshold) &&
                  Number(ing?.stockQuantity || 0) <=
                    Number(ing?.restockThreshold || 0);
                console.log(
                  `Checking ingredient ${
                    ing?.id || "unknown"
                  }: isLowStock=${isLowStock}`
                );
                return isLowStock;
              })
            : [];

        console.log("Dashboard stats calculated:", {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredientsCount: lowStockIngredients.length,
        });

        if (
          !Number.isFinite(totalSales) ||
          !Number.isFinite(totalCosts) ||
          !Number.isFinite(totalMargin) ||
          !Array.isArray(lowStockIngredients)
        ) {
          console.error("Invalid values detected:", {
            totalSales,
            totalCosts,
            totalMargin,
            lowStockIngredients,
          });
          return {
            totalSales: 0,
            totalCosts: 0,
            totalMargin: 0,
            lowStockIngredients: [],
          };
        }

        return {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients: lowStockIngredients.map((ing) => {
            const json = ing.toJSON();
            console.log(`Mapping ingredient ${json.id}`);
            return {
              ...json,
              id: json.id.toString(),
              unitPrice: Number.isFinite(json.unitPrice) ? json.unitPrice : 0,
              stockQuantity: Number.isFinite(json.stockQuantity)
                ? json.stockQuantity
                : 0,
              restockThreshold: Number.isFinite(json.restockThreshold)
                ? json.restockThreshold
                : 0,
            };
          }),
        };
      } catch (error) {
        console.error("Error in dashboardStats:", {
          message: error.message,
          stack: error.stack,
        });
        return {
          totalSales: 0,
          totalCosts: 0,
          totalMargin: 0,
          lowStockIngredients: [],
        };
      }
    },
    ingredients: async (_, __, { sequelize }) => {
      console.log("Entering ingredients resolver...");
      try {
        console.log("Attempting to fetch ingredients...");
        const ingredients = await Ingredient.findAll().catch((err) => {
          console.error("Ingredient.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(
          `Fetched ingredients: ${ingredients ? ingredients.length : 0}`
        );
        if (!Array.isArray(ingredients)) {
          console.warn(
            "Ingredients result is not an array, returning empty array"
          );
          return [];
        }
        return ingredients
          .map((i) => {
            try {
              const json = i.toJSON();
              console.log(`Mapping ingredient ${json.id || "unknown"}`);
              return {
                ...json,
                id: json.id ? json.id.toString() : `ing-${Date.now()}`,
                unitPrice: Number.isFinite(json.unitPrice) ? json.unitPrice : 0,
                stockQuantity: Number.isFinite(json.stockQuantity)
                  ? json.stockQuantity
                  : 0,
                restockThreshold: Number.isFinite(json.restockThreshold)
                  ? json.restockThreshold
                  : 0,
              };
            } catch (mapError) {
              console.error("Error mapping ingredient:", {
                message: mapError.message,
                stack: mapError.stack,
              });
              return null;
            }
          })
          .filter((item) => item !== null);
      } catch (error) {
        console.error("Error in ingredients resolver:", {
          message: error.message,
          stack: error.stack,
        });
        return [];
      }
    },
    recipes: async (_, __, { sequelize }) => {
      console.log("Entering recipes resolver...");
      try {
        console.log("Attempting to fetch recipes...");
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
        }).catch((err) => {
          console.error("Recipe.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(`Fetched recipes: ${recipes ? recipes.length : 0}`);
        if (!Array.isArray(recipes)) {
          console.warn("Recipes result is not an array, returning empty array");
          return [];
        }
        return recipes
          .map((r) => {
            try {
              const json = r.toJSON();
              console.log(`Mapping recipe ${json.id || "unknown"}`);
              return {
                ...json,
                id: json.id ? json.id.toString() : `rec-${Date.now()}`,
                totalCost: Number.isFinite(json.totalCost) ? json.totalCost : 0,
                suggestedPrice: Number.isFinite(json.suggestedPrice)
                  ? json.suggestedPrice
                  : 0,
                ingredients: json.ingredients?.length
                  ? json.ingredients.map((ri) => {
                      console.log(
                        `Mapping recipe ingredient ${ri.id || "unknown"}`
                      );
                      return {
                        ...ri,
                        id: ri.id ? ri.id.toString() : `ri-${Date.now()}`,
                        quantity: Number.isFinite(ri.quantity)
                          ? ri.quantity
                          : 0,
                        ingredient: {
                          ...ri.ingredient,
                          id: ri.ingredient.id
                            ? ri.ingredient.id.toString()
                            : `ing-${Date.now()}`,
                          unitPrice: Number.isFinite(ri.ingredient.unitPrice)
                            ? ri.ingredient.unitPrice
                            : 0,
                        },
                      };
                    })
                  : [],
              };
            } catch (mapError) {
              console.error("Error mapping recipe:", {
                message: mapError.message,
                stack: mapError.stack,
              });
              return null;
            }
          })
          .filter((item) => item !== null);
      } catch (error) {
        console.error("Error in recipes resolver:", {
          message: error.message,
          stack: error.stack,
        });
        return [];
      }
    },
    sales: async (_, __, { sequelize }) => {
      console.log("Entering sales resolver...");
      try {
        const sales = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe" }],
        }).catch((err) => {
          console.error("Sale.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(`Fetched sales: ${sales ? sales.length : 0}`);
        if (!Array.isArray(sales)) {
          console.warn("Sales result is not an array, returning empty array");
          return [];
        }
        return sales
          .map((s) => {
            if (!s?.recipe) {
              console.warn(
                `Sale ${s?.id || "unknown"} has no recipe, skipping`
              );
              return null;
            }
            const json = s.toJSON();
            console.log(`Mapping sale ${json.id}`);
            return {
              ...json,
              id: json.id.toString(),
              saleAmount: Number.isFinite(json.saleAmount)
                ? json.saleAmount
                : 0,
              createdAt: json.createdAt
                ? json.createdAt.toISOString()
                : new Date().toISOString(),
              recipe: {
                ...json.recipe,
                id: json.recipe.id.toString(),
                totalCost: Number.isFinite(json.recipe.totalCost)
                  ? json.recipe.totalCost
                  : 0,
                suggestedPrice: Number.isFinite(json.recipe.suggestedPrice)
                  ? json.recipe.suggestedPrice
                  : 0,
              },
            };
          })
          .filter((s) => s !== null);
      } catch (error) {
        console.error("Error in sales resolver:", {
          message: error.message,
          stack: error.stack,
        });
        return [];
      }
    },
  },
  Mutation: {
    addIngredient: async (
      _,
      { name, unitPrice, unit, stockQuantity, restockThreshold },
      { sequelize }
    ) => {
      console.log("Entering addIngredient resolver:", {
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
          console.error("Invalid ingredient input values");
          throw new Error("Invalid ingredient input values");
        }
        const id = `ing-${Date.now()}`;
        console.log(`Creating ingredient with ID: ${id}`);
        const ingredient = await Ingredient.create({
          id,
          name,
          unitPrice,
          unit,
          stockQuantity,
          restockThreshold,
        });
        console.log(`Ingredient created: ${id}`);
        return {
          ...ingredient.toJSON(),
          id: ingredient.id.toString(),
        };
      } catch (error) {
        console.error("Error in addIngredient:", {
          message: error.message,
          stack: error.stack,
        });
        throw new Error(`Failed to add ingredient: ${error.message}`);
      }
    },
    createRecipe: async (
      _,
      { name, ingredientIds, quantities, targetMargin },
      { sequelize }
    ) => {
      console.log("Entering createRecipe resolver:", {
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
          console.error("Invalid recipe input values");
          throw new Error("Invalid recipe input values");
        }

        if (Number.isFinite(targetMargin) && targetMargin >= 1) {
          console.error("Invalid target margin");
          throw new Error(
            "Target margin cannot be 100% or greater (would cause invalid price calculation)"
          );
        }

        const id = `rec-${Date.now()}`;
        let totalCost = 0;
        const recipeIngredients = [];

        for (let i = 0; i < ingredientIds.length; i++) {
          console.log(`Processing ingredient ID: ${ingredientIds[i]}`);
          const ingredient = await Ingredient.findByPk(ingredientIds[i]);
          if (!ingredient) {
            console.error(`Ingredient not found: ${ingredientIds[i]}`);
            throw new Error(`Ingredient with ID ${ingredientIds[i]} not found`);
          }
          if (!Number.isFinite(quantities[i]) || quantities[i] <= 0) {
            console.error(
              `Invalid quantity for ingredient: ${ingredient.name}`
            );
            throw new Error(
              `Invalid quantity for ingredient ${ingredient.name}`
            );
          }
          const cost = ingredient.unitPrice * quantities[i];
          console.log(`Calculated cost for ${ingredient.name}: ${cost}`);
          if (!Number.isFinite(cost)) {
            console.error(`Invalid cost for ${ingredient.name}`);
            throw new Error(`Invalid cost calculation for ${ingredient.name}`);
          }
          totalCost += cost;
          recipeIngredients.push({
            recipeId: id,
            ingredientId: ingredientIds[i],
            quantity: quantities[i],
          });
        }

        console.log(`Total cost calculated: ${totalCost}`);

        const suggestedPrice = Number.isFinite(targetMargin)
          ? totalCost / (1 - targetMargin)
          : totalCost * 1.3;

        console.log(`Suggested price calculated: ${suggestedPrice}`);

        if (!Number.isFinite(suggestedPrice)) {
          console.error("Invalid suggested price");
          throw new Error("Invalid suggested price calculation");
        }

        const recipe = await Recipe.create({
          id,
          name,
          totalCost,
          suggestedPrice,
        });
        console.log(`Recipe created: ${id}`);

        await RecipeIngredient.bulkCreate(recipeIngredients);
        console.log(`Saved ${recipeIngredients.length} recipe ingredients`);

        const savedRecipe = await Recipe.findByPk(id, {
          include: [
            {
              model: RecipeIngredient,
              as: "ingredients",
              include: [{ model: Ingredient, as: "ingredient" }],
            },
          ],
        });

        console.log(`Fetched saved recipe: ${id}`);
        return {
          ...savedRecipe.toJSON(),
          id: savedRecipe.id.toString(),
          totalCost: Number.isFinite(savedRecipe.totalCost)
            ? savedRecipe.totalCost
            : 0,
          suggestedPrice: Number.isFinite(savedRecipe.suggestedPrice)
            ? savedRecipe.suggestedPrice
            : 0,
          ingredients: savedRecipe.ingredients.map((ri) => {
            console.log(`Processing saved ingredient ${ri.id}`);
            return {
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
            };
          }),
        };
      } catch (error) {
        console.error("Error in createRecipe:", {
          message: error.message,
          stack: error.stack,
        });
        throw new Error(`Failed to create recipe: ${error.message}`);
      }
    },
    recordSale: async (
      _,
      { recipeId, saleAmount, quantitySold },
      { sequelize }
    ) => {
      console.log("Entering recordSale resolver:", {
        recipeId,
        saleAmount,
        quantitySold,
      });
      try {
        if (!recipeId) {
          console.error("Missing recipeId");
          throw new Error("Recipe ID is required");
        }
        if (!Number.isFinite(saleAmount) || saleAmount <= 0) {
          console.error("Invalid saleAmount");
          throw new Error("Sale amount must be a positive number");
        }
        if (!Number.isInteger(quantitySold) || quantitySold <= 0) {
          console.error("Invalid quantitySold");
          throw new Error("Quantity sold must be a positive integer");
        }

        console.log(`Fetching recipe: ${recipeId}`);
        const recipe = await Recipe.findByPk(recipeId, {
          include: [{ model: RecipeIngredient, as: "ingredients" }],
        });
        if (!recipe) {
          console.error(`Recipe not found: ${recipeId}`);
          throw new Error(`Recipe with ID ${recipeId} not found`);
        }
        console.log(`Recipe found: ${recipe.id}`);

        for (const ri of recipe.ingredients) {
          console.log(`Processing ingredient: ${ri.ingredientId}`);
          const ingredient = await Ingredient.findByPk(ri.ingredientId);
          if (!ingredient) {
            console.error(`Ingredient not found: ${ri.ingredientId}`);
            throw new Error(`Ingredient with ID ${ri.ingredientId} not found`);
          }
          const stockDeduction = ri.quantity * quantitySold;
          console.log(
            `Stock deduction for ${ingredient.name}: ${stockDeduction}`
          );
          if (!Number.isFinite(stockDeduction)) {
            console.error(`Invalid stock deduction for ${ingredient.name}`);
            throw new Error(`Invalid stock deduction for ${ingredient.name}`);
          }
          const newStock = ingredient.stockQuantity - stockDeduction;
          console.log(`New stock for ${ingredient.name}: ${newStock}`);
          if (!Number.isFinite(newStock) || newStock < 0) {
            console.error(`Insufficient stock for ${ingredient.name}`);
            throw new Error(
              `Insufficient or invalid stock for ${ingredient.name}`
            );
          }
          await ingredient.update({ stockQuantity: newStock });
          console.log(`Updated stock for ${ingredient.name}: ${newStock}`);
        }

        console.log("Creating sale...");
        const sale = await Sale.create({
          saleAmount,
          recipeId,
          createdAt: new Date(),
        });
        console.log(`Sale created: ${sale.id}`);

        const savedSale = await Sale.findByPk(sale.id, {
          include: [{ model: Recipe, as: "recipe" }],
        });

        if (!savedSale.recipe) {
          console.error("Sale recipe association missing");
          throw new Error("Failed to associate sale with recipe");
        }

        console.log(`Returning sale: ${savedSale.id}`);
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
        console.error("Error in recordSale:", {
          message: error.message,
          stack: error.stack,
        });
        throw new Error(`Failed to record sale: ${error.message}`);
      }
    },
  },
};

module.exports = resolvers;
