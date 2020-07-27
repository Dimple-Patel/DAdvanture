const mongoose = require('mongoose');
const slugify = require('slugify');
const tripSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Trip must have name'],
        unique: true,
        trim: true,
        minlength: [10, 'Tour name must have 10 or more characters'],
        maxlength: [40, 'Tour name must have 40 or less charactes']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'A Trip must have duration']
    },
    destination: String,
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have maximum group size']
    },
    difficulty: {
        type: String,
        required: [true, 'A tour must have difficulty'],
        enum: {
            values: ['easy', 'medium', 'difficult'],
            message: 'Your value must be : easy,medium or difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        defaul: 4.5,
        min: [1, 'Rating must be above 1.0'],
        max: [5, 'Rating must be below or eqaul to 5.0'],
        //allow to execute custom logic when setting properties.it transform user data before it gets into mongodb
        set: val => { Math.round(val * 10) / 10 }// 4.666666, 46.6666, 47, 4.7
    },
    totalRating: {
        type: Number,
        default: 0
    },
    price: Number,
    discountPrice: {
        type: Number,
        validate: {
            validator: function (val) { return val < this.price },
            message:'Discount price must be less then regular price'
            }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'A trip must have summary']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A trip must have a cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    SecretTrip: {
        type: Boolean,
        default: false
    },
    startLocation: {
        type:'Point',
        coordinates: [Number],
        address: String,
        description:String
    },
    locations: [{
        type: 'Point',
        coordinates: [Number],
        address: String,
        description: String,
        day:Number
    }],
    guides: [{
        //define relationship between trip and user model
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
},
    {
        //to include virtuals into output set it to true in toJSON and toObject because mongoose will not include it bydefault
        toObject: { viruals: true },
        toJSON: { virtuals: true }
    });

//Indexes
tripSchema.index({ price: 1, ratingsAverage: -1 });
tripSchema.index({ slug: 1 });
tripSchema.index({ startLocation: '2dsphere' });

//virtuals are document properties that you can get and set but that do not get persisted to MongoDB.
tripSchema.virtuals('durationInWeeks').get(function () { return this.duration / 7; });

//virtual populate:child referencing,we get access to child record without persist array of ids in DB
tripSchema.virtual('reviews', {
    ref: 'Review',
    foreignField:'trip',
    localField:'_id'
}); 

//document middleware called before (.save() and .create()) saving document and store slufied name into this.slug
tripSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

//if guide is array of userId in tour,when each tour save behind the scene we need to retrive user 
//document with ids in guide before save
//tripSchema.pre('save', function (next) {
//    const guidePromises = this.guides.map(async id => await User.findById(id));
//    this.guides = await Promise.all(guidePromises);
//    next();
//});

//sample Post document middleware
//tripSchema.post('save', function (doc, next) {
//    console.log('post document middleware');
//    next();
//});

//AGGREGATION middleware
//call before any aggregation query
//tripSchema.pre('aggregate', function (next) {
//    //Add match stage at the top of any aggregation query
//    this.pipeline().unShift({ $match: { SecretTrip: { $ne: true } } });
//    console.log(this.pipeline());
//    next();
//});

//QUERY middleware
tripSchema.pre(/^find/, function (next) {
    this.find({ SecretTrip: { $ne: true } });
    this.start = Date.now();
    next();
});

tripSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'guides',
        select:'-__v -passwordChangedAt'
    });
    next();
});
tripSchema.post(/^find/, function (docs, next) {
    console.log(`Query took ${Date.now - this.start} milliseconds!`);
    next();
});


const Trip = mongoose.model('Trip', tripSchema);
module.exports = Trip;