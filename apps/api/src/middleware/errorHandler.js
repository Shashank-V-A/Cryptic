export function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Unexpected error';

  if (status >= 500) {
    console.error('[api:error]', err);
  }

  res.status(status).json({
    error: {
      code,
      message,
      details: err.details || undefined,
    },
  });
}
