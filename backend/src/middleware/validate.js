/**
 * Zod validation middleware factory.
 * Accepts optional Zod schemas for body, query, and params.
 * If validation fails, passes ZodError to centralized error handler.
 */
const validate = ({ body, query, params }) => {
  return async (req, res, next) => {
    try {
      if (body) {
        req.body = await body.parseAsync(req.body);
      }
      if (query) {
        req.query = await query.parseAsync(req.query);
      }
      if (params) {
        req.params = await params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = validate;
