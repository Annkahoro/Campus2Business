/**
 * Every API response uses the shape { success, data?, message?, code? }.
 */
export function sendSuccess(res, data, { status = 200, message } = {}) {
  const body = { success: true };
  if (data !== undefined) body.data = data;
  if (message) body.message = message;
  return res.status(status).json(body);
}

export function sendCreated(res, data, message) {
  return sendSuccess(res, data, { status: 201, message });
}

export function sendError(res, { status = 500, code = 'INTERNAL_ERROR', message, details }) {
  const body = { success: false, code };
  if (message) body.message = message;
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}
