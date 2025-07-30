const fs = require("fs");

function wrapFile(input, output) {
  const lines = fs.readFileSync(input, "utf-8").split("\n").filter(Boolean);
  const wrapped = lines.map((line) => ({ Item: JSON.parse(line) }));
  fs.writeFileSync(output, wrapped.map(JSON.stringify).join("\n"));
  console.log(`Wrote file: ${output} (${wrapped.length} items)`);
}

wrapFile("DDB_Ingredients.json", "DDB_Ingredients_import.json");
wrapFile("DDB_Recipes.json", "DDB_Recipes_import.json");
wrapFile("DDB_Sales.json", "DDB_Sales_import.json");
