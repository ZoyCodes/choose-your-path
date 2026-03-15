output "api_base_url" {
  description = "API Gateway HTTP API base URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "dynamo_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.story.name
}

output "round_tick_state_machine_arn" {
  description = "ARN for the Step Functions round tick loop"
  value       = aws_sfn_state_machine.round_tick_loop.arn
}

output "webhook_queue_url" {
  description = "SQS queue URL for lifecycle webhook events"
  value       = aws_sqs_queue.webhook_events.url
}

output "webhook_queue_arn" {
  description = "SQS queue ARN for lifecycle webhook events"
  value       = aws_sqs_queue.webhook_events.arn
}

output "webhook_dlq_arn" {
  description = "Dead-letter queue ARN for failed webhook events"
  value       = aws_sqs_queue.webhook_events_dlq.arn
}

output "webhook_dlq_alarm_name" {
  description = "CloudWatch alarm name for webhook DLQ visible messages"
  value       = aws_cloudwatch_metric_alarm.webhook_dlq_visible_messages.alarm_name
}

output "webhook_queue_oldest_message_alarm_name" {
  description = "CloudWatch alarm name for webhook queue oldest message age"
  value       = aws_cloudwatch_metric_alarm.webhook_queue_oldest_message.alarm_name
}

output "round_tick_failures_alarm_name" {
  description = "CloudWatch alarm name for round tick Step Functions failures"
  value       = aws_cloudwatch_metric_alarm.round_tick_executions_failed.alarm_name
}
