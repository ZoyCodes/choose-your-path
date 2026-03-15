locals {
  effective_alarm_topic_arn = var.alarm_topic_arn != "" ? var.alarm_topic_arn : try(aws_sns_topic.alarm_notifications[0].arn, null)
  alarm_actions             = local.effective_alarm_topic_arn != null ? [local.effective_alarm_topic_arn] : []
}

resource "aws_cloudwatch_log_group" "lambda_get_current" {
  name              = "/aws/lambda/${aws_lambda_function.get_current.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_vote" {
  name              = "/aws/lambda/${aws_lambda_function.vote.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_close_round" {
  name              = "/aws/lambda/${aws_lambda_function.close_round.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "lambda_webhook_delivery" {
  name              = "/aws/lambda/${aws_lambda_function.webhook_delivery.function_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_metric_alarm" "webhook_dlq_visible_messages" {
  alarm_name          = "choose-your-path-webhook-dlq-visible-${var.environment}"
  alarm_description   = "Webhook DLQ has visible messages requiring investigation"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  threshold           = var.webhook_dlq_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.webhook_events_dlq.name
  }
}

resource "aws_cloudwatch_metric_alarm" "webhook_queue_oldest_message" {
  alarm_name          = "choose-your-path-webhook-queue-oldest-${var.environment}"
  alarm_description   = "Webhook queue is backing up beyond expected delivery latency"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  threshold           = var.webhook_queue_oldest_message_alarm_seconds
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    QueueName = aws_sqs_queue.webhook_events.name
  }
}

resource "aws_cloudwatch_metric_alarm" "round_tick_executions_failed" {
  alarm_name          = "choose-your-path-round-tick-failures-${var.environment}"
  alarm_description   = "Step Functions round tick loop has failed executions"
  namespace           = "AWS/States"
  metric_name         = "ExecutionsFailed"
  statistic           = "Sum"
  period              = var.alarm_period_seconds
  evaluation_periods  = var.alarm_evaluation_periods
  threshold           = var.round_tick_executions_failed_alarm_threshold
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.alarm_actions
  ok_actions          = local.alarm_actions

  dimensions = {
    StateMachineArn = aws_sfn_state_machine.round_tick_loop.arn
  }
}
