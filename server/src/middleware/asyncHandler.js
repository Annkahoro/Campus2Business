/**
 * Wraps an async controller so any rejection reaches the central errorHandler.
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
