const express = require('express');
const reviewController = require('./../controllers/reviewController');
const authController = require('./../controllers/authController');

//In realworld application to create review for any trip we need to get userid from currently loggedin
//User and tripId from current Trip so our Url is api/trips/:tripId/Review
//so,we need to use nested routes and merge parameter
const router = express.Router({ mergeParams: true });

router.use(authController.protect);
router.route('/')
    .get(reviewController.getAllReviews)
    .post(authController.restrictTo('user'),
        reviewController.setTripUserIds,
        reviewController.createReview);

router.route(':id')
    .get(reviewController.getReview)
    .patch(authController.restrictTo('admin', 'user'),
           reviewController.updateReview)
    .delete(authController.restrictTo('admin', 'user'),
            reviewController.deleteReview);

module.exports = router;