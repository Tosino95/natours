// Tour ROUTE HANDLERS
const multer = require('multer');
const sharp = require('sharp');
const Tour = require('../models/tourModel');
// const APIFeatures = require('../utils/apiFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// JSON.parse, so that the JSON that we have in here will automatically be converted to a Javascript object or an array of Javascript objects
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`),
// );

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400));
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 }, // We can only have one field called imageCover
  { name: 'images', maxCount: 3 },
]);

// In case that we didn't have the image cover and if that only had one field which accepts multiple images
// or multiple files at the same time, we could have done it like this.
// upload.single('image'); req.files
// upload.array('images', 5); req.files

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || !req.files.images) return next();

  // console.log(req.files);

  // 1) Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // 2) Images
  req.body.images = [];

  // Since the async happens within the callback function, we need to use map to the save an array of images of all the promises.
  // Promise.all we'll await all the promises. If we don't do this, the code will still jump over this to the next line even if it's
  // this function does not finish running. We only want to move to the next middleware once this function is done running.
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    }),
  );

  next();
});

// This middleware will check if the id exists for a tour. Learning purpose for middleware. Not to be used for final application.
// exports.checkID = (req, res, next, val) => {
//   console.log(`Tour id is: ${val}`);
//   const id = req.params.id * 1;
//   if (id > tours.length) {
//     // Important for function to have return statement, so that it'll finish and never call the next().
//     return res.status(404).json({
//       status: 'error',
//       message: 'Tour not found',
//     });
//   }
//   next();
// };

// Middleware to check if the body of the request contains a name and price when creating a tour. Learning purpose for middleware.
// Not to be used for final application. No need since catch block for controller will handle this check.
// exports.checkBody = (req, res, next) => {
//   if (!req.body.name || !req.body.price) {
//     return res.status(400).json({
//       status: 'error',
//       message: 'Missing name or price',
//     });
//   }
//   next();
// };

exports.aliasTopTours = (req, res, next) => {
  // Manipulating the query object so that when it reaches the getAllTours handler, it's then already different.
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

// exports.getAllTours = catchAsync(async (req, res, next) => {
//   // console.log(req.requestTime);

//   // const tours = await Tour.find(); // Since nothing is passed into find(), this will find all the tours in the database

//   // APIFeatures without using a class
//   // BUILD THE QUERY
//   // 1A) Filtering
//   // We'll have to basically exclude the special field names from our query string before we actually do the filtering.
//   // First we'll create a shallow copy of the req.query object. Then destructure it to put in a new object so that we don't
//   // modify the original object since we really need a hard copy, but JS doesn't have a built in way.
//   // const queryObj = { ...req.query };
//   // We will implement all of the functionality of paging, sorting, limiting, and selecting only some specific fields elsewhere
//   // const excludeFields = ['page', 'sort', 'limit', 'fields'];
//   // Removing excluded fields from the query object.
//   // excludeFields.forEach((el) => delete queryObj[el]);

//   // Original req.query will have all fields. queryObj will exclude the excluded fields.
//   // console.log(req.query, queryObj);

//   // One way of filtering example
//   // const tours = await Tour.find({
//   //   duration: 5,
//   //   difficulty: 'easy',
//   // });

//   // 1B) Advanced filtering
//   // let queryStr = JSON.stringify(queryObj);
//   // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`); // Regular expression. \b is exact word without any string around it.
//   // console.log(JSON.parse(queryStr));

//   // Advance filtering example
//   // {difficulty: 'easy', duration: {$gte: 5}} gte is greater than or equal to - mongoDB correspondent
//   // {difficulty: 'easy', duration: { gte: '5'} } - req.query. Replace all the operators with their correspondent MongoDB operators,
//   // so basically adding the dollar sign
//   // gte,gt,lte,lt

//   // If you use await here, as soon as you do the query will then execute and come back with the documents that actually match our query.
//   // Therefore we wouldn't be able to chain methods such as sorting, pagination, and other features. Instead we have to save this part of the query
//   // in a variable. In the end where we execute the query, we'll chain the query with the other methods like sort, page, limit, and etc.
//   // const query = Tour.find(queryObj); // basic filtering
//   // let query = Tour.find(JSON.parse(queryStr)); // advanced filtering

