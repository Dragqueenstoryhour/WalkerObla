import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { error } from './response';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const catchAsync = (fn: AsyncHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next); // Pass errors to Express's error handling middleware
  };
};

export const validationErrorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    return error(res, 'Validation failed', 400, err.issues); // Send detailed Zod issues
  }
  next(err); // Pass other errors to the next error handler
};
