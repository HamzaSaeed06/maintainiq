const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Register controller - Admin Only
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password || !role) {
    return next(new ApiError(400, 'Name, email, password, and role are required', 'BAD_REQUEST'));
  }

  if (role !== 'admin' && role !== 'technician') {
    return next(new ApiError(400, 'Role must be either admin or technician', 'BAD_REQUEST'));
  }

  // Check unique email
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ApiError(400, 'Email is already registered', 'EMAIL_ALREADY_EXISTS'));
  }

  // Create User
  const newUser = await User.create({
    name,
    email,
    password,
    role,
    phone
  });

  // Remove password from response
  const userResponse = newUser.toObject();
  delete userResponse.password;

  res.status(201).json(new ApiResponse(201, userResponse, 'User registered successfully'));
});

// Login controller
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, 'Email and password are required', 'BAD_REQUEST'));
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
  }

  // Compare passwords
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'));
  }

  // Generate JWT token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  // Remove password
  const userResponse = user.toObject();
  delete userResponse.password;

  res.status(200).json(new ApiResponse(200, { user: userResponse, token }, 'Logged in successfully'));
});

// Get current user details
const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user, 'Current user loaded successfully'));
});

// List technicians (admin only)
const getTechnicians = asyncHandler(async (req, res) => {
  const technicians = await User.find({ role: 'technician' }).select('name email phone isActive createdAt');
  res.status(200).json(new ApiResponse(200, technicians, 'Technicians retrieved successfully'));
});

// Delete user (admin only)
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  // Prevent deleting yourself
  if (id === req.user.id) {
    return next(new ApiError(400, 'You cannot delete your own account', 'BAD_REQUEST'));
  }
  
  const user = await User.findById(id);
  if (!user) {
    return next(new ApiError(404, 'User not found', 'NOT_FOUND'));
  }
  
  // Prevent deleting the last admin
  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return next(new ApiError(400, 'Cannot delete the last admin account', 'BAD_REQUEST'));
    }
  }
  
  await User.findByIdAndDelete(id);
  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

// Toggle user active/inactive status (admin only)
const toggleUserStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  // Prevent deactivating yourself
  if (id === req.user.id) {
    return next(new ApiError(400, 'You cannot deactivate your own account', 'BAD_REQUEST'));
  }
  
  const user = await User.findById(id);
  if (!user) {
    return next(new ApiError(404, 'User not found', 'NOT_FOUND'));
  }
  
  user.isActive = !user.isActive;
  await user.save();
  
  res.status(200).json(new ApiResponse(200, { isActive: user.isActive }, `User ${user.isActive ? 'activated' : 'deactivated'} successfully`));
});

module.exports = {
  register,
  login,
  me,
  getTechnicians,
  deleteUser,
  toggleUserStatus,
};
