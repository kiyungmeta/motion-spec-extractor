// extractors/expressions.jsx
// Capture expression source text from After Effects properties
// No external dependencies

/**
 * Check whether an After Effects property has an active expression.
 *
 * @param {Property} property - The AE property to check.
 * @returns {boolean} true if the property has an enabled, non-empty expression.
 */
function hasExpression(property) {
  try {
    return property.canSetExpression &&
           property.expressionEnabled &&
           property.expression !== "";
  } catch (e) {
    return false;
  }
}

/**
 * Extract the expression source text from an After Effects property.
 * Returns the expression string if the property has an active expression,
 * or null otherwise.
 *
 * @param {Property} property - The AE property to read.
 * @returns {string|null} The expression source text, or null.
 */
function extractExpression(property) {
  try {
    if (property.canSetExpression &&
        property.expressionEnabled &&
        property.expression !== "") {
      return property.expression;
    }
  } catch (e) {
    // Property does not support expressions or is inaccessible
  }
  return null;
}
