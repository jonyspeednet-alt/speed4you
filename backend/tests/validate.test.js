const test = require('node:test');
const assert = require('node:assert/strict');

const { Joi, validateQuery } = require('../src/middleware/validate');

test('validateQuery forwards AppError on invalid query', async () => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).required(),
  });
  const middleware = validateQuery(schema);
  const req = { query: { page: '0' } };
  const res = {};

  const error = await new Promise((resolve) => {
    middleware(req, res, (err) => {
      resolve(err || null);
    });
  });

  assert.ok(error);
  assert.equal(error.status, 400);

  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.message, 'Validation failed');
});


test('validateQuery populates validatedQuery on valid input', async () => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).required(),
  });
  const middleware = validateQuery(schema);
  const req = { query: { page: '2' } };
  const res = {
    status() {
      return this;
    },
    json() {
      return this;
    },
  };
  let called = false;

  await new Promise((resolve) => {
    middleware(req, res, () => {
      called = true;
      resolve();
    });
  });

  assert.equal(called, true);
  assert.equal(req.validatedQuery.page, 2);
});

test('contentSchema round-trips the genres array the UI renders', () => {
  const { contentSchema } = require('../src/utils/validation-schemas');
  const optional = contentSchema.fork(
    Object.keys(contentSchema.describe().keys),
    (schema) => schema.optional(),
  );
  const validateOptions = { abortEarly: false, stripUnknown: true };

  // An empty array must be accepted so bad genre data can be cleared.
  const cleared = optional.validate({ genres: [] }, validateOptions);
  assert.equal(cleared.error, undefined);
  assert.deepEqual(cleared.value.genres, []);

  // Omitting the key must leave it out entirely, otherwise every unrelated PUT
  // through the admin form (which has no genres field) would wipe the array.
  const omitted = optional.validate({ title: 'Dumbo' }, validateOptions);
  assert.equal(omitted.error, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(omitted.value, 'genres'), false);
});
