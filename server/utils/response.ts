import { Response } from 'express';

export const success = (res: Response, data: any, status: number = 200) => {
  return res.status(status).json({
    success: true,
    data,
  });
};

export const error = (res: Response, message: string, status: number = 500, details?: any) => {
  return res.status(status).json({
    success: false,
    message,
    details,
  });
};
