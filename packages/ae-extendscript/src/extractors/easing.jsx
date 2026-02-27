// extractors/easing.jsx
// Convert After Effects speed/influence easing to CSS cubic-bezier values.
// No dependencies. Pure ES3.

/**
 * Map an AE KeyframeInterpolationType enum value to a human-readable string.
 *
 * Known enum codes (ExtendScript reports the raw integer):
 *   6612 = LINEAR
 *   6613 = BEZIER
 *   6614 = HOLD
 *
 * @param {*} type - KeyframeInterpolationType enum value.
 * @returns {string} "LINEAR", "BEZIER", "HOLD", or the raw string.
 */
function interpolationTypeToString(type) {
  var code = Number(type);
  if (code === 6612) {
    return "LINEAR";
  }
  if (code === 6613) {
    return "BEZIER";
  }
  if (code === 6614) {
    return "HOLD";
  }
  // Fallback: try the enum-member names exposed by ExtendScript
  if (type === KeyframeInterpolationType.LINEAR) {
    return "LINEAR";
  }
  if (type === KeyframeInterpolationType.BEZIER) {
    return "BEZIER";
  }
  if (type === KeyframeInterpolationType.HOLD) {
    return "HOLD";
  }
  return String(type);
}

/**
 * Find the dimension index with the largest absolute value change.
 * Falls back to 0 if values are scalar or no change is detected.
 *
 * @param {*} startValue
 * @param {*} endValue
 * @returns {Object} { dimIndex, valueChange }
 */
function findBestDimension(startValue, endValue) {
  var bestDim = 0;
  var bestChange = 0;
  var i, dimChange;

  if (typeof startValue === "number" && typeof endValue === "number") {
    return { dimIndex: 0, valueChange: endValue - startValue };
  }

  if (startValue instanceof Array && endValue instanceof Array) {
    var len = Math.min(startValue.length, endValue.length);
    for (i = 0; i < len; i++) {
      dimChange = Math.abs(endValue[i] - startValue[i]);
      if (dimChange > Math.abs(bestChange)) {
        bestChange = endValue[i] - startValue[i];
        bestDim = i;
      }
    }
    return { dimIndex: bestDim, valueChange: bestChange };
  }

  return { dimIndex: 0, valueChange: 0 };
}

/**
 * Convert AE temporal easing (speed / influence) to a CSS cubic-bezier
 * approximation *without* knowing the value change between keyframes.
 *
 * This is the simplified fallback -- use convertEasingWithValues when start
 * and end values are available for accurate results.
 *
 * @param {Array} outEase      - keyOutTemporalEase of the current keyframe.
 * @param {Array} inEaseNext   - keyInTemporalEase  of the next keyframe.
 * @param {number} duration    - Time (seconds) between the two keyframes.
 * @returns {Object} {x1, y1, x2, y2, css}
 */
function convertEasingToCubicBezier(outEase, inEaseNext, duration) {
  var outSpeed = outEase[0].speed;
  var outInfluence = outEase[0].influence / 100;
  var inSpeed = inEaseNext[0].speed;
  var inInfluence = inEaseNext[0].influence / 100;

  var x1 = outInfluence;
  var x2 = 1 - inInfluence;
  var y1, y2;

  if (outSpeed === 0) {
    y1 = 0;
  } else {
    y1 = x1; // Assume linear ratio when value change is unknown
  }

  if (inSpeed === 0) {
    y2 = 1;
  } else {
    y2 = x2; // Assume linear ratio when value change is unknown
  }

  // Clamp x values to [0, 1] (required by CSS spec)
  x1 = Math.max(0, Math.min(1, x1));
  x2 = Math.max(0, Math.min(1, x2));

  // Round to 4 decimal places
  x1 = Math.round(x1 * 10000) / 10000;
  y1 = Math.round(y1 * 10000) / 10000;
  x2 = Math.round(x2 * 10000) / 10000;
  y2 = Math.round(y2 * 10000) / 10000;

  return {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    css: "cubic-bezier(" + x1 + ", " + y1 + ", " + x2 + ", " + y2 + ")"
  };
}

