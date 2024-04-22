// Path is a core module used to manipulate path names. It helps to not worry about directory slashes
const path = require('path');
// All of Express configuration is in app.js
const express = require('express');
// Morgan is a very popular logging middleware. It's a middleware that's gonna allow us to see request data right in the console.
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARE
// This is middleware. Middleware is basically a function that can modify the incoming request data. It's called middleware because it stands between,
// so in the middle of the request and the response. It's just a step that the request goes through while it's being processed.

//Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(
//   cors({
//     origin: 'https://www.natours.com',
//   }),
// );

app.options('*', cors());
app.options('/api/v1/tours:id', cors());

// Serving static files from a folder and not a route
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// Best to use helmet package early in the middleware stack, so that these headers are really sure to be set.
// Set security HTTP headers
app.use(helmet());

// Development logging
// console.log(process.env.NODE_ENV);
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests from the same ip within 1 hour
  windowMs: 60 * 60 * 1000, // 1 hour window
  message: 'Too many requests from this IP, please try again in an hour.',
});
// Limiting our limiter access to API route
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); // A body larger than 10kb will not be accepted
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Middleware to basically parse data coming from a URL encoded form. extended: true will simply
// allow us to pass some more complex data
app.use(cookieParser()); // Parses data from cookie

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss()); // This will then clean any user input from malicious HTML code.

// Prevent parameter pollution
app.use(
  hpp({
    // The white list is simply an array of properties for which we actually allow duplicates in the query string.
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
); // This will clear up the query string so that there are no duplicates for instance sort being repeated twice in the query string

app.use(compression());

// Test middlewares
// Creating our own middleware. If we don't specify any route, the middleware(global) will apply to each and every request. This is the usual case. Order really
// matters using middleware. Custom middleware won't work with any route handlers above them because a route handler ends the request/response cycle, Since they're
// like middleware themselves. It'll work with any route handler below them because it is part of the middleware stack that get executed before the request response cycle ends.
app.use((req, res, next) => {
  // console.log('Hello from the middleware!');
  // If we don't call next() here, the request/response cycle will be stuck at this point, so it's important to call next.
  next();
});

// We can have as many middlewares as we want. This one will manipulate the request object.
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});

///Allow maptiler
// app.use((req, res, next) => {
//   res.setHeader(
//     'Content-Security-Policy',
//     "script-src 'self' https://cdn.maptiler.com",
//   );
//   next();
// });

// // Further HELMET configuration for Security Policy (CSP)
const scriptSrcUrls = [
  'https://*.maptiler.com',
  // 'https://*.cloudflare.com',
  // 'https://js.stripe.com/v3/',
  // 'https://checkout.stripe.com',
];
// const styleSrcUrls = [
//   'https://*.maptiler.com',

//   'https://fonts.googleapis.com/',
//   'https://www.myfonts.com/fonts/radomir-tinkov/gilroy/*',
//   ' checkout.stripe.com',
// ];
const connectSrcUrls = [
  'https://*.maptiler.com',
  // 'https://*.cloudflare.com',
  // 'http://127.0.0.1:3000',
  // 'http://127.0.0.1:52191',
  // '*.stripe.com',
];

// const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];

// HELMET - Set Security HTTP headers
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", 'blob:', ...scriptSrcUrls],
      // workerSrc: ["'self'", 'blob:'],
      // styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      // objectSrc: ["'none"],
      // imgSrc: ["'self'", 'blob:', 'data:'],
      // fontSrc: ["'self'", ...fontSrcUrls],
      // frameSrc: ['*.stripe.com', '*.stripe.network'],
    },
  }),
);

// 3) ROUTES
// Route handlers unchained
// Get all the tours
// app.get('/api/v1/tours', getAllTours);

// Get a single tour by id
// app.get('/api/v1/tours/:id', getTourById);

// Create a new tour
// app.post('/api/v1/tours', createTour);

// Update a tour
// app.patch('/api/v1/tours/:id', updateTour);

// Delete a tour
// app.delete('/api/v1/tours/:id', deleteTour);

// This is called mounting the router
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// ERROR HANDLING ROUTES
// If we have a request that fails reaching any of the route handler, this middleware will handle the failed request since it’s right after it.
// This will handle all http requests and all urls that fail.
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  // Using the global error middleware
  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;

  // // whenever we pass anything into next, it will assume that it is an error, and it will then skip all the other middlewares in the middleware
  // // stack and send the error that we passed in to our global error handling middleware, which will then be executed.
  // next(err);

  // Using the AppError class which is preferable
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 400));
});

// GLobal/central error middleware
// To define an error handling middleware, all we need to do is to give the middleware function four arguments and Express will then automatically recognize it as an
// error handling middleware.
app.use(globalErrorHandler);

module.exports = app;

// Basic Example
// app.get('/', (req, res) => {
//   res
//     .status(200)
//     .json({ message: 'Hello from the server side!', app: 'Natours' });
// });

// app.post('/', (req, res) => {
//   res.send('You can post to this endpoint...');
// });