//   // 2) Sorting
//   // if (req.query.sort) {
//   // const sortBy = req.query.sort.split(',').join(' ');
//   // console.log(sortBy); // sort(price ratingsAverage) - ex
//   // query = query.sort(sortBy);
//   // } else {
//   //newest ones will appear first
//   // query = query.sort('-createdAt');
//   // }

//   // 3) Field limiting also known as projecting
//   // if (req.query.fields) {
//   //   const fields = req.query.fields.split(',').join(' ');
//   //   query = query.select(fields);
//   // } else {
//   // We always have __v, which is set to zero, and Mongodbs just creates these fields because it uses them internally. It's not a good practice to disable them.
//   // because Mongodbs actually uses them, but what we can do is to basically never send them to the client, so we can exclude them. The way we do that is we just
//   // prefix it with a minus, -__-. Minus excludes, not includes
//   // query = query.select('-__v');
//   // }

//   // 4) Pagination

//   // const page = req.query.page * 1 || 1;
//   // const limit = req.query.limit * 1 || 100;
//   // const skip = (page - 1) * 1 * limit;

//   // Limit is the number of records to be returned. Skip is the amount of records that should be skipped before actually querying the data.
//   // page=2&limit=10, 1-10 - page 1, 11-20 - page 2, 21-30 - page 3
//   // query = query.skip(skip).limit(limit);

//   // if (req.query.page) {
//   //   const numTours = await Tour.countDocuments();
//   //   if (skip > numTours) throw new Error('This page does not exist.');
//   // }

//   // EXECUTE THE QUERY
//   const features = new APIFeatures(Tour.find(), req.query)
//     .filter()
//     .sort()
//     .limitFields()
//     .paginate();
//   const tours = await features.query;

//   // 2nd way of basic filtering example
//   // const tours = await Tour.find()
//   //   .where('duration', 'difficulty')
//   //   .equals(5, 'easy');

//   // SEND RESPONSE
//   res.status(200).json({
//     status: 'success',
//     // requestedAt: req.requestTime, // Just for testing purposes
//     results: tours.length,
//     data: { tours },
//   });
// });

//Without handler factory function
// exports.getTourById = catchAsync(async (req, res, next) => {
//   // Learning purpose with data from file directory instead of mongoDB
//   // req.params is where all the parameters of all the variables that we define here are stored
//   // console.log(req.params);
//   // Multiplying a string with a number by 1 will automatically convert the string to a number,
//   // const id = req.params.id * 1;
//   // const tour = tours.find((tour) => tour.id === id);

//   //Mongooose way
//   const tour = await Tour.findById(req.params.id).populate('reviews');
//   // Tour.findOne({ _id: req.params.id } works the exact way as above.

//   if (!tour) {
//     // Make sure to return so that the 200 response below doesn't send too
//     return next(new AppError('No tour found with that id', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: { tour },
//   });
// });

// exports.createTour = catchAsync(async (req, res, next) => {
//   const newTour = await Tour.create(req.body);
//   res.status(201).json({
//     status: 'success',
//     data: { tours: newTour },
//   });
// No longer a catch block, because in here it's just easier to use the promise that the fn function returns.
//   try {
//     // Synchronous way to create a new document
//     // const newTour = new Tour({});
//     // newTour.save();
// } catch (err) {
//   res.status(400).json({
//     status: 'error',
//     message: err.message,
//   });
// }
// });

// exports.updateTour = catchAsync(async (req, res, next) => {
//   const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
//     new: true, // If we want to return the updated document instead of the original document
//     runValidators: true, // each time that we update a certain document, then the validators that we specified in the schema will run again on the new document
//   });

//   if (!tour) {
//     // Make sure to return so that the 200 response below doesn't send too
//     return next(new AppError('No tour found with that id', 404));
//   }

//   res.status(200).json({
//     status: 'success',
//     data: { tour },
//   });
// });

// exports.deleteTour = catchAsync(async (req, res, next) => {
//   // Not saving in a variable because in a RESTful API, it is a common practice notvto send back any data to the client when there was a delete operation
//   const tour = await Tour.findByIdAndDelete(req.params.id);

//   if (!tour) {
//     // Make sure to return so that the 200 response below doesn't send too
//     return next(new AppError('No tour found with that id', 404));
//   }

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

