// extractors/text.jsx
// Extract text layer properties and text animators
// Depends on: extractAnimatedProperty (from keyframe.jsx, assumed globally available)

/**
 * Convert an After Effects color array (0-1 floats) to an [r, g, b]
 * array with values rounded to four decimal places for readability.
 *
 * @param {Array} color - AE color array, typically [r, g, b] or [r, g, b, a].
 * @returns {Array} Array of rounded color component values [r, g, b].
 */
function arrayFromColor(color) {
  var result = [];
  var i, len;

  if (!color) {
    return [0, 0, 0];
  }

  // Use at most 3 channels (r, g, b); ignore alpha if present
  len = color.length;
  if (len > 3) {
    len = 3;
  }

  for (i = 0; i < len; i++) {
    result.push(Math.round(color[i] * 10000) / 10000);
  }

  return result;
}

/**
 * Extract data from a single text animator, including its properties
 * and selector.
 *
 * @param {PropertyGroup} animator - An AE text animator property group.
 * @param {number} frameRate - Composition frame rate for time conversions.
 * @returns {Object} Animator data object with name, properties, and selector.
 */
function extractTextAnimator(animator, frameRate) {
  var animData = {
    name: animator.name,
    properties: [],
    selector: null
  };
  var props, selectors, sel, j, p;

  // Extract animator properties (position, scale, opacity, tracking, etc.)
  try {
    props = animator.property("ADBE Text Animator Properties");
    if (props) {
      for (j = 1; j <= props.numProperties; j++) {
        try {
          p = props.property(j);
          if (p.canSetExpression || p.numKeys > 0 || p.isModified) {
            animData.properties.push(extractAnimatedProperty(p, frameRate));
          }
        } catch (e) {
          // Skip inaccessible animator properties
        }
      }
    }
  } catch (e) {
    // Animator properties group inaccessible
  }

  // Extract selector
  try {
    selectors = animator.property("ADBE Text Selectors");
    if (selectors && selectors.numProperties > 0) {
      sel = selectors.property(1); // first selector
      try {
        animData.selector = {
          start: extractAnimatedProperty(sel.property("ADBE Text Selector Start"), frameRate),
          end: extractAnimatedProperty(sel.property("ADBE Text Selector End"), frameRate),
          offset: extractAnimatedProperty(sel.property("ADBE Text Selector Offset"), frameRate),
          type: sel.matchName
        };
      } catch (e) {
        // Selector property access failed
      }
    }
  } catch (e) {
    // Selectors group inaccessible
  }

  return animData;
}

/**
 * Extract text data from a text layer, including source text, font info,
 * and text animators.
 *
 * @param {Layer} textLayer - An After Effects text layer.
 * @param {number} frameRate - Composition frame rate for time conversions.
 * @returns {Object|null} Text data object, or null if the layer has no
 *   text properties.
 */
function extractTextData(textLayer, frameRate) {
  var textProp, sourceText, result, textDoc, animators, i;

  try {
    textProp = textLayer.property("ADBE Text Properties");
  } catch (e) {
    return null;
  }

  if (!textProp) {
    return null;
  }

  sourceText = textProp.property("ADBE Text Document");
  result = {
    sourceText: extractAnimatedProperty(sourceText, frameRate)
  };

  // Get text document value for font info
  try {
    textDoc = sourceText.value;
    result.font = textDoc.font;
    result.fontSize = textDoc.fontSize;
    result.fillColor = arrayFromColor(textDoc.fillColor);
    if (textDoc.applyStroke) {
      result.strokeColor = arrayFromColor(textDoc.strokeColor);
      result.strokeWidth = textDoc.strokeWidth;
    }
    result.tracking = textDoc.tracking;
    result.leading = textDoc.leading;
    result.justification = textDoc.justification.toString();
  } catch (e) {
    // Text document value may not be readable in all cases
  }

  // Extract text animators
  result.animators = [];
  try {
    animators = textProp.property("ADBE Text Animators");
    if (animators) {
      for (i = 1; i <= animators.numProperties; i++) {
        try {
          result.animators.push(extractTextAnimator(animators.property(i), frameRate));
        } catch (e) {
          // Skip inaccessible animators
        }
      }
    }
  } catch (e) {
    // Animators group inaccessible
  }

  return result;
}
