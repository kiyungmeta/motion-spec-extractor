// extractors/layer.jsx
// Extract layer data from an AE Layer, including type detection and
// delegation to specialised extractors (transform, masks, effects,
// shape, text).
// Depends on:
//   extractors/transform.jsx  (extractTransform)
//   extractors/keyframe.jsx   (extractAnimatedProperty)
//   extractors/masks.jsx      (extractMasks)
//   extractors/effects.jsx    (extractEffects)
//   extractors/shape.jsx      (extractShapeData)
//   extractors/text.jsx       (extractTextData)

/**
 * Image file extensions used to distinguish image footage from video footage.
 * @type {Array}
 */
var IMAGE_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff",
  ".psd", ".ai", ".eps", ".svg", ".webp", ".ico", ".exr",
  ".hdr", ".tga", ".dpx", ".cin"
];

/**
 * Determine whether a file name represents an image (as opposed to video).
 *
 * @param {string} fileName - The file name or full path.
 * @returns {boolean}
 */
function isImageFile(fileName) {
  var lower = fileName.toLowerCase();
  var i;
  for (i = 0; i < IMAGE_EXTENSIONS.length; i++) {
    // Check if the name ends with the extension
    var ext = IMAGE_EXTENSIONS[i];
    if (lower.length >= ext.length &&
        lower.substring(lower.length - ext.length) === ext) {
      return true;
    }
  }
  return false;
}

/**
 * Detect the semantic type of an After Effects layer.
 *
 * The detection logic inspects the layer's constructor name, matchName,
 * and source item to categorise the layer into one of:
 *   shape, text, precomp, solid, image, video, camera, light, adjustment, null
 *
 * @param {Layer} layer - An AE Layer.
 * @returns {string} One of the type tokens listed above.
 */
function detectLayerType(layer) {
  var matchName;

  try {
    matchName = layer.matchName;
  } catch (e) {
    matchName = "";
  }

  // -- Shape layer --
  try {
    if (matchName === "ADBE Vector Layer" || layer instanceof ShapeLayer) {
      return "shape";
    }
  } catch (e) {}

  // -- Text layer --
  try {
    if (matchName === "ADBE Text Layer" || layer instanceof TextLayer) {
      return "text";
    }
  } catch (e) {}

  // -- Camera layer --
  try {
    if (matchName === "ADBE Camera Layer" || layer instanceof CameraLayer) {
      return "camera";
    }
  } catch (e) {}

  // -- Light layer --
  try {
    if (matchName === "ADBE Light Layer" || layer instanceof LightLayer) {
      return "light";
    }
  } catch (e) {}

  // -- Adjustment layer (must be checked before other AVLayer subtypes) --
  try {
    if (layer.adjustmentLayer) {
      return "adjustment";
    }
  } catch (e) {}

  // -- AVLayer subtypes: precomp, solid, image, video --
  try {
    if (layer.source) {
      var source = layer.source;

      // Pre-composition (nested comp)
      try {
        if (source instanceof CompItem) {
          return "precomp";
        }
      } catch (e) {}

      // Footage item
      try {
        if (source instanceof FootageItem) {
          // Solid
          try {
            if (source.mainSource instanceof SolidSource) {
              return "solid";
            }
          } catch (e) {}

          // File-based footage
          try {
            if (source.mainSource && source.mainSource.file) {
              var file = source.mainSource.file;
              if (file && file.exists) {
                if (isImageFile(file.name)) {
                  return "image";
                }
                return "video";
              }
            }
          } catch (e) {}

          // Footage without a file (e.g., placeholder) -- treat as solid
          return "solid";
        }
      } catch (e) {}
    }
  } catch (e) {}

  // -- Null / fallback --
  return "null";
}

/**
 * Compute a high-level animation summary for a layer.
 * Produces an object matching the AnimationSummary type from shared types:
 *   { isAnimated, animatedPropertyCount, totalKeyframes, properties[] }
 *
 * Each entry in properties[] is a PropertySummary:
 *   { name, keyframeCount, startValue, endValue, duration, delay, easing }
 *
 * @param {Object} layerData - The layer data object (as built by extractLayer).
 * @returns {Object} AnimationSummary descriptor.
 */
function computeAnimationSummary(layerData) {
  var summary = {
    isAnimated: false,
    animatedPropertyCount: 0,
    totalKeyframes: 0,
    properties: []
  };

  var transform = layerData.transform;
  if (!transform) return summary;

  /**
   * Check one property and accumulate into the summary.
   * @param {Object} prop - Output from extractAnimatedProperty.
   */
  function checkProp(prop) {
    if (!prop || !prop.isAnimated || !prop.keyframes || prop.keyframes.length < 2) {
      return;
    }

    summary.isAnimated = true;
    summary.animatedPropertyCount++;
    summary.totalKeyframes += prop.keyframes.length;

    var firstKf = prop.keyframes[0];
    var lastKf = prop.keyframes[prop.keyframes.length - 1];

    summary.properties.push({
      name: prop.name,
      keyframeCount: prop.keyframes.length,
      startValue: firstKf.value,
      endValue: lastKf.value,
      duration: lastKf.time - firstKf.time,
      delay: firstKf.time,
      easing: (prop.keyframes.length >= 2 && firstKf.temporalEasing)
        ? firstKf.temporalEasing.cubicBezier
        : null
    });
  }

  // Check standard transform properties
  var propsToCheck = [transform.anchorPoint, transform.position, transform.scale,
                      transform.rotation, transform.opacity];

  // 3D rotation axes
  if (transform.rotationX) propsToCheck.push(transform.rotationX);
  if (transform.rotationY) propsToCheck.push(transform.rotationY);
  if (transform.rotationZ) propsToCheck.push(transform.rotationZ);

  var i;
  for (i = 0; i < propsToCheck.length; i++) {
    checkProp(propsToCheck[i]);
  }

  // Separated position
  if (transform.positionSeparated) {
    checkProp(transform.positionSeparated.x);
    checkProp(transform.positionSeparated.y);
    if (transform.positionSeparated.z) {
      checkProp(transform.positionSeparated.z);
    }
  }

  return summary;
}

