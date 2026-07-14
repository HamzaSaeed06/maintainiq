const Asset = require('../models/Asset');
const Issue = require('../models/Issue');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/dashboard/stats (auth required)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalAssets, openIssues, criticalIssues] = await Promise.all([
    Asset.countDocuments({}),
    Issue.countDocuments({ status: { $nin: ['Resolved', 'Closed'] } }),
    Issue.countDocuments({ priority: 'Critical', status: { $nin: ['Resolved', 'Closed'] } }),
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const resolvedThisWeek = await Issue.countDocuments({
    status: { $in: ['Resolved', 'Closed'] },
    $or: [
      { resolvedAt: { $gte: sevenDaysAgo } },
      { resolvedAt: null, updatedAt: { $gte: sevenDaysAgo } }
    ]
  });

  const resolvedIssues = await Issue.find({
    status: { $in: ['Resolved', 'Closed'] }
  }).select('createdAt resolvedAt updatedAt');

  let totalTimeMs = 0;
  let count = 0;
  resolvedIssues.forEach(issue => {
    const endTime = issue.resolvedAt || issue.updatedAt;
    if (endTime && issue.createdAt) {
      const diff = endTime.getTime() - issue.createdAt.getTime();
      if (diff >= 0) {
        totalTimeMs += diff;
        count++;
      }
    }
  });

  // Calculate average resolution time in hours, default to 0 if no issues
  const avgResolutionTimeHours = count > 0 
    ? Number((totalTimeMs / (1000 * 60 * 60 * count)).toFixed(1))
    : 0;

  res.status(200).json(new ApiResponse(200, {
    totalAssets,
    openIssues,
    criticalIssues,
    resolvedThisWeek,
    avgResolutionTime: avgResolutionTimeHours // in hours
  }, 'Dashboard stats calculated successfully'));
});

module.exports = {
  getDashboardStats,
};
