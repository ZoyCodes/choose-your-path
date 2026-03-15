data "aws_iam_policy_document" "step_functions_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "round_tick_state_machine" {
  name               = "choose-your-path-round-tick-sfn-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.step_functions_assume_role.json
}

data "aws_iam_policy_document" "round_tick_state_machine" {
  statement {
    effect  = "Allow"
    actions = ["lambda:InvokeFunction"]
    resources = [
      aws_lambda_function.close_round.arn,
    ]
  }
}

resource "aws_iam_policy" "round_tick_state_machine" {
  name   = "choose-your-path-round-tick-sfn-${var.environment}"
  policy = data.aws_iam_policy_document.round_tick_state_machine.json
}

resource "aws_iam_role_policy_attachment" "round_tick_state_machine" {
  role       = aws_iam_role.round_tick_state_machine.name
  policy_arn = aws_iam_policy.round_tick_state_machine.arn
}

resource "aws_sfn_state_machine" "round_tick_loop" {
  name     = "choose-your-path-round-tick-${var.environment}"
  role_arn = aws_iam_role.round_tick_state_machine.arn

  definition = jsonencode({
    Comment = "Continuously advances global story lifecycle on a sub-minute cadence"
    StartAt = "TickRound"
    States = {
      TickRound = {
        Type     = "Task"
        Resource = "arn:aws:states:::lambda:invoke"
        Parameters = {
          FunctionName = aws_lambda_function.close_round.arn
          Payload = {
            source = "step-functions"
          }
        }
        Retry = [
          {
            ErrorEquals     = ["States.TaskFailed"]
            IntervalSeconds = var.round_tick_retry_interval_seconds
            BackoffRate     = var.round_tick_retry_backoff_rate
            MaxAttempts     = var.round_tick_retry_max_attempts
          }
        ]
        Next = "WaitForNextTick"
      }
      WaitForNextTick = {
        Type    = "Wait"
        Seconds = var.round_tick_interval_seconds
        Next    = "TickRound"
      }
    }
  })

  depends_on = [aws_iam_role_policy_attachment.round_tick_state_machine]
}
