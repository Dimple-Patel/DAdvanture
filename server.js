const mongoose = require('mongoose');
const dotenv = require('dotenv');

//Catch all uncaught exception occur in application 
process.on('uncaughtException', err => {
    console.log('UNCAUGHT EXCEPTION! ?? Shutting down...');
    console.log(err.name, err.message);
    process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

//const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASSWORD);
mongoose.connect(process.env.DB_LOCAL,
                { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
        .then(() =>  console.log('Database connection successful!' ));

//Server start listening on specified port
const port = process.env.PORT || 3000;
const server = app.listen(port, () => { console.log('Application start listening on port 3000'); });

//handle error outside the express such as connection fail or server shut down or any other
process.on('unhandledRejection', err => {
    console.log('UNHANDLED REJECTION! ?? Shutting down...');
    console.log(err.name, err.message);
    //if any unhandled rejection occur then we give some time to our server to close and then close application
    server.close(() => {
        process.exit(1);
    });
});