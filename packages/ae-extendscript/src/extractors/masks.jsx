// extractors/masks.jsx
// Extract mask data from a layer
// Depends on: extractAnimatedProperty (from keyframe.jsx, assumed globally available)

/**
 * Extract all masks applied to a layer, including path, feather,
 * opacity, and expansion properties.
 *
 * @param {Layer} layer - An After Effects layer.
 * @param {number} frameRate - Composition frame rate for time conversions.
 * @returns {Array} Array of mask data objects.
 */
function extractMasks(layer, frameRate) {
  var masks = [];
  var masksGroup, i, mask;

  try {
    masksGroup = layer.property("ADBE Mask Parade");
  } catch (e) {
    return masks;
  }

  if (!masksGroup) {
    return masks;
  }

  for (i = 1; i <= masksGroup.numProperties; i++) {
    try {
      mask = masksGroup.property(i);
      masks.push({
        name: mask.name,
        mode: mask.maskMode.toString(),
        inverted: mask.inverted,
        path: extractAnimatedProperty(mask.property("ADBE Mask Shape"), frameRate),
        feather: extractAnimatedProperty(mask.property("ADBE Mask Feather"), frameRate),
        opacity: extractAnimatedProperty(mask.property("ADBE Mask Opacity"), frameRate),
        expansion: extractAnimatedProperty(mask.property("ADBE Mask Offset"), frameRate)
      });
    } catch (e) {
      // Skip masks that cannot be accessed
    }
  }

  return masks;
}
