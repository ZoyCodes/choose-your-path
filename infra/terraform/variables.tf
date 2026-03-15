variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "choose-your-path"
}

variable "round_tick_interval_seconds" {
  description = "Step Functions loop interval in seconds for closeRound lifecycle ticks"
  type        = number
  default     = 5
}

variable "round_tick_retry_interval_seconds" {
  description = "Step Functions retry interval in seconds when closeRound invocation fails"
  type        = number
  default     = 1
}

variable "round_tick_retry_backoff_rate" {
  description = "Step Functions retry backoff rate for closeRound invocation failures"
  type        = number
  default     = 2
}

variable "round_tick_retry_max_attempts" {
  description = "Step Functions maximum retry attempts for closeRound invocation failures"
  type        = number
  default     = 3
}

variable "lambda_runtime" {
  description = "Lambda runtime for API handlers"
  type        = string
  default     = "nodejs20.x"
}

variable "api_cors_allow_origins" {
  description = "Allowed CORS origins for the HTTP API"
  type        = list(string)
  default     = ["*"]
}

variable "api_cors_allow_methods" {
  description = "Allowed CORS methods for the HTTP API"
  type        = list(string)
  default     = ["GET", "POST", "OPTIONS"]
}

variable "api_cors_allow_headers" {
  description = "Allowed CORS headers for the HTTP API"
  type        = list(string)
  default     = ["Content-Type", "Authorization"]
}

variable "api_cors_max_age_seconds" {
  description = "CORS preflight max age for the HTTP API"
  type        = number
  default     = 300
}

variable "webhook_target_url" {
  description = "Destination webhook URL for lifecycle event delivery"
  type        = string
  default     = ""
}

variable "webhook_signing_secret_arn" {
  description = "Secrets Manager ARN containing webhook signing secret"
  type        = string
  default     = ""
}

variable "webhook_delivery_lambda_timeout_seconds" {
  description = "Timeout for webhook delivery lambda"
  type        = number
  default     = 30
}

variable "webhook_queue_visibility_timeout_seconds" {
  description = "Visibility timeout for webhook queue"
  type        = number
  default     = 60
}

variable "webhook_queue_retention_seconds" {
  description = "Message retention for webhook queue"
  type        = number
  default     = 345600
}

variable "webhook_dlq_retention_seconds" {
  description = "Message retention for webhook dead-letter queue"
  type        = number
  default     = 1209600
}

variable "webhook_queue_receive_wait_time_seconds" {
  description = "Long polling wait time for webhook queue"
  type        = number
  default     = 20
}

variable "webhook_queue_max_receive_count" {
  description = "Number of delivery attempts before moving to DLQ"
  type        = number
  default     = 5
}

variable "webhook_queue_batch_size" {
  description = "Number of SQS messages processed per lambda invoke"
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "CloudWatch log retention period for Lambda functions"
  type        = number
  default     = 14
}

variable "alarm_topic_arn" {
  description = "Optional SNS topic ARN for alarm notifications"
  type        = string
  default     = ""
}

variable "alarm_email_endpoint" {
  description = "Optional email endpoint to subscribe to auto-created alarm SNS topic"
  type        = string
  default     = ""
}

variable "webhook_dlq_alarm_threshold" {
  description = "Alarm threshold for visible messages in webhook DLQ"
  type        = number
  default     = 1
}

variable "webhook_queue_oldest_message_alarm_seconds" {
  description = "Alarm threshold for age of oldest message in webhook queue"
  type        = number
  default     = 60
}

variable "round_tick_executions_failed_alarm_threshold" {
  description = "Alarm threshold for failed Step Functions round tick executions"
  type        = number
  default     = 1
}

variable "alarm_period_seconds" {
  description = "CloudWatch alarm period in seconds"
  type        = number
  default     = 60
}

variable "alarm_evaluation_periods" {
  description = "CloudWatch alarm evaluation periods"
  type        = number
  default     = 1
}
