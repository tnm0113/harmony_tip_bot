import { pino } from "pino";

const logger = pino(
  {
    prettyPrint: {
      colorize: false,
      levelFirst: true,
      translateTime: "yyyy-dd-mm, h:MM:ss TT",
    },
  },
  pino.destination("./log/app.log")
);

export { logger };
