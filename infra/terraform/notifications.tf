resource "aws_sns_topic" "alarm_notifications" {
  count = var.alarm_topic_arn == "" ? 1 : 0
  name  = "choose-your-path-alarms-${var.environment}"
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count = var.alarm_email_endpoint != "" && var.alarm_topic_arn == "" ? 1 : 0

  topic_arn = aws_sns_topic.alarm_notifications[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email_endpoint
}
