/**
 * requestLogger.js
 * Express middleware that logs every incoming API request with:
 *   - HTTP method (color-coded by status)
 *   - Route URL
 *   - Response status code
 *   - Time taken to complete (in ms)
 */

const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Fire after the response is fully sent
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;

    // Color-code console output by HTTP status
    const color =
      status >= 500 ? "\x1b[31m"   // red    — server errors
      : status >= 400 ? "\x1b[33m" // yellow — client errors
      : status >= 300 ? "\x1b[36m" // cyan   — redirects
      : "\x1b[32m";                // green  — success

    const reset = "\x1b[0m";
    const dim   = "\x1b[2m";

    // Pad method name for aligned columns
    const method = req.method.padEnd(7);

    // Emoji hint for slow responses
    const timing =
      ms < 300  ? `${ms}ms`
      : ms < 1000 ? `⚠️  ${ms}ms`
      : `🐢 ${ms}ms`;

    console.log(
      `${color}[${method}]${reset} ${dim}${req.originalUrl}${reset}` +
      `  →  ${color}${status}${reset}  ${dim}${timing}${reset}`
    );
  });

  next();
};

export default requestLogger;