//With handler factory function
exports.getAllTours = factory.getAll(Tour);
exports.getTourById = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
exports.updateTour = factory.updateOne(Tour);
exports.deleteTour = factory.deleteOne(Tour);

// An aggregation pipeline is a powerful mongoDB framework used for data aggregation. We basically define a pipeline hat all documents from a certain
// collection go through where they are processed step by step in order to transform them into aggregated results.
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    // The documents then pass through these stages one by one, step by step in the define sequence as we define it here.
    {
      // Match is basically to select or to filter certain documents. Usually this match stage is just a preliminary stage
      // to then prepare for the next stages which come ahead.
      $match: {
        ratingsAverage: { $gte: 4.5 },
      },
    },
    // Group allows us to group documents together, basically using accumulators.
    {
      $group: {
        // Now the first thing, is we always need to specify is the id because this is where we're gonna specify what we want to group by.
        // We can use null here if we want to have everything in one group so that we can calculate the statistics for all of the tours together
        // and not separate it by groups. We can group by any field for example 'difficulty'
        _id: { $toUpper: '$difficulty' },
        // we basically add one for each document, and so we say 1, and that's it. So basically for each of the document that's gonna go through this pipeline,
        // one will be added to this num counter
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 }, // 1 ascending, -1 descending
    },
    // Stages can be repeated
    // {
    //   $match: { _id: { $ne: 'EASY' } },
    // },
  ]);
  res.status(200).json({
    status: 'success',
    data: { stats },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;

  const plan = await Tour.aggregate([
    {
      // unwind is gonna do is basically deconstruct an array field from the info documents and then output one document for each element of the array.
      $unwind: '$startDates', // This will give us one document for each start date
    },
    {
      $match: {
        startDates: {
          // Greater than or equal to the first of the year and less than or equal to the last day of the year, so that we get 1 year of data
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // The number stands for month numbered so January is 1, February is 2, etc
        numTourStarts: { $sum: 1 }, // counting the amount of tours that have a certain month
        tours: { $push: '$name' }, // Creates an array of tours. As each document goes through this pipeline, the name of the document/tour will be
        // pushed to this array.
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        _id: 0, // When set to 0, the id will no longer show up, but if it was set to 1, it would show up.
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { plan },
  });
});

// tours-within/:distance/center/:latlng/unit/:unit
// tours-within/233/center/32.732544, -97.283157/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }
  // GeoWithin finds documents within a certain geometry.
  const tours = await Tour.find({
    startLocation: {
      $geoWithin: {
        $centerSphere: [[lng, lat], radius],
      },
    },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { tours },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;
  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400,
      ),
    );
  }
  const distances = await Tour.aggregate([
    {
      // geoNear is the only geospatial aggregation pipeline stage that actually exists. It always needs to be the
      // first one in the pipeline. It also requires that at least one of our fields contains a geospatial index.
      // If there's only one field with a geospatial index then the geoNear stage will automatically use that index
      // in order to perform the calculation, but if you have multiple fields with geospatial indexes then you need
      // to use the keys parameter in order to define the field that you want to use for calculations.
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] }, // near is the point from which to calculate the distances.
        distanceField: 'distance', // This is the name of the field that will be created to store all the calculated distances
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1, // When set to 0, the field will no longer show up, but if it was set to 1, it would show up.
        name: 1,
      },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: { distances },
  });
});

// Create tour example using data from file directory instead of mongoDB
// exports.createTour = (req, res) => {
//   console.log(req.body);
//   const newId = tours[tours.length - 1].id + 1;
//   // Creating a new object by merging two existing objects.
//   const newTour = Object.assign({ id: newId }, req.body);
//   tours.push(newTour);
//   // Persisting the new object to the file - asynchronous
//   fs.writeFile(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//     (err) => {
//       res.status(201).json({
//         status: 'success',
//         data: { tours: newTour },
//       });
//     },
//   );
//   // This format works to persist the file but synchronously
//   fs.writeFileSync(
//     `${__dirname}/dev-data/data/tours-simple.json`,
//     JSON.stringify(tours),
//   );
//   res.status(201).json({
//     status: 'success',
//     data: { newTour },
//   });
//   res.send('Done');
// };
