import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  BOT_TOKEN: Joi.string().required(),
  API_BASE_URL: Joi.string().uri().required(),
  INTERNAL_API_KEY: Joi.string().min(16).required(),
  HTTP_TIMEOUT_MS: Joi.number().default(5000),
  HTTP_RETRY_COUNT: Joi.number().default(1),
});