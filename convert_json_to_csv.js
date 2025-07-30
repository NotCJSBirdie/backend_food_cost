// convert_any_json_to_csv.js
const fs = require("fs");
const path = require("path");

// Flattens nested objects for all fields except arrays & nested objects (which become JSON strings)
function flattenForCsv(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
      // Store objects/arrays as stringified JSON, escaping for CSV
      out[k] = `"${JSON.stringify(v).replace(/"/g, '""')}"`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function convertFile(input, output) {
  const lines = fs.readFileSync(input, "utf-8").split("\n").filter(Boolean);
  const objs = lines.map((line) => {
    let o = JSON.parse(line);
    return o.Item || o;
  });

  // Collect all unique headers/keys from all objects
  const headersSet = new Set();
  objs.forEach((obj) => Object.keys(obj).forEach((k) => headersSet.add(k)));
  const headers = Array.from(headersSet);

  const csvRows = [];
  csvRows.push(headers.join(","));

  for (const obj of objs) {
    const flat = flattenForCsv(obj);
    const row = headers.map((h) => (flat[h] === undefined ? "" : flat[h]));
    csvRows.push(row.join(","));
  }

  fs.writeFileSync(output, csvRows.join("\n"));
  console.log(`✅ ${output} written (${objs.length} rows)`);
}

// ---- List your files below ----
convertFile("DDB_Ingredients_import.json", "Ingredients_for_DDB.csv");
convertFile("DDB_Recipes_import.json", "Recipes_for_DDB.csv");
convertFile("DDB_Sales_import.json", "Sales_for_DDB.csv");
