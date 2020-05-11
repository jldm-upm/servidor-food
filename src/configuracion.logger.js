const LOG_FILE = 'logfile.log';

const winston = require('winston');
const { format } = require('logform');

const alignedWithColorsAndTime = format.combine(
    format.colorize(),
    format.timestamp(),
    // format.align(),
    format.printf(info => `[${info.timestamp}] ${info.level} - - ${info.message}`)
);

const wlog = winston.createLogger({
    level: 'silly',
    // format: format.json(),
    // format: winston.format.cli(),
    format: alignedWithColorsAndTime,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: LOG_FILE })
    ]
});

module.exports = wlog;
