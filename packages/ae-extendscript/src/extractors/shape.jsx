// extractors/shape.jsx
// Extract shape layer content groups recursively
// Depends on: extractAnimatedProperty (from keyframe.jsx, assumed globally available)

// Frame rate for shape property extraction. Set by extractShapeData before recursion.
var _shapeExtractFrameRate = 30;

/**
 * Map an After Effects shape match name to a human-readable type string.
 *
 * @param {string} matchName - The ADBE match name of the shape property.
 * @returns {string} A short type identifier.
 */
function getShapeType(matchName) {
  if (matchName === "ADBE Vector Group") {
    return "group";
  }
  if (matchName === "ADBE Vector Shape - Group") {
    return "path";
  }
  if (matchName === "ADBE Vector Graphic - Fill") {
    return "fill";
  }
  if (matchName === "ADBE Vector Graphic - Stroke") {
    return "stroke";
  }
  if (matchName === "ADBE Vector Filter - Trim") {
    return "trim";
  }
  if (matchName === "ADBE Vector Transform Group") {
    return "transform";
  }
  if (matchName === "ADBE Vector Shape - Rect") {
    return "rectangle";
  }
  if (matchName === "ADBE Vector Shape - Ellipse") {
    return "ellipse";
  }
  if (matchName === "ADBE Vector Shape - Star") {
    return "polystar";
  }
  if (matchName === "ADBE Vector Filter - Merge") {
    return "merge";
  }
  if (matchName === "ADBE Vector Filter - Repeater") {
    return "repeater";
  }
  if (matchName === "ADBE Vector Filter - RC") {
    return "roundCorners";
  }
  return "unknown";
}

/**
 * Extract animatable properties from a shape element (fill, stroke, path, etc.).
 * Iterates over the element's sub-properties and returns an array of
 * AnimatedProperty objects for each animatable sub-property.
 *
 * @param {PropertyGroup} shapeElement - A shape element property group.
 * @returns {Array} Array of animated property data objects.
 */
function extractShapeElementProperties(shapeElement) {
  var results = [];
  var i, numProps, subProp;

  try {
    numProps = shapeElement.numProperties;
  } catch (e) {
    return results;
  }

  if (typeof numProps !== "number" || numProps <= 0) {
    return results;
  }

  for (i = 1; i <= numProps; i++) {
    try {
      subProp = shapeElement.property(i);
      if (!subProp) {
        continue;
      }
      // Only extract properties that hold actual values (not groups or custom)
      if (subProp.propertyValueType !== PropertyValueType.NO_VALUE &&
          subProp.propertyValueType !== PropertyValueType.CUSTOM_VALUE) {
        results.push(extractAnimatedProperty(subProp, _shapeExtractFrameRate));
      }
    } catch (e) {
      // Skip inaccessible sub-properties
    }
  }

  return results;
}

/**
 * Extract transform properties from a shape group transform
 * (position, anchor point, scale, rotation, opacity, skew, skew axis).
 *
 * @param {PropertyGroup} transformGroup - The ADBE Vector Transform Group.
 * @returns {Array} Array of animated property data objects.
 */
function extractGroupProperties(transformGroup) {
  var results = [];
  var i, numProps, prop;

  try {
    numProps = transformGroup.numProperties;
  } catch (e) {
    return results;
  }

  if (typeof numProps !== "number" || numProps <= 0) {
    return results;
  }

  for (i = 1; i <= numProps; i++) {
    try {
      prop = transformGroup.property(i);
      if (!prop) {
        continue;
      }
      if (prop.propertyValueType !== PropertyValueType.NO_VALUE &&
          prop.propertyValueType !== PropertyValueType.CUSTOM_VALUE) {
        results.push(extractAnimatedProperty(prop, _shapeExtractFrameRate));
      }
    } catch (e) {
      // Skip inaccessible properties
    }
  }

  return results;
}

/**
 * Recursively extract shape group data from a property group.
 *
 * @param {PropertyGroup} propertyGroup - A shape contents property group.
 * @returns {Array} Array of shape data objects describing each child.
 */
function extractShapeGroup(propertyGroup) {
  var result = [];
  var i, numProps, prop, item, subContents, groupTransform;

  try {
    numProps = propertyGroup.numProperties;
  } catch (e) {
    return result;
  }

  if (typeof numProps !== "number" || numProps <= 0) {
    return result;
  }

  for (i = 1; i <= numProps; i++) {
    try {
      prop = propertyGroup.property(i);
    } catch (e) {
      continue;
    }

    if (!prop) {
      continue;
    }

    item = {
      name: prop.name,
      matchName: prop.matchName,
      type: getShapeType(prop.matchName)
    };

    if (prop.matchName === "ADBE Vector Group") {
      // It's a group — recurse into its contents
      try {
        subContents = prop.property("ADBE Vectors Group");
        if (subContents) {
          item.contents = extractShapeGroup(subContents);
        }
      } catch (e) {
        item.contents = [];
      }

      // Also extract the group transform
      try {
        groupTransform = prop.property("ADBE Vector Transform Group");
        if (groupTransform) {
          item.properties = extractGroupProperties(groupTransform);
        }
      } catch (e) {
        item.properties = [];
      }
    } else {
      // Extract animatable properties from this shape element
      item.properties = extractShapeElementProperties(prop);
    }

    result.push(item);
  }

  return result;
}

/**
 * Extract all shape data from a shape layer.
 *
 * @param {Layer} shapeLayer - An After Effects shape layer.
 * @param {number} [frameRate] - Composition frame rate (fps). Defaults to 30.
 * @returns {Array} Array of shape group data objects, or empty array if
 *   the layer has no shape contents.
 */
function extractShapeData(shapeLayer, frameRate) {
  var contents;

  // Set module-level frame rate for sub-extractors
  if (typeof frameRate === "number" && frameRate > 0) {
    _shapeExtractFrameRate = frameRate;
  }

  try {
    contents = shapeLayer.property("ADBE Root Vectors Group");
  } catch (e) {
    return [];
  }

  if (!contents) {
    return [];
  }

  return extractShapeGroup(contents);
}
