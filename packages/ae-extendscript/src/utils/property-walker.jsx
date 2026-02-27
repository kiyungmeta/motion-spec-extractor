// utils/property-walker.jsx
// Recursive property group traversal for After Effects' property tree
// Depends on: polyfills/es3-compat.jsx (for Array.prototype.push, used implicitly)

/**
 * Maximum recursion depth to prevent infinite loops in deeply nested
 * or circular property structures.
 */
var PROPERTY_WALK_MAX_DEPTH = 20;

/**
 * Recursively walk an After Effects PropertyGroup, calling a callback
 * for every leaf property encountered.
 *
 * @param {PropertyGroup} propertyGroup - The AE property group to traverse.
 * @param {function} callback - Called as callback(property, depth) for each leaf.
 * @param {number} [depth] - Current recursion depth (used internally, defaults to 0).
 */
function walkPropertyGroup(propertyGroup, callback, depth) {
  var i, numProps, prop;

  if (typeof depth === "undefined" || depth === null) {
    depth = 0;
  }

  // Guard against excessive recursion
  if (depth > PROPERTY_WALK_MAX_DEPTH) {
    return;
  }

  // Validate input
  if (!propertyGroup) {
    return;
  }

  try {
    numProps = propertyGroup.numProperties;
  } catch (e) {
    // Not a property group or inaccessible
    return;
  }

  if (typeof numProps !== "number" || numProps <= 0) {
    return;
  }

  // AE property indices are 1-based
  for (i = 1; i <= numProps; i++) {
    try {
      prop = propertyGroup.property(i);
    } catch (e) {
      // Some properties throw when accessed; skip them
      continue;
    }

    if (!prop) {
      continue;
    }

    try {
      if (prop.propertyType === PropertyType.PROPERTY) {
        // Leaf property — invoke callback
        callback(prop, depth);
      } else {
        // PropertyGroup or IndexedGroup — recurse
        walkPropertyGroup(prop, callback, depth + 1);
      }
    } catch (e) {
      // If propertyType access throws, try to recurse anyway
      try {
        if (typeof prop.numProperties === "number" && prop.numProperties > 0) {
          walkPropertyGroup(prop, callback, depth + 1);
        } else {
          callback(prop, depth);
        }
      } catch (e2) {
        // Completely inaccessible property; skip
      }
    }
  }
}

/**
 * Safely check whether an After Effects property has keyframes.
 *
 * @param {Property} property - The AE property to check.
 * @returns {boolean} true if the property has at least one keyframe.
 */
function isPropertyAnimated(property) {
  try {
    if (!property) {
      return false;
    }
    // numKeys is only available on actual Property objects (not groups)
    if (typeof property.numKeys === "number" && property.numKeys > 0) {
      return true;
    }
  } catch (e) {
    // Some properties throw on numKeys access
  }
  return false;
}

/**
 * Collect all animated (keyframed) properties within a property group.
 *
 * @param {PropertyGroup} propertyGroup - The AE property group to search.
 * @returns {Array} Array of Property objects that have keyframes.
 */
function getAnimatedProperties(propertyGroup) {
  var results = [];

  walkPropertyGroup(propertyGroup, function (property, depth) {
    if (isPropertyAnimated(property)) {
      results.push(property);
    }
  }, 0);

  return results;
}

/**
 * Safely retrieve the current value of an After Effects property.
 * Handles the various property value types that AE exposes and wraps
 * access in try/catch since some properties throw on value reads.
 *
 * NOTE: This is a utility variant. The keyframe extractor (keyframe.jsx)
 * defines its own getPropertyValue for use in keyframe extraction.
 *
 * @param {Property} property - The AE property to read.
 * @returns {*} The property value, or null if the value cannot be read.
 */
function getPropertyValueSafe(property) {
  var val;

  if (!property) {
    return null;
  }

  try {
    // Check if the property can have a value
    if (property.propertyValueType === PropertyValueType.NO_VALUE) {
      return null;
    }

    // For properties with expressions that override the value,
    // use the post-expression value when available
    if (property.expressionEnabled) {
      try {
        val = property.value;
        return val;
      } catch (e1) {
        // Fall through to try other approaches
      }
    }

    val = property.value;

    // Handle AE-specific value types that may need unwrapping
    if (typeof val === "undefined") {
      return null;
    }

    return val;
  } catch (e) {
    // Property value is not readable (e.g., Marker, unsupported type)
    return null;
  }
}
