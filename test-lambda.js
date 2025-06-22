// test-lambda.js
const { handler } = require("./lambda");

async function test() {
  const event = {
    operation: "getInvoices",
    payload: {},
  };
  const result = await handler(event);
  console.log(result);
}

test();
