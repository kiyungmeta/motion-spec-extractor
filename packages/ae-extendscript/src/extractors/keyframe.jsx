// extractors/keyframe.jsx
// Extract animated property data and keyframe information from AE properties.
// Depends on: extractors/easing.jsx (convertEasingToCubicBezier, convertEasingWithValues,
//             interpolationTypeToString)

/**
 * Normalise a raw AE property value into a plain JS value suitable for JSON.
 * AE returns different types depending on the property -- single numbers,
 * arrays, or custom objects.
 *
 * @param {Property} property - The AE property to read.
 * @returns {*} A number, array of numbers, or string.
 */
function getPropertyValue(property) {
  var val;
  try {
    val = property.value;
  } catch (e) {
    return null;
  }

  if (typeof val === "number") {
    return val;
  }
  if (val instanceof Array) {
    var out = [];
    var i;
    for (i = 0; i < val.length; i++) {
      out.push(val[i]);
    }
    return out;
  }
  if (typeof val === "string") {
    return val;
  }
  if (typeof val === "boolean") {
    return val;
  }
  // Fallback for exotic types (Shape, TextDocument, etc.)
  try {
    return String(val);
  } catch (e2) {
    return null;
  }
}

/**
 * Normalise a keyframe value (may differ slightly from a live property value).
 *
 * @param {*} val - Value returned by property.keyValue(i).
 * @returns {*}
 */
function normalizeKeyValue(val) {
  if (typeof val === "number") {
    return val;
  }
  if (val instanceof Array) {
    var out = [];
    var i;
    for (i = 0; i < val.length; i++) {
      out.push(val[i]);
    }
    return out;
  }
  if (typeof val === "string") {
    return val;
  }
  if (typeof val === "boolean") {
    return val;
  }
  try {
    return String(val);
  } catch (e) {
    return null;
  }
}

/**
 * Extract all keyframes from an animated AE property.
 *
 * @param {Property} property  - An animated AE Property.
 * @param {number}   frameRate - Composition frame rate (fps).
 * @returns {Array} Array of keyframe descriptor objects.
 */
