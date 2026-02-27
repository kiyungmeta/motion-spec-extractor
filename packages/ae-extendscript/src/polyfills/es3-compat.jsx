// polyfills/es3-compat.jsx
// ES3-compatible polyfills for ExtendScript
// No dependencies

/**
 * Array.prototype.forEach polyfill
 */
if (!Array.prototype.forEach) {
  Array.prototype.forEach = function (callback, thisArg) {
    var i, len;
    if (this == null) {
      throw new TypeError("Array.prototype.forEach called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }
    len = this.length >>> 0;
    for (i = 0; i < len; i++) {
      if (i in this) {
        callback.call(thisArg, this[i], i, this);
      }
    }
  };
}

/**
 * Array.prototype.map polyfill
 */
if (!Array.prototype.map) {
  Array.prototype.map = function (callback, thisArg) {
    var result, i, len;
    if (this == null) {
      throw new TypeError("Array.prototype.map called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }
    len = this.length >>> 0;
    result = new Array(len);
    for (i = 0; i < len; i++) {
      if (i in this) {
        result[i] = callback.call(thisArg, this[i], i, this);
      }
    }
    return result;
  };
}

/**
 * Array.prototype.filter polyfill
 */
if (!Array.prototype.filter) {
  Array.prototype.filter = function (callback, thisArg) {
    var result, i, len, val;
    if (this == null) {
      throw new TypeError("Array.prototype.filter called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }
    len = this.length >>> 0;
    result = [];
    for (i = 0; i < len; i++) {
      if (i in this) {
        val = this[i];
        if (callback.call(thisArg, val, i, this)) {
          result.push(val);
        }
      }
    }
    return result;
  };
}

/**
 * Array.prototype.indexOf polyfill
 */
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function (searchElement, fromIndex) {
    var i, len;
    if (this == null) {
      throw new TypeError("Array.prototype.indexOf called on null or undefined");
    }
    len = this.length >>> 0;
    if (len === 0) {
      return -1;
    }
    i = fromIndex ? Number(fromIndex) : 0;
    if (i !== i) { // NaN check
      i = 0;
    }
    if (i < 0) {
      i = len + i;
      if (i < 0) {
        i = 0;
      }
    }
    for (; i < len; i++) {
      if (i in this && this[i] === searchElement) {
        return i;
      }
    }
    return -1;
  };
}

/**
 * Array.prototype.reduce polyfill
 */
if (!Array.prototype.reduce) {
  Array.prototype.reduce = function (callback, initialValue) {
    var accumulator, i, len, hasInitial;
    if (this == null) {
      throw new TypeError("Array.prototype.reduce called on null or undefined");
    }
    if (typeof callback !== "function") {
      throw new TypeError(callback + " is not a function");
    }
    len = this.length >>> 0;
    hasInitial = arguments.length >= 2;
    if (hasInitial) {
      accumulator = initialValue;
      i = 0;
    } else {
      // Find the first existing index
      i = 0;
      while (i < len && !(i in this)) {
        i++;
      }
      if (i >= len) {
        throw new TypeError("Reduce of empty array with no initial value");
      }
      accumulator = this[i];
      i++;
    }
    for (; i < len; i++) {
      if (i in this) {
        accumulator = callback(accumulator, this[i], i, this);
      }
    }
    return accumulator;
  };
}

/**
 * Array.isArray polyfill
 */
if (!Array.isArray) {
  Array.isArray = function (arg) {
    return Object.prototype.toString.call(arg) === "[object Array]";
  };
}

/**
 * String.prototype.trim polyfill
 */
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
  };
}

/**
 * Object.keys polyfill
 */
if (!Object.keys) {
  Object.keys = function (obj) {
    var keys, key;
    if (obj !== Object(obj)) {
      throw new TypeError("Object.keys called on a non-object");
    }
    keys = [];
    for (key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
}
