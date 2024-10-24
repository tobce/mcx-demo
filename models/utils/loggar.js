const winston = require('winston');

const loggar = winston.createLogger({
    level: 'silly',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({ level: 'silly', forceConsole: true }),
        new winston.transports.File({ filename: 'server.log' })
    ]
});

module.exports = loggar;