function extractKeyframes(property, frameRate) {
  var keyframes = [];
  var numKeys = property.numKeys;
  var i, time, frame, value, kf;
  var inType, outType, inTypeStr, outTypeStr;
  var inEase, outEase, inEaseNext;
  var inTangent, outTangent;
  var easing;
  var nextTime, nextValue, segmentDuration;

  for (i = 1; i <= numKeys; i++) {
    kf = {};

    // ---- Index ----
    kf.index = i;

    // ---- Time & value ----
    try {
      time = property.keyTime(i);
      kf.time = time;
      kf.frame = Math.round(time * frameRate);
    } catch (e) {
      continue; // skip unreadable keyframes
    }

    try {
      value = property.keyValue(i);
      kf.value = normalizeKeyValue(value);
    } catch (e) {
      kf.value = null;
    }

    // ---- Interpolation type ----
    try {
      inType = property.keyInInterpolationType(i);
      outType = property.keyOutInterpolationType(i);
      inTypeStr = interpolationTypeToString(inType);
      outTypeStr = interpolationTypeToString(outType);
      kf.interpolationType = {
        inType: inTypeStr,
        outType: outTypeStr
      };
    } catch (e) {
      kf.interpolationType = null;
    }

    // ---- Temporal easing ----
    try {
      outEase = property.keyOutTemporalEase(i);
      inEase = property.keyInTemporalEase(i);

      // Build easing data matching shared TemporalEasing type:
      // { inSpeed[], inInfluence[], outSpeed[], outInfluence[], cubicBezier }
      var rawInSpeed = [];
      var rawInInfluence = [];
      var rawOutSpeed = [];
      var rawOutInfluence = [];
      var d;
      for (d = 0; d < inEase.length; d++) {
        rawInSpeed.push(inEase[d].speed);
        rawInInfluence.push(inEase[d].influence);
      }
      for (d = 0; d < outEase.length; d++) {
        rawOutSpeed.push(outEase[d].speed);
        rawOutInfluence.push(outEase[d].influence);
      }

      kf.temporalEasing = {
        inSpeed: rawInSpeed,
        inInfluence: rawInInfluence,
        outSpeed: rawOutSpeed,
        outInfluence: rawOutInfluence,
        cubicBezier: null
      };

      // Convert to cubic-bezier for the *outgoing* segment (current -> next)
      if (i < numKeys) {
        try {
          inEaseNext = property.keyInTemporalEase(i + 1);
          nextTime = property.keyTime(i + 1);
          nextValue = property.keyValue(i + 1);
          segmentDuration = nextTime - time;

          easing = convertEasingWithValues(
            outEase,
            inEaseNext,
            segmentDuration,
            kf.value,
            normalizeKeyValue(nextValue)
          );
          kf.temporalEasing.cubicBezier = easing;
        } catch (e) {
          // Fall back to simplified conversion
          try {
            inEaseNext = property.keyInTemporalEase(i + 1);
            nextTime = property.keyTime(i + 1);
            segmentDuration = nextTime - time;
            kf.temporalEasing.cubicBezier = convertEasingToCubicBezier(outEase, inEaseNext, segmentDuration);
          } catch (e2) {
            kf.temporalEasing.cubicBezier = null;
          }
        }
      }
    } catch (e) {
      kf.temporalEasing = null;
    }

    // ---- Spatial tangents (position properties) ----
    try {
      inTangent = property.keyInSpatialTangent(i);
      outTangent = property.keyOutSpatialTangent(i);
      if (inTangent && outTangent) {
        var spIn = [];
        var spOut = [];
        var s;
        for (s = 0; s < inTangent.length; s++) {
          spIn.push(inTangent[s]);
        }
        for (s = 0; s < outTangent.length; s++) {
          spOut.push(outTangent[s]);
        }
        kf.spatialEasing = {
          inTangent: spIn,
          outTangent: spOut
        };
      }
    } catch (e) {
      // Not all properties have spatial tangents -- this is expected.
    }

    // ---- Roving / continuous flags ----
    try {
      kf.roving = property.keyRoving(i);
    } catch (e) {}
    try {
      kf.temporalAutoBezier = property.keyTemporalAutoBezier(i);
    } catch (e) {}
    try {
      kf.temporalContinuous = property.keyTemporalContinuous(i);
    } catch (e) {}
    try {
      kf.spatialAutoBezier = property.keySpatialAutoBezier(i);
    } catch (e) {}
    try {
      kf.spatialContinuous = property.keySpatialContinuous(i);
    } catch (e) {}

    keyframes.push(kf);
  }

  return keyframes;
}

/**
 * Extract a single AE Property into a portable descriptor object.
 *
 * The returned object contains:
 *   - name, matchName, isAnimated, dimensions
 *   - staticValue (when not animated) OR keyframes (when animated)
 *   - expression (when one is applied)
 *
 * @param {Property} property  - An AE Property.
 * @param {number}   frameRate - Composition frame rate (fps).
 * @returns {Object|null} Property descriptor, or null if the property cannot be read.
 */
function extractAnimatedProperty(property, frameRate) {
  var result = {};

  try {
    result.name = property.name;
  } catch (e) {
    result.name = null;
  }

  try {
    result.matchName = property.matchName;
  } catch (e) {
    result.matchName = null;
  }

  // Determine if the property can hold a value at all
  try {
    if (property.propertyValueType === PropertyValueType.NO_VALUE) {
      return null;
    }
  } catch (e) {
    // If we cannot check, continue anyway
  }

  // Animated flag
  try {
    result.isAnimated = property.isTimeVarying;
  } catch (e) {
    result.isAnimated = false;
  }

  // Number of dimensions (1 for scalar, 2/3 for array values)
  try {
    if (property.propertyValueType === PropertyValueType.ThreeD_SPATIAL ||
        property.propertyValueType === PropertyValueType.ThreeD) {
      result.dimensions = 3;
    } else if (property.propertyValueType === PropertyValueType.TwoD_SPATIAL ||
               property.propertyValueType === PropertyValueType.TwoD) {
      result.dimensions = 2;
    } else {
      result.dimensions = 1;
    }
  } catch (e) {
    result.dimensions = 1;
  }

  // Static or animated
  if (result.isAnimated) {
    result.keyframes = extractKeyframes(property, frameRate);
  } else {
    result.staticValue = getPropertyValue(property);
  }

  // Expression
  try {
    if (property.expressionEnabled && property.expression && property.expression !== "") {
      result.expression = property.expression;
    }
  } catch (e) {
    // Expressions may not be available on all property types
  }

  return result;
}
