// Anything related to the server is in this file

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// This should be at the top to catch any bugs in our synchronous code
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Reading environment variables
dotenv.config({ path: `./config.env` }); // This needs to be configured before app
const app = require('./app');

// console.log(app.get('env'));
// console.log(process.env); // To see the environment variables

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

// Connecting the database to our express app. Connect() returns a promise.
mongoose
  .connect(DB, {
    // These here are just some options to deal with some deprecation warnings.
    // They're nothing to worry about.
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection established');
  });

// START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(3000, () => {
  console.log(`App running on port ${port}...`);
});

// Each time there is an unhandled rejection somewhere in the application, the process object
// will emit an object called unhandled rejection and so we can subscribe to that event.
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  // By doing server.close, we give the server basically time to finish all the request that are still pending
  // or being handled at the time, and only after that, the server is then basically killed
  server.close(() => process.exit(1)); // code 0 stands for a success and 1 stands for uncaught exception.
});
