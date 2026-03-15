data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_get_current" {
  name               = "choose-your-path-lambda-get-current-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "lambda_vote" {
  name               = "choose-your-path-lambda-vote-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "lambda_close_round" {
  name               = "choose-your-path-lambda-close-round-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role" "lambda_webhook_delivery" {
  name               = "choose-your-path-lambda-webhook-delivery-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_get_current_dynamo" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
    ]
    resources = [aws_dynamodb_table.story.arn]
  }
}

data "aws_iam_policy_document" "lambda_vote_dynamo" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:UpdateItem",
    ]
    resources = [aws_dynamodb_table.story.arn]
  }
}

data "aws_iam_policy_document" "lambda_close_round_dynamo" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
    ]
    resources = [aws_dynamodb_table.story.arn]
  }
}

data "aws_iam_policy_document" "lambda_close_round_sqs" {
  statement {
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:SendMessageBatch",
    ]
    resources = [aws_sqs_queue.webhook_events.arn]
  }
}

data "aws_iam_policy_document" "lambda_webhook_delivery_sqs" {
  statement {
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:DeleteMessageBatch",
      "sqs:ChangeMessageVisibility",
      "sqs:ChangeMessageVisibilityBatch",
      "sqs:GetQueueAttributes",
      "sqs:GetQueueUrl",
    ]
    resources = [aws_sqs_queue.webhook_events.arn]
  }
}

data "aws_iam_policy_document" "lambda_webhook_delivery_secret" {
  count = var.webhook_signing_secret_arn != "" ? 1 : 0

  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [var.webhook_signing_secret_arn]
  }
}

resource "aws_iam_policy" "lambda_get_current_dynamo" {
  name   = "choose-your-path-get-current-dynamo-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_get_current_dynamo.json
}

resource "aws_iam_policy" "lambda_vote_dynamo" {
  name   = "choose-your-path-vote-dynamo-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_vote_dynamo.json
}

resource "aws_iam_policy" "lambda_close_round_dynamo" {
  name   = "choose-your-path-close-round-dynamo-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_close_round_dynamo.json
}

resource "aws_iam_policy" "lambda_close_round_sqs" {
  name   = "choose-your-path-close-round-sqs-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_close_round_sqs.json
}

resource "aws_iam_policy" "lambda_webhook_delivery_sqs" {
  name   = "choose-your-path-webhook-delivery-sqs-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_webhook_delivery_sqs.json
}

resource "aws_iam_policy" "lambda_webhook_delivery_secret" {
  count  = var.webhook_signing_secret_arn != "" ? 1 : 0
  name   = "choose-your-path-webhook-delivery-secret-${var.environment}"
  policy = data.aws_iam_policy_document.lambda_webhook_delivery_secret[0].json
}

resource "aws_iam_role_policy_attachment" "lambda_get_current_dynamo" {
  role       = aws_iam_role.lambda_get_current.name
  policy_arn = aws_iam_policy.lambda_get_current_dynamo.arn
}

resource "aws_iam_role_policy_attachment" "lambda_vote_dynamo" {
  role       = aws_iam_role.lambda_vote.name
  policy_arn = aws_iam_policy.lambda_vote_dynamo.arn
}

resource "aws_iam_role_policy_attachment" "lambda_close_round_dynamo" {
  role       = aws_iam_role.lambda_close_round.name
  policy_arn = aws_iam_policy.lambda_close_round_dynamo.arn
}

resource "aws_iam_role_policy_attachment" "lambda_close_round_sqs" {
  role       = aws_iam_role.lambda_close_round.name
  policy_arn = aws_iam_policy.lambda_close_round_sqs.arn
}

resource "aws_iam_role_policy_attachment" "lambda_webhook_delivery_sqs" {
  role       = aws_iam_role.lambda_webhook_delivery.name
  policy_arn = aws_iam_policy.lambda_webhook_delivery_sqs.arn
}

resource "aws_iam_role_policy_attachment" "lambda_webhook_delivery_secret" {
  count      = var.webhook_signing_secret_arn != "" ? 1 : 0
  role       = aws_iam_role.lambda_webhook_delivery.name
  policy_arn = aws_iam_policy.lambda_webhook_delivery_secret[0].arn
}

resource "aws_iam_role_policy_attachment" "lambda_get_current_basic" {
  role       = aws_iam_role.lambda_get_current.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vote_basic" {
  role       = aws_iam_role.lambda_vote.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_close_round_basic" {
  role       = aws_iam_role.lambda_close_round.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_webhook_delivery_basic" {
  role       = aws_iam_role.lambda_webhook_delivery.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
