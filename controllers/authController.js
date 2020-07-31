const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const User = require('./../models/userModel');
const Email = require('./../utils/email');
const crypto = require('crypto');

const createAndSendToken = (user, statusCode, res) => {
    const id = user._id;
    //generate signature using header payload and secret key.set expiry time to 90 days
    const token = jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });

    const cookieOptions = {
        //set cookie expiry to 90 days
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        //the cookie to be accessible only by the web server
        httpOnly: true
    };
    //for production environment Marks the cookie to be used with HTTPS only.
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    //set cookie in response with name 'jwt' and value contain jwt token
    res.cookie('jwt', token, cookieOptions);

    //password not show in output
    user.password = undefined;

    //store jwt token and user in response
    res.status(statusCode).json({
        status: 'success',
        token,
        data: {user}
    });
};

//function to privide signing up user functionality
exports.signUp = catchAsync(async (req, res, next) => {
    //create new user
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword
    });

    const url = `${req.protocol}://${req.get('host')}/me`;
    console.log(url);
    //await new Email(newUser, url).sendWelcome();

    //create and send new jwt token and user
    createAndSendToken(newUser, 201, res);
});

//login function
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    //Check if email and password exist
    if (!email || !password) {
        return next(new AppError('Please provide email id and password',400));
    }

    //Check if user exists
    const user = await User.findOne({ email }).select('password');

    //if user not exist or password is incorrect,send error
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError('Incorrect email or password',401));
    }

    //If everything ok, send token to client
    createAndSendToken(user, 200, res);
});

//function for log out
exports.logout = (req, res) => {
    //set jwt cookie valu to 'loggedOut' 
    res.cookie('jwt', 'loggedOut', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });

    res.status(200).json({ status: 'success' });
};

//middleware to provide protected data acess
exports.protect = catchAsync(async (req, res, next) => {
    //1) Getting token and check if it's there
    //authorization header contain value "Bearer <jwt token>"
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
     //if request does not conatin token, generate error 
    if (!token) {
        return next(new AppError('you are not loggedin please log in to access data',401));
    }

    //2) verify token
    //jwt.varify function synchroneously verify given token using secret key to get decoded token
    //promosify return promise which contain either result or error after execution of jwt.vwrify
    const decodedTokenData = await promisify(jwt.verify)(token, process.env.SECRET_KEY);

    //3) check if user still exist
    //It is possible that token exist on client but in meantime user has been deleted from DB
    const currentUser = await User.findById(decodedTokenData.id);
    if (!currentUser) {
        return next(new AppError('The user belonging to this token does no longer exist.',401));
    }

    //4) check if password change after token was issued
    if (currentUser.passwordChangedAfter(decodedTokenData.iat)) {
        return next(new AppError('User recently changed password please login again', 401));
    }

    //Grant acccess to protected route
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
});

//one middleware is require to match currect user role with authorized roles but middleware does not take
//arguments do we need to define function which return middleware
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        //this functin is called after protect middleware so we have user in request object
        //check if current user role match with roles passed as an argument
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to access data', 403));
        }
        next();
    };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
    //1) get user for provided email
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
        return next(new AppError('There is no user with email address', 404));
    }

    //2) generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    //3)send mail
    try {
        const resetUrl = `${req.protocol}://${req.get('host')}/api/users/resetPassword/${resetToken}`;
        await new Email(user, resetUrl).sendPasswordReset();
        res.status(200).json({
            status: 'success',
            message: 'Token sent in Email'
        });
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        console.log(err);
        return next(new AppError('There was an error sending the email. Try again later!',500));
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //generate hash code for reset token
    const hashedToken = crypto.createHash('sha256').update(req.params.resetToken).digest('hex');

    //find user from database with given resetToken and Token expiry time is greater then current time
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
        return next(new AppError('Password reset token is expire, Please try again later',400));
    }

    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // 3) Update changedPasswordAt property for the user
    await user.save();

    // 4) Log the user in, send JWT
    createAndSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
    //get user from collection
    //this is called after protect middleware so it has req.user
    const user = await User.findById(req.user._id).select('password');
    //check if posted current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return next(new AppError('Your password is wrong', 401));
    }

    //save chaged password to collection
    user.password = req.body.password;
    user.confirmPassword = req.body.confirmPassword;
    //User.findByIdAndUpdate will NOT work as intended! because if we use findByIdAndUpdate
    //password encryption and confirm password validation will not work
    await user.save();

    // 4) Log user in, send JWT
    createAndSendToken(user, 200, res);
});

exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try {
            //1) verify token
            const decodedTokenData = await promisify(jwt.verify)(req.cookies.jwt, process.env.SECRET_KEY);

            // 2) Check if user still exists
            const currentUser = await User.findById(decodedTokenData.id);
            if (!currentUser) {
                return next();
            }

            //3) Check if user changed password after the token was issued
            if (currentUser.passwordChangedAfter(decodedTokenData.iat)) {
                return next();
            }

            res.locals.user = currentUser;
            return next();
        }
        catch (err) {
            return next();
        }
    }
    next();
};