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

`pnpm dev:api` uses an in-memory repository so no AWS credentials, DynamoDB, Terraform, Docker, or LocalStack are required.

### Optional API Story Configuration

You can override basic initial story state with environment variables:

- `STORY_INITIAL_SCENE_TEXT`
- `STORY_INITIAL_OPTION_A`
- `STORY_INITIAL_OPTION_B`
- `PORT` (local API server port, defaults to `3001`)
- `ROUND_DURATION_MS` (must be a positive integer, defaults to `20000`)
- `INTERMISSION_DURATION_MS` (must be a positive integer, defaults to `5000`)
- `LOCAL_TICK_INTERVAL_MS` (must be a positive integer, defaults to `5000`)

Example:

```bash
STORY_INITIAL_SCENE_TEXT="A storm rolls in over the harbor." \
STORY_INITIAL_OPTION_A="Run for shelter." \
STORY_INITIAL_OPTION_B="Secure the boats." \
ROUND_DURATION_MS=30000 \
INTERMISSION_DURATION_MS=5000 \
LOCAL_TICK_INTERVAL_MS=5000 \
pnpm dev:api
```

## Round Tick Loop (AWS)

AWS uses a Step Functions loop to invoke `closeRound` on a sub-minute interval.

- Terraform variable: `round_tick_interval_seconds` (default `5`)
- Round timings remain controlled by API env vars (`ROUND_DURATION_MS`, `INTERMISSION_DURATION_MS`)

After Terraform apply, start the loop once:

```bash
aws stepfunctions start-execution \
   --state-machine-arn <ROUND_TICK_STATE_MACHINE_ARN>
```

If you need to stop it:

```bash
aws stepfunctions list-executions \
   --state-machine-arn <ROUND_TICK_STATE_MACHINE_ARN> \
   --status-filter RUNNING

aws stepfunctions stop-execution \
   --execution-arn <RUNNING_EXECUTION_ARN>
```

## Operational Notes

- Alarm notifications are wired to SNS automatically:
  - If `alarm_topic_arn` is provided, alarms use that topic.
  - If `alarm_topic_arn` is empty, Terraform creates `choose-your-path-alarms-<environment>` and wires alarms to it.
  - Optionally set `alarm_email_endpoint` to auto-subscribe an email address to the auto-created topic.
- Lambda runtime is configurable with `lambda_runtime`.
- API CORS settings are configurable with `api_cors_allow_origins`, `api_cors_allow_methods`, `api_cors_allow_headers`, and `api_cors_max_age_seconds`.
- Step Functions retry behavior is configurable with `round_tick_retry_interval_seconds`, `round_tick_retry_backoff_rate`, and `round_tick_retry_max_attempts`.
- Alarm window settings are configurable with `alarm_period_seconds` and `alarm_evaluation_periods`.
- Set `webhook_target_url` for environments where webhook delivery should be active.
- The SQS-to-Lambda webhook delivery mapping is only created when `webhook_target_url` is non-empty.
- Key alarms provisioned:
  - webhook DLQ visible messages
  - webhook queue oldest message age
  - round tick Step Functions execution failures
- Lambda CloudWatch log groups are managed with configurable retention (`log_retention_days`).

## Terraform Environment Files

Terraform example variable files are available in `infra/terraform/`:

- `dev.tfvars.example`
- `staging.tfvars.example`
- `prod.tfvars.example`

Create your real env files from examples (keep real `*.tfvars` out of git):

```bash
cd infra/terraform
cp dev.tfvars.example dev.tfvars
cp staging.tfvars.example staging.tfvars
cp prod.tfvars.example prod.tfvars
```

Run plan/apply per environment:

```bash
terraform plan -var-file=dev.tfvars
terraform plan -var-file=staging.tfvars
terraform plan -var-file=prod.tfvars
```

## Runbook Quick Checks

Check Step Functions health:

```bash
aws stepfunctions list-executions \
   --state-machine-arn <ROUND_TICK_STATE_MACHINE_ARN> \
   --max-results 5
```

Check queue backlog:

```bash
aws sqs get-queue-attributes \
   --queue-url <WEBHOOK_QUEUE_URL> \
   --attribute-names ApproximateNumberOfMessages ApproximateAgeOfOldestMessage
```

Check DLQ backlog:

```bash
aws sqs get-queue-attributes \
   --queue-url <WEBHOOK_DLQ_URL> \
   --attribute-names ApproximateNumberOfMessages
```

## Step Functions Learning Resources

- AWS Step Functions Developer Guide: https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html
- Amazon States Language specification: https://states-language.net/
- Lambda integration patterns: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- Step Functions best practices: https://docs.aws.amazon.com/step-functions/latest/dg/sfn-best-practices.html
- Hands-on workshop: https://catalog.workshops.aws/stepfunctions/en-US
