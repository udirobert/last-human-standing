/**
 * Request body validators and small helpers used by route modules.
 * Pure functions — no state, no side effects.
 */

export function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function ensureObjectBody(req, res) {
  if (!isObject(req.body)) {
    res.status(400).json({ error: "invalid_json_body" });
    return null;
  }
  return req.body;
}

export function ensureString(value, { field, required = false, maxLength = 500, pattern } = {}) {
  if (value == null || value === "") {
    if (required) throw new Error(`missing_${field}`);
    return null;
  }
  if (typeof value !== "string") throw new Error(`invalid_${field}`);
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error(`missing_${field}`);
  if (trimmed.length > maxLength) throw new Error(`invalid_${field}`);
  if (pattern && !pattern.test(trimmed)) throw new Error(`invalid_${field}`);
  return trimmed;
}

export function ensureNumber(value, {
  field,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  required = false,
  integer = false,
} = {}) {
  if (value == null) {
    if (required) throw new Error(`missing_${field}`);
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) throw new Error(`invalid_${field}`);
  if (integer && !Number.isInteger(value)) throw new Error(`invalid_${field}`);
  if (value < min || value > max) throw new Error(`invalid_${field}`);
  return value;
}

export function ensureBoolean(value, { field } = {}) {
  if (value == null) return false;
  if (typeof value !== "boolean") throw new Error(`invalid_${field}`);
  return value;
}

export function ensureEnum(value, { field, values, required = false } = {}) {
  if (value == null || value === "") {
    if (required) throw new Error(`missing_${field}`);
    return null;
  }
  if (!values.includes(value)) throw new Error(`invalid_${field}`);
  return value;
}

export function ensureIsoDate(value, { field, required = false } = {}) {
  const str = ensureString(value, { field, required, maxLength: 64 });
  if (str == null) return null;
  if (Number.isNaN(Date.parse(str))) throw new Error(`invalid_${field}`);
  return str;
}

export function sendValidationError(res, error) {
  res.status(400).json({ error: error instanceof Error ? error.message : "invalid_request" });
}
