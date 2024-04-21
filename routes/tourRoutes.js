const express = require('express');
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
// const reviewController = require('./../controllers/reviewController');
const reviewRouter = require('./reviewRoutes');

// ROUTES
const router = express.Router();

// Param middleware is middleware that only runs for certain parameters, so basically, when we have a certain parameter in our URL.
// router.param('id', tourController.checkID);

// Nested routing
// POST /tour/934893j/reviews
// GET /tour/934893j/reviews
// GET /tour/934893j/reviews/478349vd
// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview,
//   );

router.use('/:tourId/reviews', reviewRouter);

// Aliasing routes
// Running a middleware that has the query object to retrieve the top 5 cheapest tours before the getAllTours handler
router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

// Center is user's location
router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

router.route('/distance/:latlng/unit/:unit').get(tourController.getDistances);

// Regular routes
router
  .route('/')
  .get(tourController.getAllTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );
router
  .route('/:id') // This will be read for req.params.id used in controller
  .get(tourController.getTourById)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
