const express = require('express');
const reviewRouter = require('./reviewRoutes');
const tripController = require('./../controllers/tripController');
const authController = require('./../controllers/authController');

const router = express.Router();
// POST api/trips/234fad4/reviews
// GET api/trips/234fad4/reviews
router.use('/:tripId/reviews', reviewRouter);

router.get('/top5-rated-trips', tripController.getTop5RatedTrips, tripController.getAllTrips);
router.get('/trip-stats', tripController.getTripStats);
router.get('/monthly-plan/:year', authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tripController.getMonthlyPlan);

//Two possible way for url 
// api/trips/trips-within?distance=233&center=-40,45&unit=mi
// api/trips/trips-within/233/center/-40,45/unit/mi
router.get('/trips-within/:distance/center/:latlng/unit/:unit', tripController.getTripsWithin);
router.get('/distances/:latlng/unit/:unit', tripController.getDistances);

router.route('/')
    .get(tripController.getAllTrips)
    .post(authController.protect,
          authController.restrictTo('admin', 'lead-guide'),
          tripController.createTrip);

router.route('/:id')
    .get(tripController.getTrip)
    .patch(authController.protect,
           authController.restrictTo('admin', 'lead-guide'),
           tripController.uploadTripImages,
           tripController.resizeTripImages,
           tripController.updateTrip)
    .delete(authController.protect,
            authController.restrictTo('admin', 'lead-guide'),
            tripController.deleteTrip);

module.exports = router;