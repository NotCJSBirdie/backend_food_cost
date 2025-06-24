# Food Cost API Backend

This project is a serverless backend for the Food Cost application, built using AWS AppSync, AWS Lambda, and the Serverless Framework. It provides a GraphQL API for managing ingredients, recipes, sales, and dashboard statistics.

## Prerequisites

- Node.js v22.x or higher
- Serverless Framework v4.x
- AWS CLI configured with appropriate credentials
- Environment variables set for database access (`DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`)

## Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd backend_food_cost
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add the following:
   ```bash
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=foodcost
   DB_HOST=your_db_host
   ```

4. **Deploy the Application**
   Deploy to the desired stage (e.g., `dev` or `prod`):
   ```bash
   serverless deploy --stage dev
   ```

## AppSync and Lambda Configuration

The backend uses AWS AppSync as the GraphQL API layer, with a single Lambda function (`food-cost-api-prod-FoodCostLambda`) as the data source. The configuration is defined in `serverless.yml`. To ensure the backend fetches data correctly, verify the following:

### 1. **AppSync API Configuration**
- **Schema**: The GraphQL schema is located at `src/schema.graphql`. Ensure it matches the resolver mappings in `serverless.yml`.
- **Authentication**: The API uses `API_KEY` authentication. After deployment, retrieve the API key from the AWS AppSync console or the Serverless output.
- **Endpoint**: The AppSync endpoint URL is available in the Serverless deployment output (`ServiceEndpoint`).

### 2. **Lambda Data Source**
- **Function Name**: The Lambda function (`food-cost-api-prod-FoodCostLambda`) is defined in `serverless.yml` under `functions`. Ensure the `handler` points to `lambda.handler` and includes necessary files (`lambda.js`, `data-source.js`, `node_modules`, `src/schema.graphql`, `vtl/**`).
- **Data Source Mapping**: In `serverless.yml`, the `FoodCostLambdaDataSource` is configured under `appSync.dataSources`. Verify that `functionName` matches the Lambda function name exactly.
- **IAM Permissions**: The Lambda function has permissions for S3, CloudWatch Logs, and RDS. Ensure the IAM role in `serverless.yml` is correctly configured to allow these actions.

### 3. **Resolver Mappings**
- Resolvers for queries (`dashboardStats`, `ingredients`, `recipes`, `sales`) and mutations (`addIngredient`, `createRecipe`, `recordSale`, `deleteIngredient`, `deleteRecipe`, `deleteSale`) are defined in `serverless.yml` under `appSync.resolvers`.
- Each resolver uses the `FoodCostLambdaDataSource` and points to specific Velocity Template Language (VTL) files in the `vtl/` directory (e.g., `vtl/dashboardStats/request.vtl`).
- Ensure the VTL files exist and correctly map the GraphQL requests to Lambda function inputs.

## Testing Queries in AppSync

To verify that AppSync is correctly fetching data from the Lambda function:

1. **Access the AppSync Console**
   - After deployment, find the AppSync API in the AWS Console under AppSync > APIs.
   - Use the API key from the deployment output to authenticate.

2. **Run a Sample Query**
   Example query to fetch dashboard statistics:
   ```graphql
   query {
     dashboardStats {
       totalSales
       totalCost
       profit
     }
   }
   ```
   Ensure the response matches the expected data from your database.

3. **Troubleshooting Tips**
   - **No Data Returned**: Check CloudWatch Logs for the Lambda function to identify errors. Verify the database connection details in the environment variables.
   - **Resolver Errors**: Ensure the VTL files correctly transform the GraphQL input to the Lambda event format. Compare the resolver mappings in `serverless.yml` with the schema.
   - **Lambda Timeout**: The Lambda function has a 29-second timeout. If queries take longer, optimize the database queries or increase the timeout in `serverless.yml`.
   - **Incorrect Data Source**: Confirm that `FoodCostLambdaDataSource` points to the correct Lambda function ARN in the AppSync console.

## Project Structure

```
├── src/
│   └── schema.graphql       # GraphQL schema
├── vtl/                    # VTL templates for resolvers
│   ├── dashboardStats/
│   ├── ingredients/
│   ├── recipes/
│   ├── sales/
│   ├── addIngredient/
│   ├── createRecipe/
│   ├── recordSale/
│   ├── deleteIngredient/
│   ├── deleteRecipe/
│   └── deleteSale/
├── lambda.js               # Lambda handler
├── data-source.js          # Database connection logic
├── serverless.yml          # Serverless configuration
└── package.json            # Node.js dependencies
```

## Additional Notes

- **Stage-Specific Domains**: The API uses custom domains (`dev.foodcostapi.com` for `dev`, `foodcostapi.com` for `prod`) defined in `serverless.yml` under `params`.
- **Deployment Bucket**: Artifacts are stored in `food-cost-deployment-bucket-795796019955`. Ensure the bucket exists and has the correct permissions.
- **Plugins**: The `serverless-appsync-plugin` is used to manage AppSync resources. Ensure it is installed (`npm install serverless-appsync-plugin`).

For further details, refer to the [Serverless Framework documentation](https://www.serverless.com/framework/docs/) or the [AWS AppSync documentation](https://docs.aws.amazon.com/appsync/).