/**
 * Extract all relevant data from a single AE Layer.
 *
 * @param {Layer}  layer     - The AE Layer to inspect.
 * @param {number} frameRate - Composition frame rate (fps).
 * @returns {Object} Layer data descriptor.
 */
function extractLayer(layer, frameRate) {
  var result = {};
  var layerType;

  // ---- Basic properties ----
  try {
    result.index = layer.index;
  } catch (e) {
    result.index = null;
  }

  try {
    result.name = layer.name;
  } catch (e) {
    result.name = null;
  }

  // ---- Type detection ----
  layerType = detectLayerType(layer);
  result.type = layerType;

  // ---- Timing ----
  try { result.inPoint = layer.inPoint; } catch (e) { result.inPoint = null; }
  try { result.outPoint = layer.outPoint; } catch (e) { result.outPoint = null; }
  try { result.startTime = layer.startTime; } catch (e) { result.startTime = null; }
  try { result.stretch = layer.stretch; } catch (e) { result.stretch = null; }

  // ---- Flags ----
  try { result.enabled = layer.enabled; } catch (e) { result.enabled = null; }
  try { result.solo = layer.solo; } catch (e) { result.solo = null; }
  try { result.shy = layer.shy; } catch (e) { result.shy = null; }
  try { result.locked = layer.locked; } catch (e) { result.locked = null; }

  // ---- Blend mode ----
  try {
    result.blendMode = layer.blendingMode.toString();
  } catch (e) {
    result.blendMode = null;
  }

  // ---- 3D ----
  try {
    result.is3D = layer.threeDLayer;
  } catch (e) {
    result.is3D = false;
  }

  // ---- Parent ----
  try {
    result.parentIndex = layer.parent ? layer.parent.index : null;
  } catch (e) {
    result.parentIndex = null;
  }

  // ---- Track matte ----
  try {
    result.trackMatteType = layer.trackMatteType.toString();
  } catch (e) {
    result.trackMatteType = null;
  }
  try {
    result.trackMatteLayer = layer.trackMatteLayer ? layer.trackMatteLayer.index : null;
  } catch (e) {
    result.trackMatteLayer = null;
  }

  // ---- Transform ----
  result.transform = extractTransform(layer, frameRate);

  // ---- Masks ----
  result.masks = extractMasks(layer, frameRate);

  // ---- Effects ----
  result.effects = extractEffects(layer, frameRate);

  // ---- Type-specific data ----
  if (layerType === "shape") {
    result.shapeData = extractShapeData(layer, frameRate);
  }

  if (layerType === "text") {
    result.textData = extractTextData(layer, frameRate);
  }

  if (layerType === "precomp") {
    try {
      result.precompData = {
        compositionName: layer.source.name
      };
    } catch (e) {
      result.precompData = {
        compositionName: null
      };
    }
  }

  if (layerType === "solid") {
    try {
      result.solidData = {
        color: [
          layer.source.mainSource.color[0],
          layer.source.mainSource.color[1],
          layer.source.mainSource.color[2]
        ],
        width: layer.source.width,
        height: layer.source.height
      };
    } catch (e) {
      result.solidData = null;
    }
  }

  if (layerType === "image" || layerType === "video") {
    try {
      result.sourceFile = layer.source.mainSource.file.fsName;
      result.sourceFileName = layer.source.mainSource.file.name;
    } catch (e) {
      result.sourceFile = null;
      result.sourceFileName = null;
    }
  }

  if (layerType === "camera") {
    try {
      result.cameraData = {
        zoom: extractAnimatedProperty(layer.property("ADBE Camera Options Group").property("ADBE Camera Zoom"), frameRate),
        depthOfField: layer.property("ADBE Camera Options Group").property("ADBE Camera Depth of Field").value,
        focusDistance: extractAnimatedProperty(layer.property("ADBE Camera Options Group").property("ADBE Camera Focus Distance"), frameRate),
        aperture: extractAnimatedProperty(layer.property("ADBE Camera Options Group").property("ADBE Camera Aperture"), frameRate)
      };
    } catch (e) {
      result.cameraData = null;
    }
  }

  if (layerType === "light") {
    try {
      result.lightData = {
        lightType: layer.property("ADBE Light Options Group").property("ADBE Light Type").value.toString(),
        intensity: extractAnimatedProperty(layer.property("ADBE Light Options Group").property("ADBE Light Intensity"), frameRate),
        color: extractAnimatedProperty(layer.property("ADBE Light Options Group").property("ADBE Light Color"), frameRate)
      };
    } catch (e) {
      result.lightData = null;
    }
  }

  // ---- Animation summary (computed from the extracted transform data) ----
  result.animationSummary = computeAnimationSummary(result);

  return result;
}
