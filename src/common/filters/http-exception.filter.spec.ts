import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { Request, Response } from 'express';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/test-url',
    };
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnThis(),
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn().mockReturnValue(mockRequest),
    };
  });

  it('should format HttpException correctly', () => {
    const status = HttpStatus.BAD_REQUEST;
    const message = 'Bad Request Message';
    const exception = new HttpException(message, status);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(status);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        message: message,
        error: 'HttpException',
        path: '/test-url',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should format HttpException with object response correctly', () => {
    const status = HttpStatus.FORBIDDEN;
    const exceptionResponse = {
      message: 'Forbidden Message',
      error: 'Forbidden Error',
    };
    const exception = new HttpException(exceptionResponse, status);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(status);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        message: exceptionResponse.message,
        error: exceptionResponse.error,
        path: '/test-url',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle HttpException without error property in response object', () => {
    const status = HttpStatus.NOT_FOUND;
    const exceptionResponse = {
      message: 'Not Found Message',
    };
    const exception = new HttpException(exceptionResponse, status);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(status);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: status,
        message: exceptionResponse.message,
        error: 'HttpException',
        path: '/test-url',
        timestamp: expect.any(String),
      }),
    );
  });
});
