# TODO: In production, replace with S3-based deployment

resource "aws_lambda_function" "get_current" {
  function_name = "choose-your-path-get-current-${var.environment}"
  role          = aws_iam_role.lambda_get_current.arn
  handler       = "handlers/getCurrent.handler"
  runtime       = var.lambda_runtime
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_get_current_basic,
    aws_iam_role_policy_attachment.lambda_get_current_dynamo,
  ]
}

resource "aws_lambda_function" "vote" {
  function_name = "choose-your-path-vote-${var.environment}"
  role          = aws_iam_role.lambda_vote.arn
  handler       = "handlers/vote.handler"
  runtime       = var.lambda_runtime
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_vote_basic,
    aws_iam_role_policy_attachment.lambda_vote_dynamo,
  ]
}

resource "aws_lambda_function" "close_round" {
  function_name = "choose-your-path-close-round-${var.environment}"
  role          = aws_iam_role.lambda_close_round.arn
  handler       = "handlers/closeRound.handler"
  runtime       = var.lambda_runtime
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
      WEBHOOK_QUEUE_URL = aws_sqs_queue.webhook_events.url
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_close_round_basic,
    aws_iam_role_policy_attachment.lambda_close_round_dynamo,
    aws_iam_role_policy_attachment.lambda_close_round_sqs,
  ]
}

resource "aws_lambda_function" "webhook_delivery" {
  function_name = "choose-your-path-webhook-delivery-${var.environment}"
  role          = aws_iam_role.lambda_webhook_delivery.arn
  handler       = "handlers/webhookDelivery.handler"
  runtime       = var.lambda_runtime
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"
  timeout       = var.webhook_delivery_lambda_timeout_seconds

  environment {
    variables = {
      WEBHOOK_TARGET_URL         = var.webhook_target_url
      WEBHOOK_SIGNING_SECRET_ARN = var.webhook_signing_secret_arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_webhook_delivery_basic,
    aws_iam_role_policy_attachment.lambda_webhook_delivery_sqs,
  ]
}
