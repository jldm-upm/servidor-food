const winston = require('winston');
const wlog = winston.createLogger({
    level: 'silly',
    // format: winston.format.json(),
    format: winston.format.cli(),
    transports: [
        new winston.transports.Console()
        // new winston.transports.File({ filename: 'logfile.log' })
    ]
});

module.exports = wlog;
