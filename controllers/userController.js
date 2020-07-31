const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

//const multerStorage = multer.diskStorage({
//    destination: (req, file, cb) => { cb(null, 'public/images/users'); },
//    filename: (req, file, cb) => {
//        const ext = file.mimetype.split('/')[1];
//        cb(null, `user-${re.user.id}-${Date.now()}.${ext}`);
//    }
//});

const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image')) {
        //First argument is error ans second is accept/reject
        cb(null, true);
    }
    else {
        cb(new AppError('Not an image! plaese upload image only.', 400), false);
    }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/images/users/${req.file.filename}`);
    next();
});

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
};

//this function is used to filter out object before passing it to update
const filterdObj = (obj, ...allowedFields) => {
    const newObj = {};
    //iterate on each key,value pair and make new object which contain only allowed fields
    Object.keys(obj).forEach((el)=> {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
    });
    return newObj;
};
exports.updateMe = catchAsync(async (req, res, next) => {
        if (req.body.password || req.body.confirmPassword) {
            return next(new AppError('This route is not for password updates.Please use / updateMyPassword.',400));
    }
     //Filtered out unwanted fields names that are not allowed to be updated
    const filterdBody = filterdObj(req.body, 'email', 'name');
    if (req.file) filterdBody.photo = req.file.filename;
    //update user to collection
    const updatedUser = await User.findByIdAndUpdate(req.user._id, filterdBody, {
        new: true,
        runValidators: true
    });
    //set updated user to response
    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
});

//for delete user we do not delete entire user record from collection
//but just mark it as in active
exports.deleteMe = catchAsync(async (req, res, next) => {
    //set active field to false
    await User.findByIdAndUpdate(req.user._id, { active: false });
    res.status(200).json({
        status: 'success',
        data: null
    });
});


exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not defined! Please use /signup instead'
    });
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);