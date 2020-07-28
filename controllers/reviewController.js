const Review = require('./../models/reviewModel');
const factory = require('./handlerFactory');

//middleware to set tour and user ids into req.body before createReview
exports.setTourUserIds = (req, res, next) => {
    //Allow nested routes
    if (!req.body.trip) req.body.trip = req.params.tripId;
    if (!req.body.user) req.body.user = req.user.id;
    next();
};
exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.getReview = factory.getOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
