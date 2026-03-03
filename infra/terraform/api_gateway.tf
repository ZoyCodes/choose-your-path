resource "aws_apigatewayv2_api" "main" {
  name          = "choose-your-path-${var.environment}"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true
}

# GET /current
resource "aws_apigatewayv2_integration" "get_current" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_current.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "get_current" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "GET /current"
  target    = "integrations/${aws_apigatewayv2_integration.get_current.id}"
}

resource "aws_lambda_permission" "get_current" {
  statement_id  = "AllowAPIGatewayGetCurrent"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_current.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# POST /vote
resource "aws_apigatewayv2_integration" "vote" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.vote.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "vote" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /vote"
  target    = "integrations/${aws_apigatewayv2_integration.vote.id}"
}

resource "aws_lambda_permission" "vote" {
  statement_id  = "AllowAPIGatewayVote"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.vote.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

# POST /close
resource "aws_apigatewayv2_integration" "close_round" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.close_round.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "close_round" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /close"
  target    = "integrations/${aws_apigatewayv2_integration.close_round.id}"
}

resource "aws_lambda_permission" "close_round" {
  statement_id  = "AllowAPIGatewayCloseRound"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.close_round.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}
