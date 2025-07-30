const fs = require("fs");
const path = require("path");

const ING_FILE = "Ingredient.json";
const RECIPE_FILE = "Recipe.json";
const RECIPE_ING_FILE = "RecipeIngredient.json";
const SALE_FILE = "Sale.json";

const OUT_ING = "DDB_Ingredients.json";
const OUT_REC = "DDB_Recipes.json";
const OUT_SALE = "DDB_Sales.json";

function loadJsonLines(file) {
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map(JSON.parse);
}

const ingredients = loadJsonLines(ING_FILE);
const recipes = loadJsonLines(RECIPE_FILE);
const recipeIngredients = loadJsonLines(RECIPE_ING_FILE);
const sales = loadJsonLines(SALE_FILE);

const recipeIngMap = {};
for (const ri of recipeIngredients) {
  const recipeId =
    ri.recipeId || ri.recipeID || ri["recipeId"] || ri["recipeID"];
  const ingredientId =
    ri.ingredientId ||
    ri.ingredientID ||
    ri["ingredientId"] ||
    ri["ingredientID"];
  if (!recipeIngMap[recipeId]) recipeIngMap[recipeId] = [];
  recipeIngMap[recipeId].push({
    ingredientId,
    quantity: ri.quantity,
  });
}

const ddbRecipes = recipes.map((rec) => ({
  ...rec,
  ingredients: recipeIngMap[rec.id] || [],
}));

fs.writeFileSync(OUT_ING, ingredients.map(JSON.stringify).join("\n"));
fs.writeFileSync(OUT_REC, ddbRecipes.map(JSON.stringify).join("\n"));
fs.writeFileSync(OUT_SALE, sales.map(JSON.stringify).join("\n"));

console.log("✅ DynamoDB files ready:");
console.log("  -", OUT_ING, `(rows: ${ingredients.length})`);
console.log("  -", OUT_REC, `(rows: ${ddbRecipes.length})`);
console.log("  -", OUT_SALE, `(rows: ${sales.length})`);
