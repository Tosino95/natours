const Review = require('../models/reviewModel');
const factory = require('./handlerFactory');
// const catchAsync = require('../utils/catchAsync');

// exports.getAllReviews = catchAsync(async (req, res, next) => {
//   let filter = {};
//   // Nested GET to get all reviews for specific tour if tourId is present
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: { reviews },
//   });
// });

// Allow nested routes - With this, we actually make it so
// that the user can still specify manually the tour and the
// user ID. Here we're simply defining them when they are not
// there or when they are not specified in the request body.
exports.setTourUserIds = (req, res, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
