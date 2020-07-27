const AppError = require('./../utils/appError');

const sendDevlopmentError = (err,req, res) => {
    //A) API
    if (req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err,
            stack:err.stack
        });
    }

    //B) Rendered Website
    console.log('ERROR', err);
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        msg: err.message
    });
};

const sendProductionError = (err, req, res) => {
    //A) API
    if (req.originalUrl.startsWith('/api')) {
        //1) operational or trusted error
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }

        //2) programming or unknown errors:Don't leak error detail
        //Log error
        console.error('Error', err);
        //return generic message
        return res.status(500).json({
            status: 'error',
            message:'Something went wrong!'
        });
    }

    //B) Rendered website
    //1) operational or trusted errors:send message to client 
    if (err.isOperational) {
        console.log(err);
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong!',
            message: err.message
        });
    }

    //2)programming or unknown errors:don't leak error detail
    //Log error
    console.error('error', err);
    //send generic message to client
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong!',
        message: 'Try again Later'
    });
};

//this function generate AppError for casting Error i.e., provide number in name field
const handleCastError = err => {
    const message = `Invalid ${err.path}:${err.value}`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = err => {
    const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
    // console.log(value);
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};
const handleValidationError = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError(`Invalid input data. ${errors.join('. ')}`, 400);
};
const handleJWTError = () => {
    return new AppError('Invalid token. Please log in again!', 401);
};
const handleJWTExpiredError = () => {
    return new AppError('Your token has expired! Please log in again.', 401);
}

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendDevlopmentError(err, req, res);
    }
    else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message;
        if (err.name === 'CastError') error = handleCastError(error);
        if (err.code === 11000) error = handleDuplicateFieldsDB(error);
        if (err.name === 'ValidationError') error = handleValidationError(error);
        if (err.name === 'JsonWebTokenError') error = handleJWTError(error);
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError(error);
        sendProductionError(error,req.res);
    }
};