/**
 * Request Timeout and Client Disconnect Handling Middleware
 *
 * Prevents requests from hanging indefinitely or exhausting Node.js sockets.
 * Default timeout: 30 seconds (configurable via REQUEST_TIMEOUT_MS).
 * Render's edge gateway timeout is 100 seconds; an application-level timeout of 30 seconds
 * guarantees requests fail fast and cleanly with structured JSON before the gateway times out.
 */

export const requestTimeout = (defaultTimeoutMs = 30000) => {
  const configuredTimeout = Number(process.env.REQUEST_TIMEOUT_MS) || defaultTimeoutMs;

  return (req, res, next) => {
    let isTimedOut = false;

    const timer = setTimeout(() => {
      isTimedOut = true;
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          message: 'Gateway Timeout: Request processing exceeded permitted time limit.',
        });
      }
    }, configuredTimeout);

    // Prevent timer from keeping Node process alive in tests
    if (timer.unref) {
      timer.unref();
    }

    // Clean up timer when response finishes or connection closes
    const cleanup = () => {
      clearTimeout(timer);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    // Handle client disconnect early
    req.on('close', () => {
      if (!res.writableEnded) {
        clearTimeout(timer);
      }
    });

    next();
  };
};

