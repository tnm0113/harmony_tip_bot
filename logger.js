import config from "config";
import winston from "winston";

import "winston-daily-rotate-file";

const format = winston.format;
import fs from "fs";

const loggerConfig = config.get("logger");

if (!fs.existsSync(loggerConfig.dir)) {
  fs.mkdirSync(loggerConfig.dir);
}

const dailyRotateFileTransport = new winston.transports.DailyRotateFile({
  filename: loggerConfig.dir + "/tip-bot-%DATE%.log",
  datePattern: "YYYYMMDDHH",
  maxSize: loggerConfig.file.maxSize,
  maxFiles: loggerConfig.file.maxFiles,
});

const logger = winston.createLogger({
  level: loggerConfig.file.level,
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({
      level: loggerConfig.console.level,
      format: format.combine(
        format.colorize(),
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    dailyRotateFileTransport,
  ],
  exitOnError: false, // do not exit on handled exceptions
});

export { logger };
