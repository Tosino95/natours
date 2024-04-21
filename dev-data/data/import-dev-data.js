// Script to import data from file directory to mongoDB
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Tour = require('../../models/tourModel');
const Review = require('../../models/reviewModel');
const User = require('../../models/userModel');

dotenv.config({ path: `./config.env` });

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection established');
  });

// READ JSON FILE - Convert to Javascript object
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf8'),
);

// Importing the data from the JSON file into the database
const importData = async () => {
  try {
    // The create method can also accept an array of objects. In that case it will then simply create a new document for each of the objects in the array.
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false }); // All the validation in the model will be skipped
    await Review.create(reviews);
    console.log('Data imported successfully!');
    process.exit(); // Application will still run if the process does not exit.
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// DELETE ALL DATA FROM DATABASE
const deleteData = async () => {
  try {
    await Tour.deleteMany();
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data successfully deleted!');
    process.exit();
  } catch (err) {
    console.log(err);
  }
  process.exit();
};

// Getting the command line arguments listed when we do node (insert script), in this case, dev-data/data/import-dev-data.js. The flag is the 3rd argument.
console.log(process.argv);

// We can use the --import flag to import data from file directory to mongoDB or the --delete flag to delete all data from the database.
if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
