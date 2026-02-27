// extractors/effects.jsx
// Extract effect parameters from a layer
// Depends on: extractAnimatedProperty (from keyframe.jsx, assumed globally available)

/**
 * Extract all effects applied to a layer, including each effect's
 * animatable properties.
 *
 * @param {Layer} layer - An After Effects layer.
 * @param {number} frameRate - Composition frame rate for time conversions.
 * @returns {Array} Array of effect data objects.
 */
function extractEffects(layer, frameRate) {
  var effects = [];
  var effectsGroup, i, j, effect, effectData, prop;

  try {
    effectsGroup = layer.property("ADBE Effect Parade");
  } catch (e) {
    return effects;
  }

  if (!effectsGroup) {
    return effects;
  }

  for (i = 1; i <= effectsGroup.numProperties; i++) {
    try {
      effect = effectsGroup.property(i);

      effectData = {
        name: effect.name,
        matchName: effect.matchName,
        enabled: effect.enabled,
        properties: []
      };

      // Walk effect properties and extract animatable ones
      for (j = 1; j <= effect.numProperties; j++) {
        try {
          prop = effect.property(j);
          if (prop.propertyValueType !== PropertyValueType.NO_VALUE &&
              prop.propertyValueType !== PropertyValueType.CUSTOM_VALUE) {
            effectData.properties.push(extractAnimatedProperty(prop, frameRate));
          }
        } catch (e) {
          // Skip properties that cannot be read
        }
      }

      effects.push(effectData);
    } catch (e) {
      // Skip effects that cannot be accessed
    }
  }

  return effects;
}
