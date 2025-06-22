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
            ? ingredients
                .filter((ing) => {
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
                .map((ing) => {
                  try {
                    const json = ing.toJSON();
                    console.log(
                      `Mapping low stock ingredient ${json.id || "unknown"}`
                    );
                    return {
                      ...json,
                      id: json.id ? json.id.toString() : `ing-${Date.now()}`,
                      name: json.name || "",
                      unitPrice: Number.isFinite(json.unitPrice)
                        ? json.unitPrice
                        : 0,
                      unit: json.unit || "",
                      stockQuantity: Number.isFinite(json.stockQuantity)
                        ? json.stockQuantity
                        : 0,
                      restockThreshold: Number.isFinite(json.restockThreshold)
                        ? json.restockThreshold
                        : 0,
                    };
                  } catch (mapError) {
                    console.error("Error mapping low stock ingredient:", {
                      message: mapError.message,
                      stack: mapError.stack,
                    });
                    return {
                      id: `ing-${Date.now()}`,
                      name: "",
                      unitPrice: 0,
                      unit: "",
                      stockQuantity: 0,
                      restockThreshold: 0,
                    };
                  }
                })
            : [];

        console.log("Dashboard stats calculated:", {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredientsCount: lowStockIngredients.length,
        });

        return {
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients,
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
        if (!Array.isArray(ingredients) || !ingredients.length) {
          console.warn(
            "Ingredients result is not an array or empty, returning empty array"
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
                name: json.name || "",
                unitPrice: Number.isFinite(json.unitPrice) ? json.unitPrice : 0,
                unit: json.unit || "",
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
              return {
                id: `ing-${Date.now()}`,
                name: "",
                unitPrice: 0,
                unit: "",
                stockQuantity: 0,
                restockThreshold: 0,
              };
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
                { model: Ingredient, as: "ingredient", required: false },
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
        if (!Array.isArray(recipes) || !recipes.length) {
          console.warn(
            "Recipes result is not an array or empty, returning empty array"
          );
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
                name: json.name || "",
                totalCost: Number.isFinite(json.totalCost) ? json.totalCost : 0,
                suggestedPrice: Number.isFinite(json.suggestedPrice)
                  ? json.suggestedPrice
                  : 0,
                ingredients:
                  Array.isArray(json.ingredients) && json.ingredients.length
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
                          ingredient: ri.ingredient
                            ? {
                                ...ri.ingredient,
                                id: ri.ingredient.id
                                  ? ri.ingredient.id.toString()
                                  : `ing-${Date.now()}`,
                                name: ri.ingredient.name || "",
                                unitPrice: Number.isFinite(
                                  ri.ingredient.unitPrice
                                )
                                  ? ri.ingredient.unitPrice
                                  : 0,
                                unit: ri.ingredient.unit || "",
                                stockQuantity: Number.isFinite(
                                  ri.ingredient.stockQuantity
                                )
                                  ? ri.ingredient.stockQuantity
                                  : 0,
                                restockThreshold: Number.isFinite(
                                  ri.ingredient.restockThreshold
                                )
                                  ? ri.ingredient.restockThreshold
                                  : 0,
                              }
                            : {
                                id: `ing-${Date.now()}`,
                                name: "",
                                unitPrice: 0,
                                unit: "",
                                stockQuantity: 0,
                                restockThreshold: 0,
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
              return {
                id: `rec-${Date.now()}`,
                name: "",
                totalCost: 0,
                suggestedPrice: 0,
                ingredients: [],
              };
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
        console.log("Attempting to fetch sales...");
        const sales = await Sale.findAll({
          include: [{ model: Recipe, as: "recipe", required: false }],
        }).catch((err) => {
          console.error("Sale.findAll failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        console.log(`Fetched sales: ${sales ? sales.length : 0}`);
        if (!Array.isArray(sales) || !sales.length) {
          console.warn(
            "Sales result is not an array or empty, returning empty array"
          );
          return [];
        }
        return sales
          .map((s) => {
            try {
              if (!s?.recipe) {
                console.warn(
                  `Sale ${s?.id || "unknown"} has no recipe, skipping`
                );
                return null;
              }
              const json = s.toJSON();
              console.log(`Mapping sale ${json.id || "unknown"}`);
              return {
                ...json,
                id: json.id ? json.id.toString() : `sale-${Date.now()}`,
                saleAmount: Number.isFinite(json.saleAmount)
                  ? json.saleAmount
                  : 0,
                createdAt: json.createdAt
                  ? json.createdAt.toISOString()
                  : new Date().toISOString(),
                recipe: json.recipe
                  ? {
                      ...json.recipe,
                      id: json.recipe.id
                        ? json.recipe.id.toString()
                        : `rec-${Date.now()}`,
                      name: json.recipe.name || "",
                      totalCost: Number.isFinite(json.recipe.totalCost)
                        ? json.recipe.totalCost
                        : 0,
                      suggestedPrice: Number.isFinite(
                        json.recipe.suggestedPrice
                      )
                        ? json.recipe.suggestedPrice
                        : 0,
                      ingredients: Array.isArray(json.recipe.ingredients)
                        ? json.recipe.ingredients
                        : [],
                    }
                  : {
                      id: `rec-${Date.now()}`,
                      name: "",
                      totalCost: 0,
                      suggestedPrice: 0,
                      ingredients: [],
                    },
              };
            } catch (mapError) {
              console.error("Error mapping sale:", {
                message: mapError.message,
                stack: mapError.stack,
              });
              return null;
            }
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
        }).catch((err) => {
          console.error("Ingredient.create failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        if (!ingredient) {
          console.warn("Ingredient creation failed, returning default object");
          return {
            id: id,
            name: name || "",
            unitPrice: 0,
            unit: unit || "",
            stockQuantity: 0,
            restockThreshold: 0,
          };
        }
        const json = ingredient.toJSON();
        console.log(`Ingredient created: ${id}`);
        return {
          ...json,
          id: json.id.toString(),
          name: json.name || "",
          unitPrice: Number.isFinite(json.unitPrice) ? json.unitPrice : 0,
          unit: json.unit || "",
          stockQuantity: Number.isFinite(json.stockQuantity)
            ? json.stockQuantity
            : 0,
          restockThreshold: Number.isFinite(json.restockThreshold)
            ? json.restockThreshold
            : 0,
        };
      } catch (error) {
        console.error("Error in addIngredient:", {
          message: error.message,
          stack: error.stack,
        });
        return {
          id: `ing-${Date.now()}`,
          name: "",
          unitPrice: 0,
          unit: "",
          stockQuantity: 0,
          restockThreshold: 0,
        };
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
          !Array.isArray(ingredientIds) ||
          !Array.isArray(quantities) ||
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
          const ingredient = await Ingredient.findByPk(ingredientIds[i]).catch(
            (err) => {
              console.error("Ingredient.findByPk failed:", {
                message: err.message,
                stack: err.stack,
              });
              return null;
            }
          );
          if (!ingredient) {
            console.error(`Ingredient not found: ${ingredientIds[i]}`);
            throw new Error(`Ingredient with ID ${ingredientIds[i]} not found`);
          }
          if (!Number.isFinite(quantities[i]) || quantities[i] <= 0) {
            console.error(
              `Invalid quantity for ingredient: ${ingredient.name || "unknown"}`
            );
            throw new Error(
              `Invalid quantity for ingredient ${ingredient.name || "unknown"}`
            );
          }
          const cost = ingredient.unitPrice * quantities[i];
          console.log(
            `Calculated cost for ${ingredient.name || "unknown"}: ${cost}`
          );
          if (!Number.isFinite(cost)) {
            console.error(`Invalid cost for ${ingredient.name || "unknown"}`);
            throw new Error(
              `Invalid cost calculation for ${ingredient.name || "unknown"}`
            );
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
        }).catch((err) => {
          console.error("Recipe.create failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });

        if (!recipe) {
          console.warn("Recipe creation failed, returning default object");
          return {
            id: id,
            name: name || "",
            totalCost: 0,
            suggestedPrice: 0,
            ingredients: [],
          };
        }

        await RecipeIngredient.bulkCreate(recipeIngredients).catch((err) => {
          console.error("RecipeIngredient.bulkCreate failed:", {
            message: err.message,
            stack: err.stack,
          });
        });

        console.log(`Saved ${recipeIngredients.length} recipe ingredients`);

        const savedRecipe = await Recipe.findByPk(id, {
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
        }).catch((err) => {
          console.error("Recipe.findByPk failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });

        if (!savedRecipe) {
          console.warn("Recipe fetch failed, returning default object");
          return {
            id: id,
            name: name || "",
            totalCost: 0,
            suggestedPrice: 0,
            ingredients: [],
          };
        }

        const json = savedRecipe.toJSON();
        console.log(`Fetched saved recipe: ${id}`);
        return {
          ...json,
          id: json.id ? json.id.toString() : id,
          name: json.name || "",
          totalCost: Number.isFinite(json.totalCost) ? json.totalCost : 0,
          suggestedPrice: Number.isFinite(json.suggestedPrice)
            ? json.suggestedPrice
            : 0,
          ingredients:
            Array.isArray(json.ingredients) && json.ingredients.length
              ? json.ingredients.map((ri) => {
                  console.log(`Mapping saved ingredient ${ri.id || "unknown"}`);
                  return {
                    ...ri,
                    id: ri.id ? ri.id.toString() : `ri-${Date.now()}`,
                    quantity: Number.isFinite(ri.quantity) ? ri.quantity : 0,
                    ingredient: ri.ingredient
                      ? {
                          ...ri.ingredient,
                          id: ri.ingredient.id
                            ? ri.ingredient.id.toString()
                            : `ing-${Date.now()}`,
                          name: ri.ingredient.name || "",
                          unitPrice: Number.isFinite(ri.ingredient.unitPrice)
                            ? ri.ingredient.unitPrice
                            : 0,
                          unit: ri.ingredient.unit || "",
                          stockQuantity: Number.isFinite(
                            ri.ingredient.stockQuantity
                          )
                            ? ri.ingredient.stockQuantity
                            : 0,
                          restockThreshold: Number.isFinite(
                            ri.ingredient.restockThreshold
                          )
                            ? ri.ingredient.restockThreshold
                            : 0,
                        }
                      : {
                          id: `ing-${Date.now()}`,
                          name: "",
                          unitPrice: 0,
                          unit: "",
                          stockQuantity: 0,
                          restockThreshold: 0,
                        },
                  };
                })
              : [],
        };
      } catch (error) {
        console.error("Error in createRecipe:", {
          message: error.message,
          stack: error.stack,
        });
        return {
          id: `rec-${Date.now()}`,
          name: "",
          totalCost: 0,
          suggestedPrice: 0,
          ingredients: [],
        };
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
          include: [
            { model: RecipeIngredient, as: "ingredients", required: false },
          ],
        }).catch((err) => {
          console.error("Recipe.findByPk failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });
        if (!recipe) {
          console.error(`Recipe not found: ${recipeId}`);
          throw new Error(`Recipe with ID ${recipeId} not found`);
        }
        console.log(`Recipe found: ${recipe.id}`);

        const ingredients = Array.isArray(recipe.ingredients)
          ? recipe.ingredients
          : [];
        for (const ri of ingredients) {
          console.log(`Processing ingredient: ${ri.ingredientId}`);
          const ingredient = await Ingredient.findByPk(ri.ingredientId).catch(
            (err) => {
              console.error("Ingredient.findByPk failed:", {
                message: err.message,
                stack: err.stack,
              });
              return null;
            }
          );
          if (!ingredient) {
            console.error(`Ingredient not found: ${ri.ingredientId}`);
            throw new Error(`Ingredient with ID ${ri.ingredientId} not found`);
          }
          const stockDeduction = ri.quantity * quantitySold;
          console.log(
            `Stock deduction for ${
              ingredient.name || "unknown"
            }: ${stockDeduction}`
          );
          if (!Number.isFinite(stockDeduction)) {
            console.error(
              `Invalid stock deduction for ${ingredient.name || "unknown"}`
            );
            throw new Error(
              `Invalid stock deduction for ${ingredient.name || "unknown"}`
            );
          }
          const newStock = ingredient.stockQuantity - stockDeduction;
          console.log(
            `New stock for ${ingredient.name || "unknown"}: ${newStock}`
          );
          if (!Number.isFinite(newStock) || newStock < 0) {
            console.error(
              `Insufficient stock for ${ingredient.name || "unknown"}`
            );
            throw new Error(
              `Insufficient or invalid stock for ${
                ingredient.name || "unknown"
              }`
            );
          }
          await ingredient.update({ stockQuantity: newStock }).catch((err) => {
            console.error("Ingredient.update failed:", {
              message: err.message,
              stack: err.stack,
            });
          });
          console.log(
            `Updated stock for ${ingredient.name || "unknown"}: ${newStock}`
          );
        }

        console.log("Creating sale...");
        const sale = await Sale.create({
          saleAmount,
          recipeId,
          createdAt: new Date(),
        }).catch((err) => {
          console.error("Sale.create failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });

        if (!sale) {
          console.warn("Sale creation failed, returning default object");
          return {
            id: `sale-${Date.now()}`,
            saleAmount: 0,
            createdAt: new Date().toISOString(),
            recipe: {
              id: recipeId,
              name: "",
              totalCost: 0,
              suggestedPrice: 0,
              ingredients: [],
            },
          };
        }

        console.log(`Sale created: ${sale.id}`);

        const savedSale = await Sale.findByPk(sale.id, {
          include: [{ model: Recipe, as: "recipe", required: false }],
        }).catch((err) => {
          console.error("Sale.findByPk failed:", {
            message: err.message,
            stack: err.stack,
          });
          return null;
        });

        if (!savedSale) {
          console.warn("Sale fetch failed, returning default object");
          return {
            id: sale.id.toString(),
            saleAmount: 0,
            createdAt: new Date().toISOString(),
            recipe: {
              id: recipeId,
              name: "",
              totalCost: 0,
              suggestedPrice: 0,
              ingredients: [],
            },
          };
        }

        const json = savedSale.toJSON();
        console.log(`Returning sale: ${json.id}`);
        return {
          ...json,
          id: json.id ? json.id.toString() : `sale-${Date.now()}`,
          saleAmount: Number.isFinite(json.saleAmount) ? json.saleAmount : 0,
          createdAt: json.createdAt
            ? json.createdAt.toISOString()
            : new Date().toISOString(),
          recipe: json.recipe
            ? {
                ...json.recipe,
                id: json.recipe.id ? json.recipe.id.toString() : recipeId,
                name: json.recipe.name || "",
                totalCost: Number.isFinite(json.recipe.totalCost)
                  ? json.recipe.totalCost
                  : 0,
                suggestedPrice: Number.isFinite(json.recipe.suggestedPrice)
                  ? json.recipe.suggestedPrice
                  : 0,
                ingredients: Array.isArray(json.recipe.ingredients)
                  ? json.recipe.ingredients
                  : [],
              }
            : {
                id: recipeId,
                name: "",
                totalCost: 0,
                suggestedPrice: 0,
                ingredients: [],
              },
        };
      } catch (error) {
        console.error("Error in recordSale:", {
          message: error.message,
          stack: error.stack,
        });
        return {
          id: `sale-${Date.now()}`,
          saleAmount: 0,
          createdAt: new Date().toISOString(),
          recipe: {
            id: recipeId || `rec-${Date.now()}`,
            name: "",
            totalCost: 0,
            suggestedPrice: 0,
            ingredients: [],
          },
        };
      }
    },
  },
};

module.exports = resolvers;
