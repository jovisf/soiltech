import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const isObject = (val: unknown): val is Record<string, any> => // reason: unavoidable any for dynamic object property check
      typeof val === 'object' && val !== null;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        isObject(exceptionResponse) && 'message' in exceptionResponse
          ? exceptionResponse.message
          : exceptionResponse,
      error:
        isObject(exceptionResponse) && 'error' in exceptionResponse
          ? exceptionResponse.error
          : exception.name,
    };

    response.status(status).json(errorResponse);
  }
}
