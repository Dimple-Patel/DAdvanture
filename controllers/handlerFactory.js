const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const ApiFeature = require('./../utils/apiFeatures');

//general function to get all document from any collection and provide
//Filter,sorting,paging,field limitation functionality
exports.getAll = model =>
    catchAsync(async (req, res, next) => {
        //To allow for nested GET reviews on trip (hack)
        let filter = {};
        if (req.params.tripId)
            filter = { trip: req.params.tripId };

        //get query after applying filter,sorting,pagination and limit field if
        //any operation requested through query string
        const features = new ApiFeature(model.find(filter), req.query)
            .filter()
            .sort()
            .limitFields()
            .paginate();
        //execute query
        const docs = await features.query;
        //generate error if record not found
        if (!docs) {
            return next(new AppError('Records not found', 400));
        }
        //store result into response
        res.status(200).json({
            status: 'success',
            results: docs.length,
            data: {
                data:docs
            }
        });
});

//general function to get single document from any collection from DB.
//it takes two argument mongoose model and populate options
exports.getOne = (model,popOptions) =>
    catchAsync(async (req, res, next) => {
        let query = model.findById(req.params.id);
        //check if popoptions provided as argument,yes then append populate to the findById query 
        if (popOptions)
            query = query.populate(popOptions);

        //execute query
        const doc = await query;
        //generate error if no record found with that id
        if (!doc) {
            return next(new AppError('No document found with that id', 404));
        }
        //no error,store result into response
        res.status(200).json({
            status: 'success',
            data: {
                data: doc
            }
        });
    });

//general function to create document in any collection
exports.createOne = model =>
    catchAsync(async (req, res, next) => {
        //create document with values provided in req.body
        const doc = await model.create(req.body);
        //store new record to response
        res.status(201).json({
            status: 'success',
            data: {
                data:doc
            }
        });
});

//general function to update document in any collection of DB
//it takes mongoose model as argument and return updated document on success or error if fail
exports.updateOne = model =>
    catchAsync(async (req, res, next) => {
        //find document with given id and update values with provided by req.body
        const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
            new: true, // gives object after update was applied
            runValidators: true //run update validators to validate update operation against model's schema
        });

        //generate error if no record found with given id
        if (!doc) {
            return next(new AppError('No document found with that id', 404));
        }
        //no error, store updated document in response
        res.status(200).json({
            status: 'success',
            data: {
                data:doc
            }
        });
    });

//general function to delete document from collection
exports.deleteOne = model =>
    catchAsync(async (req, res, next) => {
        const doc = await model.findByIdAndDelete(req.params.id);

        if (!doc) {
            return next(new AppError('No document foundweith that id',404));
        }

        res.status(204).json({
            status: 'success',
            data: null
        });
});