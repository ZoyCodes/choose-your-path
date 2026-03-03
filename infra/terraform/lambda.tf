# TODO: In production, replace with S3-based deployment

resource "aws_lambda_function" "get_current" {
  function_name = "choose-your-path-get-current-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handlers/getCurrent.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}

resource "aws_lambda_function" "vote" {
  function_name = "choose-your-path-vote-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handlers/vote.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}

resource "aws_lambda_function" "close_round" {
  function_name = "choose-your-path-close-round-${var.environment}"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handlers/closeRound.handler"
  runtime       = "nodejs20.x"
  filename      = "${path.module}/../../apps/api/dist/lambda.zip"

  environment {
    variables = {
      DYNAMO_TABLE_NAME = var.table_name
    }
  }

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}
