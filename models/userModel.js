const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
// Bcrypt is a popular hashing algorithm that will first salt then hash
// our password, in order to make it really strong to protect it
// against bruteforce attacks.
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    select: false, // Preventing pw from being viewed in client
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE!!!
      validator: function (password) {
        return password === this.password;
      },
      message: 'Passwords do not match',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

// The pre-save middleware will ecrypt the password between
// getting the data and saving it to the database.
userSchema.pre('save', async function (next) {
  // Only run this function if password was acutually modified.
  // If the password has not been modified, we'll exit this
  // function and not run any of the other code that's in here
  // and then call the next middleware.
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  // A cost parameter is a measure of how CPU intensive this operation will be.
  // The default value is 10, but it's better to use 12 because computers have
  // become more powerful. The higher the cost, the more CPU intensive this process
  // will be, but the longer it would take to encrpyt pw. Hash() is asynchronous
  this.password = await bcrypt.hash(this.password, 12);

  // Deleting the passwordConfirm field.
  // By this point the password will be encrypted. Setting it to undefined will
  // prevent from being persisted to the database.
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  // If password has not been modified or if the document, the user, is new, return immediately
  if (!this.isModified('password') || this.isNew) return next();

  // Subtracting one second since sometimes the new token is created a bit before the changed password timestamp
  // So putting this passwordChanged one second in the past, will then ensure that the token is always created
  // after the password has been changed.
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//Query middleware to only want to find documents which have the active property set to true.
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// An instance method is basically a method that is gonna be available on all documents
// of a certain collection.
// There's no way of getting back the original password from the encrypted string,
// which is the entire point of actually encrypting a password. So the only way of doing
// it is for the bcrypt package to actually encrypt this password as well for this algorithm,
// and then compare it with the encrypted one. This function will do that.
userSchema.methods.correctPassword = async function (
  candidatePassword, // the candidate password is the original password coming from the user
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp; // ex 100 < 200 -let's say that the token was issued at time 100.
    // but then we changed the password at time 200. This means we changed the password after the token was
    // issued, and so therefore, this is now true.
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // The password reset token should basically be a random string but at the same time, it doesn't need
  // to be as cryptographically strong as the password hash created before. We can just use the very simple,
  // random bytes function from the built-in crypto module.
  const resetToken = crypto.randomBytes(32).toString('hex');

  // Encrypting reset token which would be in the DB and not sent to the user's email address
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken); // Comparing reset token sent to the user's email address
  // with the encrypted token that'll be stored in the DB

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  // Returning the plaintext password reset token because we need to send the unencrypted reset token to the email
  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
