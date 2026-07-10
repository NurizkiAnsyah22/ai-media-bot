import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),
  DATABASE_URL: Joi.string().required(),
  INTERNAL_API_KEY: Joi.string().min(16).required(),
});