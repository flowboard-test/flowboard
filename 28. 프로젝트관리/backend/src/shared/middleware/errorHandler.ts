import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/AppError';

export function errorHandler(
  error: FastifyError | AppError | Error,
  _request: FastifyRequest,
  reply: FastifyReply
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.code,
      message: error.message,
      details: error.details,
    });
  }

  // Zod validation error
  if (error.name === 'ZodError' && 'errors' in error) {
    const zodErrors = (error as any).errors;
    const messages = zodErrors.map((e: any) => e.message).join(', ');
    return reply.status(400).send({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: messages,
      details: zodErrors,
    });
  }

  // Fastify validation error
  if ((error as FastifyError).validation) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'VALIDATION_ERROR',
      message: (error as FastifyError).message,
    });
  }

  // Unknown error
  console.error('Unhandled error:', error);
  return reply.status(500).send({
    statusCode: 500,
    error: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류가 발생했습니다',
  });
}
