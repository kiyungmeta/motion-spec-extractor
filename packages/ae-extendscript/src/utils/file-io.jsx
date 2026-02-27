// utils/file-io.jsx
// File save utilities for After Effects ExtendScript
// Depends on: utils/json-stringify.jsx (caller is expected to pass a JSON string)

/**
 * Open a native save dialog and write a JSON string to the selected file.
 *
 * @param {string} jsonString - The JSON content to write.
 * @param {string} defaultFileName - Default file name shown in the save dialog.
 * @returns {boolean} true if the file was saved successfully, false otherwise.
 */
function saveJsonFile(jsonString, defaultFileName) {
  var file, success, startFolder;

  try {
    startFolder = getProjectFolder();
    file = startFolder.saveDlg(
      "Save JSON File",
      "JSON Files:*.json,All Files:*.*",
      false
    );

    if (!file) {
      // User cancelled the dialog
      return false;
    }

    // If the user didn't type an extension, append .json
    if (file.name.indexOf(".") === -1) {
      file = new File(file.fsName + ".json");
    }

    file.encoding = "UTF-8";
    success = file.open("w");
    if (!success) {
      return false;
    }

    file.write(jsonString);
    file.close();

    return true;
  } catch (e) {
    try {
      if (file && file.close) {
        file.close();
      }
    } catch (ignore) {}
    return false;
  }
}

/**
 * Get the folder of the currently open After Effects project file.
 * Falls back to Folder.desktop if no project is open or the project
 * has not been saved yet.
 *
 * @returns {Folder} The project folder or the desktop folder.
 */
function getProjectFolder() {
  var projectFile;
  try {
    projectFile = app.project.file;
    if (projectFile && projectFile.parent && projectFile.parent.exists) {
      return projectFile.parent;
    }
  } catch (e) {
    // app.project.file can throw if no project is open
  }
  return Folder.desktop;
}
