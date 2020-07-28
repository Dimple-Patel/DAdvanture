const multer = require('multer');
const sharp = require('sharp');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Trip = require('./../models/tripModel');

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new AppError('Not an image! Please upload only images.', 400), false);
    }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
exports.uploadTripImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount:3 }
]);
// upload.single('image') req.file
// upload.array('images', 5) req.files

exports.resizeTripImages = catchAsync(async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    //Cover image
    req.body.imageCover = `trip-${req.params.id}-${Date.now()}-cover.jpeg`;
    await sharp(req.file.imageCover[0].buffer)
        .resize(1500, 1500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/images/trips/${req.body.imageCover}`);

    //Images
    req.body.images = [];
    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `trip-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;
            await sharp(file.buffer)
                .resize(1500, 1500)
                .toFormat('jpeg')
                .jpeg({ quality: 90 })
                .toFile(`public/images/trips/${filename}`);
            req.body.images.push(filename);
        })
    );
    next();
});

//middleware to get highest rated top 5 trips
//this function prepare querystring by setting req.query and pass it to next middleware getAll
//which return required result
//Example of Aliasing
exports.getTop5RatedTrips = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage';
    req.query.fields = 'name,price,ratingsAverage,summary,destination';
    next();
};

//this is handler function which calculate statistics
//it group trips based on difficulty and calculate total no. of trip,average ratings,minimum, maximum
//and average price for trip in partiucular group
//Example of grouping,matching and aggregation
exports.getTripStats = catchAsync(async (req, res, next) => {
    const stats = await Trip.aggregate([
        //match all document whose ratingAverage >= 4.0
        { $match: { ratingsAverage: { $gte: 4.0 } } },
        {
            //group all document based on difficulty and generate some custom field for each group
            $group: {
                _id: { $toUpper: '$difficulty' },//id on which grouping is required
                numOfTrip: { $sum: 1 },//count total no. of trip in each group
                numOfRatings: { $sum: '$totalRating' },//count total no. of rating for a group
                avgRatings: { $avg: '$ratingsAverage' },//calculate average rating per group
                avgPrice: { $avg: 'price' },//calculate average price per group
                minPrice: { $min: 'price' },//find minimum price
                maxPrice: { $max: 'price' }//find maximum price
            }
        },
        {//sort result based on average price
            $sort: {avgPrice:1}
        },
        {//display only 2 group except whose difficulty is EASY
            $match: { _id: { $ne: 'EASY' } }
        }
    ]);
});

//Example of unwinding and projecting
//this handler is used to get month wise trip plan for particular year.
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;
    const result = await Trip.aggregate([
        //unwind documents on startDates (for example we have 9 trip document and each trip has 3 startdates
        //so after unwind we have total 27 documents instead of 9)  
        { $unwind: '$startDates' },
        {
            //match the document whose startDate belong to provided year only
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {//group result based on month
            $group: {
                _id: { $month: '$startDates' },//use month from startDate for grouping
                noOfTripStarts: { $sum: 1 },//count total no. of trip start in that month
                Trips: { $push: '$name' }//push name of matching trip into array
            }
        },
        {//add new field into result 'month' with the same value as _id
            $addFields: {month:'$_id'}
        },
        {//remove _id field from result
            $project: { _id :0}
        },
        {//sort result in descending order of no. of tripStarts
            $sort: { noOfTripStarts:-1}
        },
        {//display total 12 record in result
            limit:12
        }
    ]);

    res.status(200).json({
        status: 'success',
        data: {
            result  
        }
    });
});

//Find all trips within given distance
exports.getTripsWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    //convert distance as per the unit provided to radians
    //from km or miles to radians
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;
    if (!lat || !lng) {
        return next(new AppError('Please provide latitude and longitude in the format lat,lng.',400));
    }
    const trips = await Trip.find({
        startLocation: {
            $geoWithin: { $centerSphere: [[lng, lat], radius] }
        }
    });
    res.status(200).json({
        status: 'success',
        result: trips.length,
        data: {
            data:trips
        }
    });
});

//find distances of all document from certain point
exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');
    const multiplier= unit === 'mi' ? 0.000621371 : 0.001;
    if (!lat || !lng) {
        return next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
    }
    const distances = await Trip.aggregate([
        {
            $geoNear: {
                near: { type: 'Point', coordinates: [lng * 1, lat * 1] },//The point for which to find the closest documents.
                distanceField: 'distance',//output field name that contain calculated distance
                distanceMultiplier: multiplier//convert radians to mile or km
            }
        },
        {//select distance and name field in output
            $project: {distance:1,name:1}
        }
    ]);
    res.status(200).json({
        status: 'success',
        data: {
            data: distances
        }
    });
});

exports.getAllTrips = factory.getAll(Trip);
exports.createTrip = factory.createOne(Trip);
exports.getTrip = factory.getOne(Trip, {path:'reviews'});
exports.updateTrip = factory.updateOne(Trip);
exports.deleteTrip = factory.deleteOne(Trip);