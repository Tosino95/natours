// User ROUTE HANDLERS

// const fs = require('fs');
// Multer is a very popular middleware to handle multi-part form data, which is
// a form in coding that's used to upload files from a form.
const multer = require('multer');
// Sharp is a really nice and easy to use image processing library for Node Js.
// It's especially useful for resizing images.
const sharp = require('sharp');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// JSON.parse, so that the JSON that we have in here will automatically be converted to a Javascript object or an array of Javascript objects
// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/users.json`),
// );

// exports.getAllUsers = catchAsync(async (req, res) => {
//   const users = await User.find();

//   res.status(200).json({
//     status: 'success',
//     results: users.length,
//     data: { users },
//   });
// });

// Saving file to disk but it's not best to save a file to disk
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     // user-76774783483fn-849374849.jpeg
//     const extension = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${extension}`);
//   },
// });

// Best to save file to memory so this way the image can also be saves as a buffer.
const multerStorage = multer.memoryStorage();

// In this function, the goal is to test if the uploaded file is an image. If it is so, then true is passed into the callback function,
// and if it's not false is passed into the callback function, along with an error. We do not want to allow files to be uploaded that
// are not images.
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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// Looping through original object to find the allowed fields that would be added to the new empty object
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Getting data of current user logged in
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// User themselves can update their email and name
exports.updateMe = catchAsync(async (req, res, next) => {
  // console.log(req.file);
  // console.log(req.body);

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400,
      ),
    );
  }

  // 2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  // We can now use findByIdAndUpdate since we're not dealing with passwords. The save() is not the best option because passswordConfirm
  // is a required field which we do not need.
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // So that it returns a new object
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

// User will not actually be deleted from the database. Just deactivated
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead.',
  });
};

// For administrator to update all of the user data
// exports.updateUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not implemented yet',
//   });
// };

// exports.deleteUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not implemented yet',
//   });
// };

//With handler factory function
exports.getAllUsers = factory.getAll(User);
exports.getUserById = factory.getOne(User);
// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
