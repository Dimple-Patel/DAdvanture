const debug = require('debug');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const userRouter = require('./routes/userRoutes');
const tripRouter = require('./routes/tripRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingrouter = require('./routes/bookingRoutes');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));

//serving static files
app.use(express.static(path.join(__dirname, 'public')));


//prevent too many request from same IP to prevent from bruteforce attack
//so implement ratelimiter which count no. of request from particular IP and when its too many,it just block it
const limiter = rateLimit({
    max: 100, //limit each IP to 100 request per windowMs
    windowMs: 60 * 60 * 1000,//60 minute
    message:'Too many request from this IP,please try again after hour'
});
app.use('/api', limiter);

//use helmet which is colllection of multiple middlwares to set security HTTP headers
app.use(helmet());


//Body parser parse data from body into req.body
//parse incoming request with JSON payload
//limit Controls the maximum request body size
app.use(express.json({ limit: '10kb' }));
app.use(bodyParser.urlencoded({ extended: true, limit:'10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
    hpp({
        whitelist: [
            'duration',
            'ratingsQuantity',
            'ratingsAverage',
            'maxGroupSize',
            'difficulty',
            'price'
        ]
    })
);

//mounting routers to the route
app.use('/api/users', userRouter);
app.use('/api/trips', tripRouter);
app.use('/api/reciews', reviewRouter);
app.use('/api/bookings', bookingrouter);

app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});
app.use(globalErrorHandler);
//export app module
module.exports = app;