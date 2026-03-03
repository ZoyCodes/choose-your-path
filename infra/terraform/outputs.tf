output "api_base_url" {
  description = "API Gateway HTTP API base URL"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "dynamo_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.story.name
}
