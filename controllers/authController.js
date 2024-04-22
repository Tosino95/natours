const crypto = require('crypto');
const { promisify } = require('util'); // Has built in promisify function
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    // Option of when jwt should expire. After the time passed in here, the token will
    // will no longer be valid even if it otherwise would be correctly verified.
    // this is basically for logging out a user after a certain period of time simply
    // as a security measure
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

// user because that is where the id is stored
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // secure: true, // Cookie will only be sent on an encrypted connection, so https.
    httpOnly: true, // Cookie cannot be accessed or modified in any way by the browser.
    // Prevents cross-site scripting attacks
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  // Sending a cookie
  res.cookie('jwt', token, cookieOptions);

  //Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: { user },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  // console.log(url);
  await new Email(newUser, url).sendWelcome();

  // Non-class way
  // const newUser = await User.create(
  //   req.body,
  // {
  // name: req.body.name,
  // email: req.body.email,
  // password: req.body.password,
  // passwordConfirm: req.body.passwordConfirm,
  // passwordChangedAt: req.body.passwordChangedAt,
  // role: req.body.role,
  //   }
  // );

  // The first thing is the payload, and this is basically an object for all the data
  // that we're going to store inside of the token. Next is the secret.
  // The token header will be created automatically.
  //   const token = signToken(newUser._id);

  //   res.status(201).json({
  //     status: 'success',
  //     token,
  //     data: { user: newUser },
  //   });
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  // When field is not selected, we use plus
  const user = await User.findOne({ email }).select('+password');
  //   console.log(user);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    // httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
};

//Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
  // For the entire rendered website the token will always only be sent using the cookie, and never the authorization header.
  if (req.cookies.jwt) {
    try {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // Each and every pug template will have access to response .locals and whatever we put there will then be a variable
      // inside of these templates.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  // next right away if there is no cookie therefore next right away
  next();
};

// Using the created JSON web token in order to give logged in users access to protected routes.
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and checking if it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    // With this, we're also able to authenticate users based on tokens sent via cookies and not only the authorization header.
    token = req.cookies.jwt;
  }
  //   console.log(token);

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }
  // 2) Verification token
  // The result value of the promise will actually be the decoded data,
  // so the decoded payload from this JSON web token.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //   console.log(decoded);

  // 3) Check if user still exists - in case someone steals their JSON web token and the user
  // has to change their password, so the old token that was issued before the password change
  // should no longer be valid to access protected routes.
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401),
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // GRANT ACCESS to protected routes
  req.user = currentUser; // Putting the entire user data on the request object because request object,
  // is the one that travels basically from middleware to middleware. So, if we want to pass data from one
  // middleware to the next one, then we can simply put some stuff on the request object, for the data to be
  // available at a later point.
  res.locals.user = currentUser;
  next();
});

exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles ['admin', 'lead-guide']. roles='user' - data is coming from protect middleware
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action'),
        403,
      );
    }
    next();
  };

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('No user with that email address', 404));
  }
  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;

    // Without handler
    // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm
    // to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

    // await sendEmail({
    //   email: user.email,
    //   subject: 'Your password reset token (valid for 10 min)',
    //   message,
    // });

    // With handler
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // Checking if the token has not expired. If it has, there will be no user
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(
      new AppError('Password reset token is invalid or has expired', 400),
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user - pre save middleware in userModel takes care of this.
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  // We will already have the current user on our request object coming from our protect middleware above.
  // Then we need to explicitly ask for the password because it is by default not included in the output.
  const user = await User.findById(req.user.id).select('+password');
  // 2) Check if POSTed current password is correct
  // Using correctPassword middleware to compare the current password with user's input for the current password.
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }
  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate will NOT work as intended!

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
