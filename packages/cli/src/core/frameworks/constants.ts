/**
 * Keywords that indicate a variable is sensitive and must not be exposed to
 * the browser (e.g. a public-prefixed variable containing one of these).
 */
export const SENSITIVE_KEYWORDS_PATTERN = /SECRET|PRIVATE|PASSWORD/;
