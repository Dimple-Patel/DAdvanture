const mongoose = require('mongoose');
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

const Review = mongoose.model('Review',reviewSchema);
module.exports = Review;