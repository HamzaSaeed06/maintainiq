const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const auth = asyncHandler(async (req, res, next) => {
  let token;

  // Retrieve token from Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Please authenticate', 'UNAUTHORIZED'));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new ApiError(401, 'User associated with this token no longer exists', 'UNAUTHORIZED'));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new ApiError(403, 'Your account has been deactivated. Please contact administrator.', 'ACCOUNT_DEACTIVATED'));
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new ApiError(401, 'Invalid or expired token', 'UNAUTHORIZED'));
  }
});

module.exports = auth;
