resource "aws_sqs_queue" "webhook_events_dlq" {
  name                      = "choose-your-path-webhook-events-dlq-${var.environment}"
  message_retention_seconds = var.webhook_dlq_retention_seconds
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "webhook_events" {
  name                       = "choose-your-path-webhook-events-${var.environment}"
  visibility_timeout_seconds = var.webhook_queue_visibility_timeout_seconds
  message_retention_seconds  = var.webhook_queue_retention_seconds
  receive_wait_time_seconds  = var.webhook_queue_receive_wait_time_seconds
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.webhook_events_dlq.arn
    maxReceiveCount     = var.webhook_queue_max_receive_count
  })
}

resource "aws_lambda_event_source_mapping" "webhook_delivery_from_queue" {
  count                   = var.webhook_target_url != "" ? 1 : 0
  event_source_arn        = aws_sqs_queue.webhook_events.arn
  function_name           = aws_lambda_function.webhook_delivery.arn
  enabled                 = true
  batch_size              = var.webhook_queue_batch_size
  function_response_types = ["ReportBatchItemFailures"]
}
