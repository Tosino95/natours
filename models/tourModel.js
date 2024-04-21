const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel'); // For embedded

const tourSchema = new mongoose.Schema(
  // First object is the schema definition
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'A tour must have less or equal than 40 characters'],
      minLength: [10, 'A tour must have more or equal than 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'], // From github validator library
    },
    slug: String,
    duration: { type: String, required: [true, 'A tour must have a duration'] },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a max group'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'], // values that are allowed
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      // min and max also works for dates too
      min: [1, 'Ratings must be above 1.0'],
      max: [5, 'Ratings must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // This function will run each time a new value is set
    },
    ratingsQuantity: { type: Number, default: 0 },
    price: { type: Number, required: [true, 'A tour must have a price'] },
    priceDiscount: {
      type: Number,
      //custom validator
      validate: {
        validator: function (val) {
          // this only points to current documents on NEW document creations
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below the regular price',
      },
    },
    summary: {
      type: String,
      required: [true, 'A tour must have a description'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      // This is the path to the image file in the file system.
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false, // won't appear/hidden
    },
    // Mongo will parse the date string from user input into a date object.
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON - a special data format used to specify geospatial data
      // To specify geospatial data, the object needs to have at least 2 field names, type and coordinates
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'], // could specify polygons and lines if we want
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // To create embedded documents, we always need to use an array of objects.
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // Embedding
    // guides: Array,
    // Referencing
    guides: [
      {
        // What this means is that we expect a type of each of the elements in the guides array to be a MongoDB ID.
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  // Second object are the options
  {
    // each time that the data is actually outputted as JSON, we want virtuals to be true.
    // So basically the virtuals to be part of the output.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual properties are basically fields that we can define on our schema
// but that will not be persisted. So they will not be saved into the database
// in order to save us some space there. Most of the time, we want to really save
// our data to the database, but virtual properties make a lot of sense for fields
// that can be derived from one another. For example a conversion from miles to
// kilometers, it doesn't make sense to store these two fields in a database if
// we can easily convert one to the other. Since these aren't really apart of a
// database, we can't use them in a query.

// We need to define the get method because this virtual property here will basically
// be created each time that we get some data out of the database. So this get function
// here is called a getter.
tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// Virtual populate to get all reviews for a single tour. This allows us to keep references to
// all the child documents on the parent document, but without actually persisting that information
// to the database.
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id', // current model
});

// Indexes helps querying the db to be faster and more efficient since it won't scan every single document when sorting.
// tourSchema.index({ price: 1 }); // 1 means sorting the price index in an ascending order whereas -1 is descending order.
tourSchema.index({ price: 1, ratingsAverage: -1 }); // Compound index
tourSchema.index({ slug: 1 });
// For geospatial data, this index needs to be a 2D sphere index if the data describes real points on the Earth like sphere.
tourSchema.index({ startLocation: '2dsphere' });

// Mongoose middleware is also called pre and post hooks because we can define
// functions to run before or after a certain event, like saving a document to the database.
// There are four types of middleware in Mongoose: document, query, aggregate, and model middleware.

// Document middleware is middleware that can act on the currently processed document.
// Query middleware allows us to run functions before or after a certain query is executed.
// Aggregation middleware allows us to add hooks before or after an aggregation happens

// DOCUMENT MIDDLEWARE: Runs before .save() and .create() but not on .insertMany(). So if we use
// the command insertMany(), or others like findOne or findByID then that will actually not trigger
// the save middleware. Always keep in mind it's very important to realize that only on .save() and
// on .create() actually this middleware here is gonna be executed.

// This middleware here is basically what we call a pre save hook.
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// // Embedding middleware
// tourSchema.pre('save', async function (next) {
//   // We need to use Promise.all here because the result of all of this here is a promise, so this array
//   // here is gonna be an array full of promises which we then run by awaiting Promise.all
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// We can have multiple pre middlewares or also post middlewares for the same hook.
// Hook is what we call what save is in the above pre-hook method.
// tourSchema.pre('save', function (next) {
//   console.log('Will save document...');
//   next();
// });

// Post middleware functions are executed after all the pre middleware functions have completed.
// So in here we actually no longer have the this keyword, but instead we have the basically finished
// document in the doc paramater.
// tourSchema.post('save', function (doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE: The big difference between query middleware and document middleware is the
// this keyword will now point at the current query and not at the current document, because we're not
// really processing any documents here. We're really gonna be processing a query.

// A pre-find hook is middleware that is gonna run before any "find" query is executed.
// tourSchema.pre('find', function (next) {
// The regular expression used will find all of the queries that start with "find"
tourSchema.pre(/^find/, function (next) {
  // This will be executed before any of the "find" queries in tourController is executed.
  this.find({ secretTour: { $ne: true } });
  this.start = Date.now();
  next();
});

// Nice hack to populate all of our documents instead of directly on the controller
tourSchema.pre(/^find/, function (next) {
  this.populate({
    // The populate process always happens in a query. We use populate in order to actually get access to the referenced
    // tour guides whenever we query for a certain tour. Behind the scenes, using populate will still actually create a new query,
    // so this might affect your performance. If you only do it once or twice and in a kind of small application, then that small
    // hit on performance is no big deal at all, but in a huge application, with tons of populates all over the place, then that
    // might indeed have some kind of effect.
    path: 'guides',
    select: '-__v -passwordChangedAt', // What we don't revealed in the output
  });
  next();
});

// A post-find hook is middleware that is gonna run after any "find" query is executed. Therefore, it can
// have access to the documents that were returned because the query has already finished at this point.
tourSchema.post(/^find/, function (docs, next) {
  console.log(`Query took ${Date.now() - this.start} milliseconds`);
  // console.log(docs);
  next();
});

// AGGREGATION MIDDLEWARE:

// A pre-aggregate hook is middleware that is gonna run before any "aggregate" query is executed.
// The this keyword points to the current aggregation object.
// Commented out here so that geoNear could be the first stage in the aggregation pipeline
// tourSchema.pre('aggregate', function (next) {
//   // Removing from the output all the documents that have secretTour set to true
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next();
// });

// Aggregate middleware functions are executed after all the pre middleware functions have completed.

const Tour = mongoose.model('Tour', tourSchema);

// The only thing we need to export is the tour model.
module.exports = Tour;
