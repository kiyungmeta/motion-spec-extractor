// extractors/composition.jsx
// Extract composition-level data from an AE CompItem.
// No direct extractor dependencies; layer extraction is delegated to the caller.

/**
 * Extract composition-level metadata from an After Effects CompItem.
 *
 * The returned object contains dimensions, timing, background colour,
 * markers, and an empty layers array to be populated by the caller via
 * extractLayer().
 *
 * @param {CompItem} comp - An After Effects composition item.
 * @returns {Object} Composition data descriptor.
 */
function extractComposition(comp) {
  var result = {};
  var frameRate;

  // ---- Basic properties ----
  try { result.name = comp.name; } catch (e) { result.name = null; }
  try { result.width = comp.width; } catch (e) { result.width = null; }
  try { result.height = comp.height; } catch (e) { result.height = null; }
  try { result.duration = comp.duration; } catch (e) { result.duration = null; }

  // Frame rate: AE stores frameDuration (seconds per frame)
  try {
    frameRate = 1 / comp.frameDuration;
    result.frameRate = Math.round(frameRate * 100) / 100;
  } catch (e) {
    result.frameRate = null;
  }

  // ---- Background colour ----
  try {
    var bg = comp.bgColor;
    result.backgroundColor = [bg[0], bg[1], bg[2]];
  } catch (e) {
    result.backgroundColor = null;
  }

  // ---- Markers ----
  result.markers = extractCompMarkers(comp);

  // ---- Layers placeholder (filled by caller) ----
  result.layers = [];

  return result;
}

/**
 * Extract composition markers (keyframes on the marker property).
 *
 * @param {CompItem} comp - An After Effects composition item.
 * @returns {Array} Array of marker descriptor objects.
 */
function extractCompMarkers(comp) {
  var markers = [];
  var markerProp, numMarkers, i, marker;

  try {
    markerProp = comp.markerProperty;
  } catch (e) {
    return markers;
  }

  if (!markerProp) {
    return markers;
  }

  try {
    numMarkers = markerProp.numKeys;
  } catch (e) {
    return markers;
  }

  for (i = 1; i <= numMarkers; i++) {
    try {
      marker = markerProp.keyValue(i);
      markers.push({
        time: markerProp.keyTime(i),
        duration: marker.duration,
        comment: marker.comment
      });
    } catch (e) {
      // Skip markers that cannot be read
    }
  }

  return markers;
}
