const { NotFoundError } = require('../errors/AppError');

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
