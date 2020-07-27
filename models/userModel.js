const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,'Please tell us your name']
    },
    email: {
        type: String,
        unique: true,
        lowercase: true,
        required: [true, 'Please provide your email'],
        validate: [validator.isEmail,'Please provide valid email']
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'guide', 'lead-guide'],
        default: 'user'
    },
    active: {
        type: Boolean,
        default: true,
        select: false
    },
    photo: {
        type: String,
        default:'default.jpg'
    },
    password: {
        type: String,
        required: [true, 'Please provide password'],
        minlength: 8,
        select:false
    },
    confirmPassword: {
        type: String,
        required: [true, 'Please provide Confirm password'],
        validate: {
            //this is only work for Create and Save
            validator: function (el) { return el === this.password },
            message:'Passwords are not same'
        }
    },
    passwordChangedAt: Date,//use while provide protected access to data
    passwordResetToken: String,//use for forgot password
    passwordResetExpires:Date//use for forgot passwordte
});

//this middleware generate hash of password before saving it to database
userSchema.pre('save', async function (next) {
    //run this function only if password is actually modified
    if (!this.isModified('password')) return next();

    //Hash the password with 12 salting round
    this.password = await bcrypt.hash(this.password, 12);

    // Delete confirmPassword field
    this.confirmPassword = undefined;
    next();
});

//this middleware is used to set passwordChangedAt field
userSchema.pre('save', function (next) {
    //run this function only if password is modified for existing user
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});

//this query middleware is called before any find query and search only active users
userSchema.pre(/^find/, function (next) {
    //here this point to current query
    this.find({ active: { $ne: false } });
    next();
});

//this instance method is used to compare user entered password with password stored in database
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

//this method is used to check if password is changes after JWT was issued
userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
     //passwordChangedAt contain date and time when password was changed by the user
    if (this.passwordChangedAt) {
        //get timestamp from dateTime 
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    //false means password not change
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    //generate random hex string using crypto package
    const resetToken = crypto.randomBytes(32).toString('hex');
    //generate hash code of random  hex string and store in passwordresettoken
    this.passwordResetToken = crypto.createHash('sha256')
        .update(resetToken)
        .digest('hex');
    //set 10 min expire time for reset token
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    //return reset token
    return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;