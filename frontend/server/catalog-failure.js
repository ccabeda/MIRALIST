export function catalogFailure(error, provider) {
  if (['TimeoutError', 'AbortError'].includes(error.name))
    return { status: 504, error: `${provider}_TIMEOUT` };
  if (error instanceof SyntaxError) return { status: 502, error: `${provider}_INVALID_RESPONSE` };
  return { status: 502, error: `${provider}_CONNECTION_FAILED` };
}
