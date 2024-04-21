const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Preventing duplicates
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  // Calling aggregate on the model directly
  const stats = await this.aggregate([
    {
      $match: {
        tour: tourId,
      },
    },
    {
      $group: {
        _id: '$tour',
        numRating: { $sum: 1 },
        aveRating: {
          $avg: '$rating',
        },
      },
    },
  ]);
  // console.log(stats);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numRating,
      ratingsAverage: stats[0].aveRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // This points to current review
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // Retrieving current document from database and storing in variable to
  // get access to it to use in post middleware.
  this.r = await this.findOne();
  // console.log(this.r);
  next();
});

// After the query has already finished, so therefore the review has been updated,
// this is a perfect point in time where we can then call this function to actually
// calulate the statistics for reviews.
reviewSchema.post(/^findOneAnd/, async function () {
  // await this.findOne(); does NOT work here, query has already executed
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
