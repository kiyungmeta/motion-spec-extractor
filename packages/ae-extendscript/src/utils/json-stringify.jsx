// utils/json-stringify.jsx
// Custom JSON serializer for ExtendScript (no native JSON global)
// Depends on: polyfills/es3-compat.jsx (for Array.isArray, Array.prototype.indexOf)

/**
 * Serialize a JavaScript value to a JSON string.
 *
 * @param {*} obj - The value to serialize.
 * @param {number} [indent] - Number of spaces for pretty-printing. Omit or 0 for compact output.
 * @returns {string} JSON string representation.
 */
function jsonStringify(obj, indent) {
  var indentSize = (typeof indent === "number" && indent > 0) ? indent : 0;
  var seen = []; // circular reference tracking

  /**
   * Build an indentation string for a given nesting level.
   */
  function makeIndent(level) {
    var s = "";
    var total = level * indentSize;
    var i;
    for (i = 0; i < total; i++) {
      s = s + " ";
    }
    return s;
  }

  /**
   * Escape a string value for JSON output.
   */
  function escapeString(str) {
    var result = "";
    var i, ch, code, hex;
    for (i = 0; i < str.length; i++) {
      ch = str.charAt(i);
      if (ch === '"') {
        result = result + '\\"';
      } else if (ch === "\\") {
        result = result + "\\\\";
      } else if (ch === "\n") {
        result = result + "\\n";
      } else if (ch === "\r") {
        result = result + "\\r";
      } else if (ch === "\t") {
        result = result + "\\t";
      } else if (ch === "\b") {
        result = result + "\\b";
      } else if (ch === "\f") {
        result = result + "\\f";
      } else {
        code = str.charCodeAt(i);
        if (code < 32) {
          // Control characters as unicode escapes
          hex = code.toString(16);
          while (hex.length < 4) {
            hex = "0" + hex;
          }
          result = result + "\\u" + hex;
        } else {
          result = result + ch;
        }
      }
    }
    return '"' + result + '"';
  }

  /**
   * Core recursive serializer.
   */
  function serialize(value, level) {
    var type, keys, i, len, items, key, val, separator, newline, childIndent, currentIndent;

    // null
    if (value === null) {
      return "null";
    }

    // undefined
    if (typeof value === "undefined") {
      return "undefined";
    }

    type = typeof value;

    // boolean
    if (type === "boolean") {
      return value ? "true" : "false";
    }

    // number
    if (type === "number") {
      // NaN and Infinity serialize as null per JSON spec
      if (isNaN(value) || !isFinite(value)) {
        return "null";
      }
      return String(value);
    }

    // string
    if (type === "string") {
      return escapeString(value);
    }

    // arrays and objects — check for circular references
    if (type === "object") {
      // Circular reference detection
      if (seen.indexOf(value) !== -1) {
        return '"[Circular]"';
      }
      seen.push(value);

      if (indentSize > 0) {
        newline = "\n";
        childIndent = makeIndent(level + 1);
        currentIndent = makeIndent(level);
        separator = ",\n";
      } else {
        newline = "";
        childIndent = "";
        currentIndent = "";
        separator = ",";
      }

      // Array
      if (Array.isArray(value)) {
        len = value.length;
        if (len === 0) {
          seen.pop();
          return "[]";
        }
        items = [];
        for (i = 0; i < len; i++) {
          val = serialize(value[i], level + 1);
          // undefined inside arrays becomes null
          if (val === "undefined") {
            val = "null";
          }
          items.push(childIndent + val);
        }
        seen.pop();
        return "[" + newline + items.join(separator) + newline + currentIndent + "]";
      }

      // Plain object
      keys = Object.keys(value);
      len = keys.length;
      if (len === 0) {
        seen.pop();
        return "{}";
      }
      items = [];
      for (i = 0; i < len; i++) {
        key = keys[i];
        val = serialize(value[key], level + 1);
        // Skip undefined values in objects (standard JSON behavior)
        if (val === "undefined") {
          continue;
        }
        if (indentSize > 0) {
          items.push(childIndent + escapeString(key) + ": " + val);
        } else {
          items.push(escapeString(key) + ":" + val);
        }
      }
      if (items.length === 0) {
        seen.pop();
        return "{}";
      }
      seen.pop();
      return "{" + newline + items.join(separator) + newline + currentIndent + "}";
    }

    // Functions and other types — skip (return undefined, caller handles)
    return "undefined";
  }

  return serialize(obj, 0);
}
