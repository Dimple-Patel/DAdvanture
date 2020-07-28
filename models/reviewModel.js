const mongoose = require('mongoose');
const Trip = require('./tripModel');
const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true,'Review cannot be empty!']
    },
    rating: {
        type: Number,
        min: 1,
        max:5
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'Trip'
    }
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals:true }
    });

//Index
//prevent duplicate review by same user on same
reviewSchema.index({ trip: 1, user: 1 }, { unique: true });

//Find query middleware for populating trip and user
reviewSchema.pre(/^find/, function (next) {
    this.populate({ path: 'trip', select: 'name' })
        .populate({ path: 'user', select: 'name photo' });
    next();
});

//static method to calculate total no. of review and average for particular trip
//and set calculated value in trip document
reviewSchema.statics.calcRatingsAverage = async function (tripId) {
    const result = await this.aggregate([
        { $match: { tour: tripId } },
        {
            $group: {
                _id: '$tour',
                numRating: { $sum: 1 },
                avgRating: { $avg:'$rating'}
            }
        }
    ]);

    if (result.length > 0) {
        await Trip.findByIdAndUpdate(tripId, {
            ratingsAverage: result[0].avgRating,
            totalRating: result[0].numRating
        });
    }
    else {
        await Trip.findByIdAndUpdate(tripId, {
            ratingsAverage: 4.5,
            totalRating: 0
        });
    }
};
//calculate total rating and average on create of new review
reviewSchema.post('save', function () {
    //To call static method we use model name but at this point model is not generated so,
    //we use this.constructor instead of model name
    this.constructor.calcRatingsAverage(this.trip);
});

//mongoose translate FindByIdAndUpdate, findByIdAndDelete into findOneAndDelete, findOneAndUpdate

//same as creation of review we need to calculate rating average on update and delete of review
//but update and delete will happen using findByIdAndDelete or findByIdAndUpdate method so we need to 
//callmethod from query middleware instead of document middleware
reviewSchema.pre(/^findOneAnd/, async function (next) {
    this.r = await findOne();
    next();
});
reviewSchema.post(/^findOneAnd/, async function () {
    //this.r pointing to current review document
    //await this.findOne(); does NOT work here, query has already executed
    await this.r.constructor.calcRatingsAverage(this.r.trip);
});

const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;