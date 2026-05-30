import cors from 'cors';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { setupSwagger } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { apiRouter } from './routes';

export const app = express();

app.use(helmet());
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = buf;
    },
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    })
  );
}

app.use('/api', apiRouter);

if (process.env.NODE_ENV !== 'test') {
  setupSwagger(app);
}

app.use(notFound);
app.use(errorHandler);
