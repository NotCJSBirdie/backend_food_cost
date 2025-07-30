const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: "ap-southeast-2" });
const { v4: uuidv4 } = require("uuid");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};

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

const parsePathId = (path, prefix) => {
  const parts = path.split("/");
  return parts.length === 3 && `/${parts[1]}` === prefix ? parts[2] : null;
};

// Unified error helper with CORS
function _err(status, msg) {
  return {
    statusCode: status,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: false, error: msg }),
  };
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod;
    const path = event.path;
    let body = event.body ? JSON.parse(event.body) : {};

    // --- INGREDIENTS ---
    // GET /ingredients
    if (method === "GET" && path === "/ingredients") {
      const items = await scanAll("Ingredients");
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(items),
      };
    }

    // POST /ingredients
    if (method === "POST" && path === "/ingredients") {
      const { name, unitPrice, unit, stockQuantity, restockThreshold } = body;
      if (!name || name.trim() === "")
        return _err(400, "Ingredient name is required");
      if (unitPrice == null || unitPrice < 0)
        return _err(400, "Unit price must be non-negative");
      if (!unit || unit.trim() === "") return _err(400, "Unit is required");
      if (stockQuantity == null || stockQuantity < 0)
        return _err(400, "Stock quantity must be non-negative");
      if (restockThreshold == null || restockThreshold < 0)
        return _err(400, "Restock threshold must be non-negative");
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
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, ingredient }),
      };
    }

    // DELETE /ingredients/{id}
    if (method === "DELETE" && path.startsWith("/ingredients/")) {
      const id = parsePathId(path, "/ingredients");
      if (!id) return _err(400, "Missing ingredient ID");
      const getRes = await ddb
        .get({ TableName: "Ingredients", Key: { id } })
        .promise();
      if (!getRes.Item) return _err(404, `Ingredient ${id} not found`);
      await ddb.delete({ TableName: "Ingredients", Key: { id } }).promise();
      // Remove from all recipes
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
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true }),
      };
    }

    // --- RECIPES ---
    // GET /recipes
    if (method === "GET" && path === "/recipes") {
      const recipes = await scanAll("Recipes");
      const ingredients = await scanAll("Ingredients");
      const ingredientsMap = Object.fromEntries(
        ingredients.map((i) => [i.id, i])
      );
      const result = recipes.map((recipe) => {
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
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(result),
      };
    }

    // POST /recipes
    if (method === "POST" && path === "/recipes") {
      const { name, ingredientIds, quantities, targetMargin } = body;
      if (!name || name.trim() === "")
        return _err(400, "Recipe name is required");
      if (
        !ingredientIds ||
        !quantities ||
        ingredientIds.length !== quantities.length ||
        ingredientIds.length === 0
      )
        return _err(
          400,
          "Invalid recipe input: ingredient IDs and quantities must match and be non-empty"
        );
      if (quantities.some((q) => q == null || q <= 0))
        return _err(400, "All quantities must be positive numbers");
      if (targetMargin != null && (targetMargin < 0 || targetMargin >= 1))
        return _err(400, "Target margin must be between 0 and 1");
      const ingredientsList = await batchGet("Ingredients", ingredientIds);
      if (ingredientsList.length !== ingredientIds.length)
        return _err(404, "Some ingredients not found");
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
      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          recipe: { ...recipe, ingredients: recipeIngredientsArr },
        }),
      };
    }

    // DELETE /recipes/{id}
    if (method === "DELETE" && path.startsWith("/recipes/")) {
      const id = parsePathId(path, "/recipes");
      if (!id) return _err(400, "Missing recipe ID");
      // Delete related sales
      const sales = await scanAll("Sales");
      for (const sale of sales.filter((s) => s.recipeId === id)) {
        await ddb
          .delete({ TableName: "Sales", Key: { id: sale.id } })
          .promise();
      }
      await ddb.delete({ TableName: "Recipes", Key: { id } }).promise();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true }),
      };
    }

    // --- SALES ---
    // GET /sales
    if (method === "GET" && path === "/sales") {
      const sales = await scanAll("Sales");
      const recipes = await scanAll("Recipes");
      const ingredients = await scanAll("Ingredients");
      const recipesMap = Object.fromEntries(recipes.map((r) => [r.id, r]));
      const ingredientsMap = Object.fromEntries(
        ingredients.map((i) => [i.id, i])
      );
      const result = sales.map((sale) => {
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
        return {
          id: sale.id,
          saleAmount: sale.saleAmount,
          createdAt: sale.createdAt,
          recipe: null,
        };
      });
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(result),
      };
    }

    // POST /sales
    if (method === "POST" && path === "/sales") {
      const { recipeId, saleAmount, quantitySold } = body;
      if (!recipeId || typeof recipeId !== "string")
        return _err(400, "Invalid recipe ID");
      if (saleAmount == null || saleAmount <= 0 || isNaN(Number(saleAmount)))
        return _err(400, "Sale amount must be a positive number");
      if (
        quantitySold == null ||
        !Number.isInteger(Number(quantitySold)) ||
        quantitySold <= 0
      )
        return _err(400, "Quantity sold must be a positive integer");

      // Fetch recipe and parse ingredient requirements
      const recipeRes = await ddb
        .get({ TableName: "Recipes", Key: { id: recipeId } })
        .promise();
      const recipe = recipeRes.Item;
      if (!recipe) return _err(404, `Recipe ${recipeId} not found`);

      let ingrArr = recipe.ingredients;
      if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
      if ((ingrArr || []).length === 0)
        return _err(409, `Recipe ${recipeId} has no ingredients`);
      const ingredientIds = ingrArr.map((ri) => ri.ingredientId);
      const stockIngredients = await batchGet("Ingredients", ingredientIds);
      // Prepare TransactWrite for stock update and sale record (atomic)
      const transactItems = [];
      for (const ri of ingrArr) {
        const ing = stockIngredients.find(
          (item) => item.id === ri.ingredientId
        );
        if (!ing) return _err(404, `Ingredient ${ri.ingredientId} not found`);
        const stockDeduction = Number(ri.quantity) * Number(quantitySold);
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
      const sale = {
        id: uuidv4(),
        saleAmount: Number(saleAmount),
        quantitySold: Number(quantitySold),
        recipeId,
        createdAt: new Date().toISOString(),
      };
      transactItems.push({ Put: { TableName: "Sales", Item: sale } });
      await ddb.transactWrite({ TransactItems: transactItems }).promise();

      return {
        statusCode: 201,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, sale }),
      };
    }

    // DELETE /sales/{id}
    if (method === "DELETE" && path.startsWith("/sales/")) {
      const id = parsePathId(path, "/sales");
      if (!id) return _err(400, "Missing sale ID");
      await ddb.delete({ TableName: "Sales", Key: { id } }).promise();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true }),
      };
    }

    // --- DASHBOARD ---
    // GET /dashboard
    if (method === "GET" && path === "/dashboard") {
      const [sales, recipes, ingredients] = await Promise.all([
        scanAll("Sales"),
        scanAll("Recipes"),
        scanAll("Ingredients"),
      ]);
      const ingredientsMap = Object.fromEntries(
        ingredients.map((i) => [i.id, i])
      );
      let totalSales = 0,
        totalCosts = 0;
      let recipesMap = Object.fromEntries(recipes.map((r) => [r.id, r]));
      for (const sale of sales) {
        totalSales += Number(sale.saleAmount || 0);
        const recipe = recipesMap[sale.recipeId];
        if (recipe && recipe.ingredients) {
          let ingrArr = recipe.ingredients;
          if (typeof ingrArr === "string") ingrArr = JSON.parse(ingrArr);
          const cost = ingrArr.reduce((sum, ri) => {
            const ing = ingredientsMap[ri.ingredientId];
            return (
              sum + (ri.quantity || 0) * (ing ? Number(ing.unitPrice || 0) : 0)
            );
          }, 0);
          totalCosts += cost;
        }
      }
      const totalMargin = totalSales - totalCosts;
      const lowStockIngredients = ingredients.filter(
        (ing) =>
          (Number(ing.stockQuantity) || 0) <= Number(ing.restockThreshold)
      );
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          totalSales,
          totalCosts,
          totalMargin,
          lowStockIngredients,
        }),
      };
    }

    // --- Not found
    return {
      statusCode: 404,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Route not found" }),
    };
  } catch (error) {
    console.error("Lambda error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
