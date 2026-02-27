// @include "polyfills/es3-compat.jsx"
// @include "utils/json-stringify.jsx"
// @include "utils/file-io.jsx"
// @include "utils/property-walker.jsx"
// @include "extractors/easing.jsx"
// @include "extractors/keyframe.jsx"
// @include "extractors/transform.jsx"
// @include "extractors/shape.jsx"
// @include "extractors/text.jsx"
// @include "extractors/effects.jsx"
// @include "extractors/masks.jsx"
// @include "extractors/expressions.jsx"
// @include "extractors/composition.jsx"
// @include "extractors/layer.jsx"

(function() {
  // Check for active composition
  var comp = app.project.activeItem;
  if (!(comp instanceof CompItem)) {
    alert("Please select a composition first.", "Motion Spec Extractor");
    return;
  }

  // Show options dialog
  var dialog = new Window("dialog", "Motion Spec Extractor");
  dialog.orientation = "column";
  dialog.alignment = ["fill", "top"];

  // Composition info
  var infoGroup = dialog.add("panel", undefined, "Composition");
  infoGroup.alignment = ["fill", "top"];
  infoGroup.add("statictext", undefined, "Name: " + comp.name);
  infoGroup.add("statictext", undefined, "Size: " + comp.width + " x " + comp.height);
  infoGroup.add("statictext", undefined, "Duration: " + comp.duration.toFixed(2) + "s (" + Math.round(comp.duration * (1 / comp.frameDuration)) + " frames)");
  infoGroup.add("statictext", undefined, "Frame Rate: " + (1 / comp.frameDuration).toFixed(2) + " fps");
  infoGroup.add("statictext", undefined, "Layers: " + comp.numLayers);

  // Options
  var optGroup = dialog.add("panel", undefined, "Options");
  optGroup.alignment = ["fill", "top"];
  var includeHidden = optGroup.add("checkbox", undefined, "Include hidden layers");
  includeHidden.value = true;
  var includePrecomps = optGroup.add("checkbox", undefined, "Extract precompositions (recursive)");
  includePrecomps.value = true;
  var maxPrecompDepth = optGroup.add("group");
  maxPrecompDepth.add("statictext", undefined, "Max precomp depth:");
  var depthInput = maxPrecompDepth.add("edittext", undefined, "5");
  depthInput.characters = 4;
  var prettyPrint = optGroup.add("checkbox", undefined, "Pretty-print JSON");
  prettyPrint.value = true;

  // Buttons
  var btnGroup = dialog.add("group");
  btnGroup.add("button", undefined, "Extract", { name: "ok" });
  btnGroup.add("button", undefined, "Cancel", { name: "cancel" });

  if (dialog.show() !== 1) return;

  // Create progress bar
  var progressWin = new Window("palette", "Extracting...");
  progressWin.alignment = ["fill", "top"];
  var progressText = progressWin.add("statictext", undefined, "Initializing...");
  progressText.alignment = ["fill", "top"];
  progressText.preferredSize = [300, 20];
  var progressBar = progressWin.add("progressbar", undefined, 0, comp.numLayers);
  progressBar.preferredSize = [300, 20];
  progressWin.show();

  try {
    var options = {
      includeHidden: includeHidden.value,
      includePrecomps: includePrecomps.value,
      maxPrecompDepth: parseInt(depthInput.text, 10) || 5,
      prettyPrint: prettyPrint.value
    };

    var frameRate = 1 / comp.frameDuration;

    // Extract composition metadata
    progressText.text = "Extracting composition metadata...";
    progressWin.update();
    var compData = extractComposition(comp);

    // Extract layers
    var layers = [];
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);

      progressText.text = "Layer " + i + "/" + comp.numLayers + ": " + layer.name;
      progressBar.value = i;
      progressWin.update();

      // Skip hidden layers if option unchecked
      if (!options.includeHidden && !layer.enabled) {
        continue;
      }

      var layerData = extractLayer(layer, frameRate, options);
      layers.push(layerData);
    }

    compData.layers = layers;

    // Build document
    var document = {
      version: "1.0.0",
      exportInfo: {
        exportedAt: new Date().toISOString ? new Date().toISOString() : new Date().toString(),
        aeVersion: app.version,
        scriptVersion: "1.0.0",
        sourceFile: app.project.file ? app.project.file.fsName : "Unsaved Project"
      },
      composition: compData
    };

    progressText.text = "Generating JSON...";
    progressWin.update();

    var indent = options.prettyPrint ? 2 : 0;
    var jsonString = jsonStringify(document, indent);

    progressWin.close();

    // Save file
    var defaultName = comp.name.replace(/[^a-zA-Z0-9_-]/g, "_") + "_motion-spec.json";
    var saved = saveJsonFile(jsonString, defaultName);

    if (saved) {
      alert("Motion spec exported successfully!\n\nLayers extracted: " + layers.length + "\nFile size: " + Math.round(jsonString.length / 1024) + " KB", "Motion Spec Extractor");
    }

  } catch(e) {
    progressWin.close();
    alert("Error during extraction:\n" + e.toString() + "\nLine: " + (e.line || "unknown"), "Motion Spec Extractor");
  }
})();
