// migrate-dynamodb-ingredient-numbers.js

const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({ region: "ap-southeast-2" });

async function scanAllIngredients() {
  let items = [];
  let params = { TableName: "Ingredients" };
  do {
    const res = await ddb.scan(params).promise();
    items.push(...(res.Items || []));
    params.ExclusiveStartKey = res.LastEvaluatedKey;
  } while (params.ExclusiveStartKey);
  return items;
}

async function migrate() {
  const items = await scanAllIngredients();
  let changed = 0;

  for (const ing of items) {
    let updateNeeded = false;
    let exp = [];
    let vals = {};

    // List all fields to convert
    ["stockQuantity", "restockThreshold", "unitPrice"].forEach((field) => {
      if (
        typeof ing[field] === "string" &&
        !isNaN(Number(ing[field])) &&
        ing[field] !== ""
      ) {
        exp.push(`${field} = :${field}`);
        vals[`:${field}`] = Number(ing[field]);
        updateNeeded = true;
      }
    });

    if (updateNeeded) {
      await ddb
        .update({
          TableName: "Ingredients",
          Key: { id: ing.id },
          UpdateExpression: "SET " + exp.join(", "),
          ExpressionAttributeValues: vals,
        })
        .promise();
      changed++;
      console.log(
        `Updated ${ing.name} (${ing.id}): ${exp.join(", ")} ==>`,
        Object.values(vals)
      );
    }
  }

  if (changed === 0) {
    console.log("No items needed migration. All fields already NUMBER.");
  } else {
    console.log(`Migration done. ${changed} items updated.`);
  }
}

migrate().catch(console.error);
