# choose-your-path

## Local Development

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Configure web API base URL:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```
   `VITE_API_BASE_URL` should be `http://localhost:3001` for local API development.
3. Run API (Terminal A):
   ```bash
   pnpm dev:api
   ```
4. Run web app (Terminal B):
   ```bash
   pnpm dev:web
   ```

The local API exposes:
- `GET http://localhost:3001/current`
- `POST http://localhost:3001/vote`
- `POST http://localhost:3001/close`

`pnpm dev:api` uses an in-memory repository so no AWS credentials, DynamoDB, Terraform, Docker, or LocalStack are required.
