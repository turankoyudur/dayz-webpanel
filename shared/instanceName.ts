/**
 * Instance (server) name validation.
 *
 * Why this exists:
 * - We use the instance name as an identifier in URLs, logs and (later) as a folder name.
 * - Windows has strict filename rules and reserved device names.
 * - To avoid random runtime issues, we enforce a safe allowlist.
 *
 * Rules (safe & portable):
 * - 1..32 characters
 * - Allowed: letters, numbers, underscore (_), hyphen (-)
 * - No spaces, dots, slashes, or other special characters
 * - Disallow Windows reserved device names (CON, PRN, AUX, NUL, COM1..COM9, LPT1..LPT9)
 */

export const INSTANCE_NAME_MAX_LEN = 32;

/**
 * Allowlist regex.
 * - Start: letter or number
 * - Middle/end: letter/number/_/-
 */
export const INSTANCE_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const RESERVED_DEVICE_NAMES = new Set(
  [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
    ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
  ].map((n) => n.toUpperCase()),
);

export type InstanceNameValidationResult =
  | { ok: true; normalized: string }
  | {
      ok: false;
      code:
        | "EMPTY"
        | "TOO_LONG"
        | "INVALID_CHARS"
        | "RESERVED_NAME";
      message: string;
    };

/**
 * Validates and normalizes an instance name.
 *
 * Normalization:
 * - trim whitespace
 * - keep original case (we only validate). You can `.toLowerCase()` at call sites if desired.
 */
export function validateInstanceName(raw: string): InstanceNameValidationResult {
  const normalized = (raw ?? "").trim();

  if (!normalized) {
    return {
      ok: false,
      code: "EMPTY",
      message: "Instance name is required.",
    };
  }

  if (normalized.length > INSTANCE_NAME_MAX_LEN) {
    return {
      ok: false,
      code: "TOO_LONG",
      message: `Instance name is too long (max ${INSTANCE_NAME_MAX_LEN}).`,
    };
  }

  if (!INSTANCE_NAME_REGEX.test(normalized)) {
    return {
      ok: false,
      code: "INVALID_CHARS",
      message: "Only letters, numbers, '_' and '-' are allowed (no spaces or special characters).",
    };
  }

  const upper = normalized.toUpperCase();
  if (RESERVED_DEVICE_NAMES.has(upper)) {
    return {
      ok: false,
      code: "RESERVED_NAME",
      message: "This name is reserved by Windows. Please choose another name.",
    };
  }

  return { ok: true, normalized };
}
