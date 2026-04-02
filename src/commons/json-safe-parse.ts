type JsonSafeParseResult =
  | {
      success: true;
      data: unknown;
    }
  | {
      success: false;
      error: unknown;
    };

export default function jsonSafeParse(input: string): JsonSafeParseResult {
  try {
    return {
      success: true,
      data: JSON.parse(input),
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
