// extractors/transform.jsx
// Extract transform properties from an AE Layer.
// Depends on: extractors/keyframe.jsx (extractAnimatedProperty)

/**
 * Extract all transform properties from a layer.
 *
 * Handles:
 *   - Standard 2D properties: anchorPoint, position, scale, rotation, opacity
 *   - Separated position dimensions (X / Y / Z)
 *   - 3D layer rotation axes (X Rotation, Y Rotation, Z Rotation, Orientation)
 *
 * Each property is returned via extractAnimatedProperty, which records
 * static values, keyframes, and expressions as applicable.
 *
 * @param {Layer}  layer     - The AE Layer to inspect.
 * @param {number} frameRate - Composition frame rate (fps).
 * @returns {Object} Transform properties descriptor.
 */
function extractTransform(layer, frameRate) {
  var result = {};
  var transformGroup;

  try {
    transformGroup = layer.transform;
  } catch (e) {
    return result;
  }

  // ---- Anchor Point ----
  try {
    result.anchorPoint = extractAnimatedProperty(
      transformGroup.anchorPoint,
      frameRate
    );
  } catch (e) {}

  // ---- Position (unified or separated) ----
  var positionSeparated = false;
  try {
    var positionProp = transformGroup.property("ADBE Position");
    if (positionProp && positionProp.dimensionsSeparated) {
      positionSeparated = true;
    }
  } catch (e) {}

  if (positionSeparated) {
    result.positionSeparated = {};
    try {
      result.positionSeparated.x = extractAnimatedProperty(
        transformGroup.property("ADBE Position_0"),
        frameRate
      );
    } catch (e) {}
    try {
      result.positionSeparated.y = extractAnimatedProperty(
        transformGroup.property("ADBE Position_1"),
        frameRate
      );
    } catch (e) {}
    try {
      result.positionSeparated.z = extractAnimatedProperty(
        transformGroup.property("ADBE Position_2"),
        frameRate
      );
    } catch (e) {}
  } else {
    try {
      result.position = extractAnimatedProperty(
        transformGroup.position,
        frameRate
      );
    } catch (e) {}
  }

  // ---- Scale ----
  try {
    result.scale = extractAnimatedProperty(
      transformGroup.scale,
      frameRate
    );
  } catch (e) {}

  // ---- Rotation (2D) or Rotation X/Y/Z (3D) ----
  var is3D = false;
  try {
    is3D = layer.threeDLayer;
  } catch (e) {}

  if (is3D) {
    try {
      result.rotationX = extractAnimatedProperty(
        transformGroup.xRotation,
        frameRate
      );
    } catch (e) {}
    try {
      result.rotationY = extractAnimatedProperty(
        transformGroup.yRotation,
        frameRate
      );
    } catch (e) {}
    try {
      result.rotationZ = extractAnimatedProperty(
        transformGroup.zRotation,
        frameRate
      );
    } catch (e) {}
    try {
      result.orientation = extractAnimatedProperty(
        transformGroup.orientation,
        frameRate
      );
    } catch (e) {}
  } else {
    try {
      result.rotation = extractAnimatedProperty(
        transformGroup.rotation,
        frameRate
      );
    } catch (e) {}
  }

  // ---- Opacity ----
  try {
    result.opacity = extractAnimatedProperty(
      transformGroup.opacity,
      frameRate
    );
  } catch (e) {}

  return result;
}
