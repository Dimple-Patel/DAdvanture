const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('./../models/bookingModel');
const Trip = require('./../models/tripModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    //get currently booked trip
    const trip = await Trip.findById(req.params.tripId);
    //create checkout session
    const session = await stripe.checkout.session.create({
        payment_method_types: ['card'],
        //on successful payment stripe webhook is used for deployed website but temporary for the
        //testing purpose we send tour,user,price to /my-tours route
        success_url: `${req.protocol}://${req.get('host')}/my-trips/?
                        trip=${req.params.tripId}&user=${req.user.id}&price=${trip.price}`,
        cancel_url: `${req.protocol}://${req.get('host')}/trip/${trip.slug}`,
        customer_email: req.user.email,//stripe use it to send email
        client_reference_id: req.params.tripId,
        //use by stripe to display on dashboard or invoice template
        line_items: [
            {
                name: `${trip.name} Tour`,
                description: trip.summary,
                images: [`https://www.abc.dev/images/trips/${trip.imageCover}`],
                amount: trip.price * 100,
                currency: 'usd',
                quantity: 1
            }
        ]
    });
     //send session in response
    res.status(200).json({
        status: 'success',
        session
    });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
    // This is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
    const { trip, user, price } = req.query;
    if (!tour && !user && !price) return next();
    await Booking.create({ trip, user, price });

    res.redirect(req.originalUrl.split('?')[0]);
});

exports.getAllBookings = factory.getAll(Booking);
exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);