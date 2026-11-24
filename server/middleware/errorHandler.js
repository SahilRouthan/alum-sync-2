export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
  });
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error(`[AlumSync API Error] ${req.method} ${req.originalUrl}:`, err);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: "File too large",
      message: "Uploaded file exceeds the maximum allowed size.",
    });
  }

  return res.status(statusCode).json({
    error: err.message || "Internal server error",
    ...(err.details ? { details: err.details } : {}),
  });
}
