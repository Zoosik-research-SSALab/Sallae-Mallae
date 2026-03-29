type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

export function toCamelCaseKey(value: string) {
  return value.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function toSnakeCaseKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export function camelizeKeys<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeKeys(item)) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, JsonValue> = {};

    Object.entries(value).forEach(([key, nestedValue]) => {
      result[toCamelCaseKey(key)] = camelizeKeys<JsonValue>(nestedValue);
    });

    return result as T;
  }

  return value as T;
}

export function snakelizeKeys<T>(value: unknown): T {
  if (Array.isArray(value)) {
    return value.map((item) => snakelizeKeys(item)) as T;
  }

  if (isPlainObject(value)) {
    const result: Record<string, JsonValue> = {};

    Object.entries(value).forEach(([key, nestedValue]) => {
      result[toSnakeCaseKey(key)] = snakelizeKeys<JsonValue>(nestedValue);
    });

    return result as T;
  }

  return value as T;
}
