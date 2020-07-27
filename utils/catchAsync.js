//Errors that occur in synchronous code inside route handlers and middleware require no extra work.
//If synchronous code throws an error, then Express will catch and process it.
//but for asynchronous code we must need to pass them to next() function where express will catch and process it

//use this promise to avoid overhead of try..catch block and it will automatically catch both synchronous errors and rejected promises, 
//by providing next as the final catch handler and Express will catch errors, because the catch handler is given the error as the first argument
module.exports = fn => {
    return (req, res, next) = fn(req, res, next).catch(err);
};