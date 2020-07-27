const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required:[true,'Booking must belong to trip']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true,'Booking must belong to user']
    },
    price: {
        type: Number,
        required: [true,'Booking must have price ']
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    paid: {
        type: Boolean,
        default:false
    }
});

bookingSchema.pre(/^find/, function (next) {
    this.populate('User').populate({
        path: 'Trip',
        select: 'name'
    });
    next();
});

const Booking = mongoose.model('Booking',bookingSchema);
module.exports = Booking;