const ApiError = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for developers
  console.error(err);

  // If it's a Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ApiError(404, message, 'INVALID_RESOURCE_ID');
  }

  // If duplicate key error (MongoDB unique field violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value entered for ${field} field.`;
    error = new ApiError(400, message, 'DUPLICATE_KEY_ERROR');
  }

  // If validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message, 'VALIDATION_ERROR');
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server Error';
  const apiCode = error.code || 'INTERNAL_SERVER_ERROR';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: apiCode
    }
  });
};

module.exports = errorHandler;
