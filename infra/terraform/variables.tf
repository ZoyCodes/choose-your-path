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
