const Joi = require('joi');
const { AppError } = require('../utils/error');

/**
 * Middleware to validate request data against a Joi schema.
 * @param {Object} schemas - Object containing schemas for body, query, and/or params.
 */
const validate = (schemas) => (req, res, next) => {
  const options = {
    abortEarly: false, // Include all errors
    allowUnknown: true, // Allow unknown keys that will be ignored
    stripUnknown: true, // Remove unknown keys from the validated output
  };

  const validationErrors = [];

  ['body', 'query', 'params'].forEach((key) => {
    if (schemas[key]) {
      const { error, value } = schemas[key].validate(req[key], options);
      if (error) {
        validationErrors.push(
          ...error.details.map((detail) => ({
            location: key,
            path: detail.path.join('.'),
            message: detail.message,
          }))
        );
      } else {
        // Replace request data with validated (and stripped) value
        req[key] = value;
        if (key === 'body') req.validatedBody = value;
        if (key === 'query') req.validatedQuery = value;
        if (key === 'params') req.validatedParams = value;
      }
    }
  });

  if (validationErrors.length > 0) {
    return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', validationErrors));
  }

  next();
};

const validateBody = (schema) => validate({ body: schema });
const validateQuery = (schema) => validate({ query: schema });
const validateParams = (schema) => validate({ params: schema });

module.exports = validate;
module.exports.validate = validate;
module.exports.validateBody = validateBody;
module.exports.validateQuery = validateQuery;
module.exports.validateParams = validateParams;
module.exports.Joi = Joi;
