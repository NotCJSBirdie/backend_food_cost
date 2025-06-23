const lambdaHandler = require("./lambda").handler;

export function request(ctx) {
  // Transform AppSync context to Lambda event
  return {
    info: {
      parentTypeName: ctx.info.parentTypeName,
      fieldName: ctx.info.fieldName,
      selectionSetList: ctx.info.selectionSetList,
      selectionSetGraphQL: ctx.info.selectionSetGraphQL,
      variables: ctx.info.variables,
    },
    arguments: ctx.args,
    identity: ctx.identity,
    source: ctx.source,
    request: ctx.request,
    stash: ctx.stash,
  };
}

export function response(ctx) {
  // Return the Lambda handler result
  if (ctx.error) {
    throw new Error(ctx.error.message || "Resolver error");
  }
  return ctx.result;
}
