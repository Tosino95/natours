// Rendering pages in browser
// Instead of using json, we're using render to render the template with the name passed in.
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
// const authController = require('./authController');

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1) Get the data, for the requested tour (including reviews and guides)
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user guide',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }

  // 2) Build template
  // 3) Render using template using data from 1)
  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getSignupForm = catchAsync(async (req, res, next) => {
  res.status(200).render('signup', {
    title: 'Create your account',
    // user,
  });
});
exports.getLoginForm = catchAsync(async (req, res, next) => {
  // const user = authController.login(req, res, next);
  // console.log(user);
  res.status(200).render('login', {
    title: 'Log into your account',
    // user,
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your Account',
  });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings for current user
  const bookings = await Booking.find({ user: req.user.id });
  // console.log(bookings);

  // 2) Find tours with the returned IDs
  const tourIDs = await bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  // 3) Build template
  res.status(200).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your Account',
    user: updatedUser,
  });
});

exports.getStripeRedirect = catchAsync(async (req, res, next) => {});
