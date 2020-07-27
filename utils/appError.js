class AppError extends Error
{
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'Fail' : 'Error';

        //isOperational set to true for all the error sending using this class to differenciate between 
        //operational(trusted error) and programming (unknown error) 
        //for example user try to create trip without required field it is called operational error
        this.isOperational = true;

        //this.constructor is second argument means when new object of this class is created it will not appear in stack trace 
        //all the frame above this call(upto app.all() at app.js) is part of stack trace except AppError construction
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;