import * as Joi from 'joi';

// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
  NODE_ENV: Joi.string()
    .allow(['development', 'production', 'test', 'provision'])
    .default('development'),
  PORT: Joi.number()
    .when('NODE_ENV', {
      is: Joi.string().equal('development'),
      then: Joi.number().default(4040),
      otherwise: Joi.number().default(443)
    }),
  MONGOOSE_DEBUG: Joi.boolean()
    .when('NODE_ENV', {
      is: Joi.string().equal('development'),
      then: Joi.boolean().default(true),
      otherwise: Joi.boolean().default(false)
    }),
  STEEM_NODE: Joi.string().default('wss://steemd.privex.io'),
  MONGO_HOST: Joi.string().required()
    .description('Mongo DB host url'),
  MONGO_PORT: Joi.number()
    .default(27017),
  UTOPIAN_GITHUB_SECRET: Joi.string().required(),
  UTOPIAN_GITHUB_CLIENT_ID: Joi.string().required(),
  UTOPIAN_GITHUB_REDIRECT_URL: Joi.string().required(),
  UTOPIAN_STEEMCONNECT_SECRET: Joi.string().required(),
}).unknown()
  .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  steemNode: envVars.STEEM_NODE,
  mongooseDebug: envVars.MONGOOSE_DEBUG,
  mongo: {
    host: envVars.MONGO_HOST,
    port: envVars.MONGO_PORT
  }
};

export default config;