/**
 * Convert AE temporal easing to CSS cubic-bezier using full value information.
 *
 * This is the accurate form that takes the actual start/end values of the
 * animated property into account so that the Hermite-to-Bezier conversion
 * is mathematically correct.
 *
 * Key fix: for multi-dimensional properties (e.g. Position [x,y]), the
 * function finds the dimension with the largest value change and uses
 * that dimension's speed/influence for the conversion. This prevents
 * returning linear when only one axis changes (e.g. Y bounces but X
 * stays constant).
 *
 * Derivation
 * ----------
 * Given segment duration D and value change dV = endValue - startValue:
 *
 *   linearSpeed = |dV| / D
 *
 * The four Bezier control points in normalised (t, v) space are:
 *   P0 = (0, 0)
 *   P1 = (x1, y1)
 *   P2 = (x2, y2)
 *   P3 = (1, 1)
 *
 * Where:
 *   x1 = outInfluence                           (fraction, not %)
 *   y1 = x1 * |outSpeed| / linearSpeed
 *   x2 = 1 - inInfluence
 *   y2 = 1 - inInfluence * |inSpeed| / linearSpeed
 *
 * @param {Array}  outEase      - keyOutTemporalEase of the current keyframe.
 * @param {Array}  inEaseNext   - keyInTemporalEase  of the next keyframe.
 * @param {number} duration     - Time (seconds) between the two keyframes.
 * @param {*}      startValue   - Property value at the current keyframe.
 * @param {*}      endValue     - Property value at the next keyframe.
 * @returns {Object} {x1, y1, x2, y2, css}
 */
function convertEasingWithValues(outEase, inEaseNext, duration, startValue, endValue) {
  // Find the dimension with the most significant value change
  var best = findBestDimension(startValue, endValue);
  var valueChange = best.valueChange;
  var dimIndex = best.dimIndex;

  // Guard: if value change or duration is negligible, return linear
  if (Math.abs(valueChange) < 0.0001 || duration < 0.0001) {
    return {
      x1: 0,
      y1: 0,
      x2: 1,
      y2: 1,
      css: "cubic-bezier(0, 0, 1, 1)"
    };
  }

  var linearSpeed = Math.abs(valueChange / duration);

  // Use the ease data from the dimension with the largest change
  // (clamp dimIndex to the available ease array length)
  var easeDim = Math.min(dimIndex, outEase.length - 1);
  var easeInDim = Math.min(dimIndex, inEaseNext.length - 1);

  var outSpeed = outEase[easeDim].speed;
  var outInfluence = outEase[easeDim].influence / 100;
  var inSpeed = inEaseNext[easeInDim].speed;
  var inInfluence = inEaseNext[easeInDim].influence / 100;

  // Normalised x coordinates (time axis)
  var x1 = outInfluence;
  var x2 = 1 - inInfluence;

  // Normalised y coordinates (value axis)
  // Hermite-to-Bezier: y1 = x1 * |outSpeed| / linearSpeed
  //                    y2 = 1 - inInfluence * |inSpeed| / linearSpeed
  var y1 = x1 * (Math.abs(outSpeed) / linearSpeed);
  var y2 = 1 - inInfluence * (Math.abs(inSpeed) / linearSpeed);

  // Clamp x to [0, 1] (CSS requirement)
  x1 = Math.max(0, Math.min(1, x1));
  x2 = Math.max(0, Math.min(1, x2));
  // NOTE: y values are intentionally NOT clamped -- values outside [0,1]
  // represent overshoot easing which CSS cubic-bezier supports.

  // Round to 4 decimal places
  x1 = Math.round(x1 * 10000) / 10000;
  y1 = Math.round(y1 * 10000) / 10000;
  x2 = Math.round(x2 * 10000) / 10000;
  y2 = Math.round(y2 * 10000) / 10000;

  return {
    x1: x1,
    y1: y1,
    x2: x2,
    y2: y2,
    css: "cubic-bezier(" + x1 + ", " + y1 + ", " + x2 + ", " + y2 + ")"
  };
}

/**
 * Classify a cubic-bezier into a well-known easing preset name when it
 * matches closely.  Returns null if no preset matches.
 *
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {string|null}
 */
function classifyEasingPreset(x1, y1, x2, y2) {
  var EPSILON = 0.02;

  function near(a, b) {
    return Math.abs(a - b) < EPSILON;
  }

  if (near(x1, 0) && near(y1, 0) && near(x2, 1) && near(y2, 1)) {
    return "linear";
  }
  if (near(x1, 0.25) && near(y1, 0.1) && near(x2, 0.25) && near(y2, 1)) {
    return "ease";
  }
  if (near(x1, 0.42) && near(y1, 0) && near(x2, 1) && near(y2, 1)) {
    return "ease-in";
  }
  if (near(x1, 0) && near(y1, 0) && near(x2, 0.58) && near(y2, 1)) {
    return "ease-out";
  }
  if (near(x1, 0.42) && near(y1, 0) && near(x2, 0.58) && near(y2, 1)) {
    return "ease-in-out";
  }
  // AE Easy Ease default
  if (near(x1, 0.3333) && near(y1, 0) && near(x2, 0.6667) && near(y2, 1)) {
    return "easeInOut (AE default)";
  }

  return null;
}
