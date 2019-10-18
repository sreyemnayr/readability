(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

module.exports = iterate

var own = {}.hasOwnProperty

function iterate(values, callback, context) {
  var index = -1
  var result

  if (!values) {
    throw new Error('Iterate requires that |this| not be ' + values)
  }

  if (!own.call(values, 'length')) {
    throw new Error('Iterate requires that |this| has a `length`')
  }

  if (typeof callback !== 'function') {
    throw new Error('`callback` must be a function')
  }

  // The length might change, so we do not cache it.
  while (++index < values.length) {
    // Skip missing values.
    if (!(index in values)) {
      continue
    }

    result = callback.call(context, values[index], index, values)

    // If `callback` returns a `number`, move `index` over to `number`.
    if (typeof result === 'number') {
      // Make sure that negative numbers do not break the loop.
      if (result < 0) {
        index = 0
      }

      index = result - 1
    }
  }
}

},{}],2:[function(require,module,exports){
'use strict'

module.exports = automatedReadability

var characterWeight = 4.71
var sentenceWeight = 0.5
var base = 21.43

function automatedReadability(counts) {
  if (!counts || !counts.sentence || !counts.word || !counts.character) {
    return NaN
  }

  return (
    characterWeight * (counts.character / counts.word) +
    sentenceWeight * (counts.word / counts.sentence) -
    base
  )
}

},{}],3:[function(require,module,exports){
'use strict'

module.exports = bail

function bail(err) {
  if (err) {
    throw err
  }
}

},{}],4:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],5:[function(require,module,exports){

},{}],6:[function(require,module,exports){
/*!
 * Cross-Browser Split 1.1.1
 * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
 * Available under the MIT License
 * ECMAScript compliant, uniform cross-browser split method
 */

/**
 * Splits a string into an array of strings using a regex or string separator. Matches of the
 * separator are not included in the result array. However, if `separator` is a regex that contains
 * capturing groups, backreferences are spliced into the result each time `separator` is matched.
 * Fixes browser bugs compared to the native `String.prototype.split` and can be used reliably
 * cross-browser.
 * @param {String} str String to split.
 * @param {RegExp|String} separator Regex or string to use for separating the string.
 * @param {Number} [limit] Maximum number of items to include in the result array.
 * @returns {Array} Array of substrings.
 * @example
 *
 * // Basic use
 * split('a b c d', ' ');
 * // -> ['a', 'b', 'c', 'd']
 *
 * // With limit
 * split('a b c d', ' ', 2);
 * // -> ['a', 'b']
 *
 * // Backreferences in result array
 * split('..word1 word2..', /([a-z]+)(\d+)/i);
 * // -> ['..', 'word', '1', ' ', 'word', '2', '..']
 */
module.exports = (function split(undef) {

  var nativeSplit = String.prototype.split,
    compliantExecNpcg = /()??/.exec("")[1] === undef,
    // NPCG: nonparticipating capturing group
    self;

  self = function(str, separator, limit) {
    // If `separator` is not a regex, use `nativeSplit`
    if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
      return nativeSplit.call(str, separator, limit);
    }
    var output = [],
      flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
      (separator.sticky ? "y" : ""),
      // Firefox 3+
      lastLastIndex = 0,
      // Make `global` and avoid `lastIndex` issues by working with a copy
      separator = new RegExp(separator.source, flags + "g"),
      separator2, match, lastIndex, lastLength;
    str += ""; // Type-convert
    if (!compliantExecNpcg) {
      // Doesn't need flags gy, but they don't hurt
      separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
    }
    /* Values for `limit`, per the spec:
     * If undefined: 4294967295 // Math.pow(2, 32) - 1
     * If 0, Infinity, or NaN: 0
     * If positive number: limit = Math.floor(limit); if (limit > 4294967295) limit -= 4294967296;
     * If negative number: 4294967296 - Math.floor(Math.abs(limit))
     * If other: Type-convert, then use the above rules
     */
    limit = limit === undef ? -1 >>> 0 : // Math.pow(2, 32) - 1
    limit >>> 0; // ToUint32(limit)
    while (match = separator.exec(str)) {
      // `separator.lastIndex` is not reliable cross-browser
      lastIndex = match.index + match[0].length;
      if (lastIndex > lastLastIndex) {
        output.push(str.slice(lastLastIndex, match.index));
        // Fix browsers whose `exec` methods don't consistently return `undefined` for
        // nonparticipating capturing groups
        if (!compliantExecNpcg && match.length > 1) {
          match[0].replace(separator2, function() {
            for (var i = 1; i < arguments.length - 2; i++) {
              if (arguments[i] === undef) {
                match[i] = undef;
              }
            }
          });
        }
        if (match.length > 1 && match.index < str.length) {
          Array.prototype.push.apply(output, match.slice(1));
        }
        lastLength = match[0].length;
        lastLastIndex = lastIndex;
        if (output.length >= limit) {
          break;
        }
      }
      if (separator.lastIndex === match.index) {
        separator.lastIndex++; // Avoid an infinite loop
      }
    }
    if (lastLastIndex === str.length) {
      if (lastLength || !separator.test("")) {
        output.push("");
      }
    } else {
      output.push(str.slice(lastLastIndex));
    }
    return output.length > limit ? output.slice(0, limit) : output;
  };

  return self;
})();

},{}],7:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":4,"buffer":7,"ieee754":69}],8:[function(require,module,exports){
'use strict'

module.exports = colemanLiau

var letterWeight = 0.0588
var sentenceWeight = 0.296
var base = 15.8
var percentage = 100

function colemanLiau(counts) {
  if (!counts || !counts.sentence || !counts.word || !counts.letter) {
    return NaN
  }

  return (
    letterWeight * ((counts.letter / counts.word) * percentage) -
    sentenceWeight * ((counts.sentence / counts.word) * percentage) -
    base
  )
}

},{}],9:[function(require,module,exports){
'use strict';

var CTORS = {
	'int8': Int8Array,
	'uint8': Uint8Array,
	'uint8_clamped': Uint8ClampedArray,
	'int16': Int16Array,
	'uint16': Uint16Array,
	'int32': Int32Array,
	'uint32': Uint32Array,
	'float32': Float32Array,
	'float64': Float64Array,
	'generic': Array
};


// EXPORTS //

module.exports = CTORS;

},{}],10:[function(require,module,exports){
'use strict';

// CTORS //

var CTORS = require( './ctors.js' );


// GET CTOR //

/**
* FUNCTION: getCtor( dtype )
*	Returns an array constructor corresponding to an input data type.
*
* @param {String} dtype - data type
* @returns {Function|Null} array constructor or null
*/
function getCtor( dtype ) {
	return CTORS[ dtype ] || null;
} // end FUNCTION getCtor()


// EXPORTS //

module.exports = getCtor;

},{"./ctors.js":9}],11:[function(require,module,exports){
'use strict';

var DTYPES = {
	'Int8Array': 'int8',
	'Uint8Array': 'uint8',
	'Uint8ClampedArray': 'uint8_clamped',
	'Int16Array': 'int16',
	'Uint16Array': 'uint16',
	'Int32Array': 'int32',
	'Uint32Array': 'uint32',
	'Float32Array': 'float32',
	'Float64Array': 'float64',
	'Array': 'generic'
};


// EXPORTS //

module.exports = DTYPES;

},{}],12:[function(require,module,exports){
'use strict';

// DTYPES //

var DTYPES = require( './dtypes.js' );


// GET DTYPE //

/**
* FUNCTION: getType( name )
*	Returns an array data type corresponding to an array constructor name.
*
* @param {String} name - constructor name
* @returns {String|Null} array data type or null
*/
function getType( name ) {
	return DTYPES[ name ] || null;
} // end FUNCTION getType()


// EXPORTS //

module.exports = getType;

},{"./dtypes.js":11}],13:[function(require,module,exports){
'use strict';

// MODULES //

var typeName = require( 'type-name' ),
	getType = require( 'compute-array-dtype' );


// DTYPE //

/**
* FUNCTION: dtype( value )
*	Determines the data type of an input value.
*
* @param {*} value - input value
* @returns {String} data type
*/
function dtype( value ) {
	var type,
		dt;
	if ( value === null ) {
		return 'null';
	}
	// Check for base types:
	type = typeof value;
	switch ( type ) {
		case 'undefined':
		case 'boolean':
		case 'number':
		case 'string':
		case 'function':
		case 'symbol':
			return type;
	}
	// Resort to slower look-up:
	type = typeName( value );

	// Is value a known array type?
	dt = getType( type );
	if ( dt ) {
		return dt;
	}
	// Is value a buffer object?
	if ( type === 'Buffer' || type === 'ArrayBuffer' ) {
		return 'binary';
	}
	// Assume the value is a generic object (Object|Class instance) which could contain any or multiple data types...
	return 'generic';
} // end FUNCTION dtype()


// EXPORTS //

module.exports = dtype;

},{"compute-array-dtype":12,"type-name":121}],14:[function(require,module,exports){
/**
*
*	COMPUTE: indexspace
*
*
*	DESCRIPTION:
*		- Generates a linearly spaced index array from a subsequence string.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	isNonNegativeInteger = require( 'validate.io-nonnegative-integer' );


// VARIABLES //

var re = /^(?:(?:-(?=\d+))?\d*|end(?:-\d+|\/\d+)?):(?:(?:-(?=\d+))?\d*|end(?:-\d+|\/\d+)?)(?:\:(?=-?\d*)(?:-?\d+)?)?$/;

/**
*	^(...)
*	=> require that the string begin with either a digit (+ or -), an `end` keyword, or a colon
*
*	(?:(?:-(?=\d+))?\d*|end(?:-?\d+|/\\d+)?)
*	=> match but do not capture
*		(?:-(?=\d+))?
*		=> match but do not capture a minus sign but only if followed by one or more digits
*		\d*
*		=> 0 or more digits
*		|
*		=> OR
*		end(?:-\d+|/\d+)?
*		=> the word `end` exactly, which may be followed by either a minus sign and 1 or more digits or a division sign and 1 or more digits
*
*	:
*	=> match a colon exactly
*
*	(?:(?:-(?=\d+))?\d*|end(?:-\d+|/\\d+)?)
*	=> same as above
*
*	(?:\:(?=-?\d*)(?:-?\d+)?)?
*	=> match but do not capture
*		\:(?=-?\d*)
*		=> a colon but only if followed by either a possible minus sign and 0 or more digits
*		(?:-?\d+)?
*		=> match but do not capture a possible minus sign and 1 or more digits
*
*	$
*	=> require that the string end with either a digit, `end` keyword, or a colon.
*
*
* Examples:
*	-	:
*	-	::
*	-	4:
*	-	:4
*	-	::-1
*	-	3::-1
*	-	:10:2
*	-	1:3:1
*	-	9:1:-3
*	-	1:-1
*	-	:-1
*	-	-5:
*	-	1:-5:2
*	-	-9:10:1
*	-	-9:-4:2
*	-	-4:-9:-2
*	-	1:end:2
*	-	:end/2
*	-	end/2:end:5
*/

var reEnd = /^end/,
	reMatch = /(-|\/)(?=\d+)(\d+)?$/;


// INDEXSPACE

/**
* FUNCTION: indexspace( str, len )
*	Generates a linearly spaced index array from a subsequence string.
*
* @param {String} str - subsequence string
* @param {Number} len - reference array length
* @returns {Number[]} array of indices
*/
function indexspace( str, len ) {
	var x1,
		x2,
		tmp,
		inc,
		arr;
	if ( !isString( str ) || !re.test( str ) ) {
		throw new Error( 'indexspace()::invalid input argument. Invalid subsequence syntax. Please consult documentation. Value: `' + str + '`.' );
	}
	if ( !isNonNegativeInteger( len ) ) {
		throw new TypeError( 'indexspace()::invalid input argument. Reference array length must be a nonnegative integer. Value: `' + len + '`.' );
	}
	if ( !len ) {
		return [];
	}
	str = str.split( ':' );
	x1 = str[ 0 ];
	x2 = str[ 1 ];

	if ( str.length === 2 ) {
		inc = 1;
	} else {
		inc = parseInt( str[ 2 ], 10 );
	}
	// Handle zero increment...
	if ( inc === 0 ) {
		throw new Error( 'indexspace()::invalid syntax. Increment must be an integer not equal to 0. Value: `' + inc + '`.' );
	}

	// START //

	// Handle use of 'end' keyword...
	if ( reEnd.test( x1 ) ) {
		tmp = x1.match( reMatch );
		if ( tmp ) {
			if ( tmp[ 1 ] === '-' ) {
				x1 = len - 1 - parseInt( tmp[ 2 ], 10 );
				if ( x1 < 0 ) {
					// WARNING: forgive the user for exceeding the range bounds...
					x1 = 0;
				}
			} else {
				x1 = (len-1) / parseInt( tmp[ 2 ], 10 );
				x1 = Math.ceil( x1 );
			}
		} else {
			x1 = len - 1;
		}
	} else {
		x1 = parseInt( x1, 10 );

		// Handle empty index...
		if ( x1 !== x1 ) {
			// :-?\d*:-?\d+
			if ( inc < 0 ) {
				// Max index:
				x1 = len - 1;
			} else {
				// Min index:
				x1 = 0;
			}
		}
		// Handle negative index...
		else if ( x1 < 0 ) {
			x1 = len + x1; // len-x1
			if ( x1 < 0 ) {
				// WARNING: forgive the user for exceeding index bounds...
				x1 = 0;
			}
		}
		// Handle exceeding bounds...
		else if ( x1 >= len ) {
			return [];
		}
	}

	// END //

	// NOTE: here, we determine an inclusive `end` value; i.e., the last acceptable index value.

	// Handle use of 'end' keyword...
	if ( reEnd.test( x2 ) ) {
		tmp = x2.match( reMatch );
		if ( tmp ) {
			if ( tmp[ 1 ] === '-' ) {
				x2 = len - 1 - parseInt( tmp[ 2 ], 10 );
				if ( x2 < 0 ) {
					// WARNING: forgive the user for exceeding the range bounds...
					x2 = 0;
				}
			} else {
				x2 = (len-1) / parseInt( tmp[ 2 ], 10 );
				x2 = Math.ceil( x2 ) - 1;
			}
		} else {
			x2 = len - 1;
		}
	} else {
		x2 = parseInt( x2, 10 );

		// Handle empty index...
		if ( x2 !== x2 ) {
			// -?\d*::-?\d+
			if ( inc < 0 ) {
				// Min index:
				x2 = 0;
			} else {
				// Max index:
				x2 = len - 1;
			}
		}
		// Handle negative index...
		else if ( x2 < 0 ) {
			x2 = len + x2; // len-x2
			if ( x2 < 0 ) {
				// WARNING: forgive the user for exceeding index bounds...
				x2 = 0;
			}
			if ( inc > 0 ) {
				x2 = x2 - 1;
			}
		}
		// Handle positive index...
		else {
			if ( inc < 0 ) {
				x2 = x2 + 1;
			}
			else if ( x2 >= len ) {
				x2 = len - 1;
			}
			else {
				x2 = x2 - 1;
			}
		}
	}

	// INDICES //

	arr = [];
	if ( inc < 0 ) {
		if ( x2 > x1 ) {
			return arr;
		}
		while ( x1 >= x2 ) {
			arr.push( x1 );
			x1 += inc;
		}
	} else {
		if ( x1 > x2 ) {
			return arr;
		}
		while ( x1 <= x2 ) {
			arr.push( x1 );
			x1 += inc;
		}
	}
	return arr;
} // end FUNCTION indexspace()


// EXPORTS //

module.exports = indexspace;

},{"validate.io-nonnegative-integer":151,"validate.io-string-primitive":156}],15:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mean( arr, clbk )
*	Computes the arithmetic mean of an array using an accessor function.
*
* @param {Array} arr - input array
* @param {Function} clbk - accessor function for accessing array values
* @returns {Number|Null} arithmetic mean or null
*/
function mean( arr, clbk ) {
	var len = arr.length,
		delta,
		mu,
		i;

	if ( !len ) {
		return null;
	}
	mu = 0;
	for ( i = 0; i < len; i++ ) {
		delta = clbk( arr[ i ], i ) - mu;
		mu += delta / (i+1);
	}
	return mu;
} // end FUNCTION mean()


// EXPORTS //

module.exports = mean;

},{}],16:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mean( arr )
*	Computes the arithmetic mean of a numeric array.
*
* @param {Number[]|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} arr - input array
* @returns {Number|Null} arithmetic mean or null
*/
function mean( arr ) {
	var len = arr.length,
		delta,
		mu,
		i;

	if ( !len ) {
		return null;
	}
	mu = 0;
	for ( i = 0; i < len; i++ ) {
		delta = arr[ i ] - mu;
		mu += delta / (i+1);
	}
	return mu;
} // end FUNCTION mean()


// EXPORTS //

module.exports = mean;

},{}],17:[function(require,module,exports){
'use strict';

// MODULES //

var isArrayLike = require( 'validate.io-array-like' ),
	isMatrixLike = require( 'validate.io-matrix-like' ),
	ctors = require( 'compute-array-constructors' ),
	matrix = require( 'dstructs-matrix' ).raw,
	validate = require( './validate.js' );


// FUNCTIONS //

var mean1 = require( './array.js' ),
	mean2 = require( './accessor.js' ),
	mean3 = require( './matrix.js' );


// MEAN //

/**
* FUNCTION: mean( x[, opts] )
*	Computes the arithmetic mean.
*
* @param {Number[]|Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array|Matrix} x - input value
* @param {Object} [opts] - function options
* @param {Function} [opts.accessor] - accessor function for accessing array values
* @param {Number} [opts.dim=2] - dimension along which to compute the arithmetic mean.
* @param {String} [opts.dtype="float64"] - output data type
* @returns {Number|Matrix|Null} mean value(s) or null
*/
function mean( x, options ) {
	/* jshint newcap:false */
	var opts = {},
		shape,
		ctor,
		err,
		len,
		dim,
		dt,
		d,
		m;

	if ( arguments.length > 1 ) {
		err = validate( opts, options );
		if ( err ) {
			throw err;
		}
	}
	if ( isMatrixLike( x ) ) {
		dt = opts.dtype || 'float64';
		dim = opts.dim;

		// Determine if provided a vector...
		if ( x.shape[ 0 ] === 1 || x.shape[ 1 ] === 1 ) {
			// Treat as an array-like object:
			return mean1( x.data );
		}
		if ( dim > 2 ) {
			throw new RangeError( 'mean()::invalid option. Dimension option exceeds number of matrix dimensions. Option: `' + dim + '`.' );
		}
		if ( dim === void 0 || dim === 2 ) {
			len = x.shape[ 0 ];
			shape = [ len, 1 ];
		} else {
			len = x.shape[ 1 ];
			shape = [ 1, len ];
		}
		ctor = ctors( dt );
		if ( ctor === null ) {
			throw new Error( 'mean()::invalid option. Data type option does not have a corresponding array constructor. Option: `' + dt + '`.' );
		}
		// Create an output matrix and calculate the means:
		d = new ctor( len );
		m = matrix( d, shape, dt );
		return mean3( m, x, dim );
	}
	if ( isArrayLike( x ) ) {
		if ( opts.accessor ) {
			return mean2( x, opts.accessor );
		}
		return mean1( x );
	}
	throw new TypeError( 'mean()::invalid input argument. First argument must be either an array or a matrix. Value: `' + x + '`.' );
} // end FUNCTION mean()


// EXPORTS //

module.exports = mean;

},{"./accessor.js":15,"./array.js":16,"./matrix.js":18,"./validate.js":19,"compute-array-constructors":10,"dstructs-matrix":40,"validate.io-array-like":139,"validate.io-matrix-like":147}],18:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mean( out, mat[, dim] )
*	Computes the arithmetic mean along a matrix dimension.
*
* @param {Matrix} out - output matrix
* @param {Matrix} mat - input matrix
* @param {Number} [dim=2] - matrix dimension along which to compute an arithmetic mean. If `dim=1`, compute along matrix rows. If `dim=2`, compute along matrix columns.
* @returns {Matrix|Null} arithmetic means or null
*/
function mean( out, mat, dim ) {
	var delta,
		mu,
		M, N,
		s0, s1,
		o,
		i, j, k;

	if ( dim === 1 ) {
		// Compute along the rows...
		M = mat.shape[ 1 ];
		N = mat.shape[ 0 ];
		s0 = mat.strides[ 1 ];
		s1 = mat.strides[ 0 ];
	} else {
		// Compute along the columns...
		M = mat.shape[ 0 ];
		N = mat.shape[ 1 ];
		s0 = mat.strides[ 0 ];
		s1 = mat.strides[ 1 ];
	}
	if ( M === 0 || N === 0 ) {
		return null;
	}
	o = mat.offset;
	for ( i = 0; i < M; i++ ) {
		k = o + i*s0;
		mu = 0;
		for ( j = 0; j < N; j++ ) {
			delta = mat.data[ k + j*s1 ] - mu;
			mu += delta / (j+1);
		}
		out.data[ i ] = mu;
	}
	return out;
} // end FUNCTION mean()


// EXPORTS //

module.exports = mean;

},{}],19:[function(require,module,exports){
'use strict';

// MODULES //

var isObject = require( 'validate.io-object' ),
	isFunction = require( 'validate.io-function' ),
	isString = require( 'validate.io-string-primitive' ),
	isPositiveInteger = require( 'validate.io-positive-integer' );


// VALIDATE //

/**
* FUNCTION: validate( opts, options )
*	Validates function options.
*
* @param {Object} opts - destination for validated options
* @param {Object} options - function options
* @param {Function} [options.accessor] - accessor function for accessing array values
* @param {Number} [options.dim] - dimension
* @param {String} [options.dtype] - output data type
* @returns {Null|Error} null or an error
*/
function validate( opts, options ) {
	if ( !isObject( options ) ) {
		return new TypeError( 'mean()::invalid input argument. Options argument must be an object. Value: `' + options + '`.' );
	}
	if ( options.hasOwnProperty( 'accessor' ) ) {
		opts.accessor = options.accessor;
		if ( !isFunction( opts.accessor ) ) {
			return new TypeError( 'mean()::invalid option. Accessor must be a function. Option: `' + opts.accessor + '`.' );
		}
	}
	if ( options.hasOwnProperty( 'dim' ) ) {
		opts.dim = options.dim;
		if ( !isPositiveInteger( opts.dim ) ) {
			return new TypeError( 'mean()::invalid option. Dimension option must be a positive integer. Option: `' + opts.dim + '`.' );
		}
	}
	if ( options.hasOwnProperty( 'dtype' ) ) {
		opts.dtype = options.dtype;
		if ( !isString( opts.dtype ) ) {
			return new TypeError( 'mean()::invalid option. Data type option must be a string primitive. Option: `' + opts.dtype + '`.' );
		}
	}
	return null;
} // end FUNCTION validate()


// EXPORTS //

module.exports = validate;

},{"validate.io-function":144,"validate.io-object":154,"validate.io-positive-integer":155,"validate.io-string-primitive":156}],20:[function(require,module,exports){
/**
*
*	COMPUTE: median
*
*
*	DESCRIPTION:
*		- Computes the median of an array.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isObject = require( 'validate.io-object' ),
	isBoolean = require( 'validate.io-boolean' ),
	isFunction = require( 'validate.io-function' );


// FUNCTIONS //

/**
* FUNCTION: ascending( a, b )
*	Comparator function used to sort values in ascending order.
*
* @private
* @param {Number} a
* @param {Number} b
* @returns {Number} difference between `a` and `b`
*/
function ascending( a, b ) {
	return a - b;
} // end FUNCTION ascending()


// MEDIAN //

/**
* FUNCTION: median( arr[, options] )
*	Computes the median of an array.
*
* @param {Array} arr - input array
* @param {Object} [options] - function options
* @param {Boolean} [options.sorted] - boolean flag indicating if the array is sorted in ascending order
* @param {Function} [options.accessor] - accessor function for accessing array values
* @returns {Number|null} median value or null
*/
function median( arr, options ) {
	var sorted,
		clbk,
		len,
		id,
		d, i;

	if ( !isArray( arr ) ) {
		throw new TypeError( 'median()::invalid input argument. Must provide an array. Value: `' + arr + '`.' );
	}
	if ( arguments.length > 1 ) {
		if ( !isObject( options) ) {
			throw new TypeError( 'median()::invalid input argument. Options must be an object. Value: `' + options + '`.' );
		}
		if ( options.hasOwnProperty( 'sorted' ) ) {
			sorted = options.sorted;
			if ( !isBoolean( sorted ) ) {
				throw new TypeError( 'median()::invalid option. Sorted flag must be a boolean. Option: `' + sorted + '`.' );
			}
		}
		if ( options.hasOwnProperty( 'accessor' ) ) {
			clbk = options.accessor;
			if ( !isFunction( clbk ) ) {
				throw new TypeError( 'median()::invalid option. Accessor must be a function. Option: `' + clbk + '`.' );
			}
		}
	}
	len = arr.length;
	if ( !len ) {
		return null;
	}
	if ( !clbk && sorted ) {
		d = arr;
	}
	else if ( !clbk ) {
		d = [];
		for ( i = 0; i < len; i++ ) {
			d.push( arr[ i ] );
		}
	}
	else {
		d = [];
		for ( i = 0; i < len; i++ ) {
			d.push( clbk( arr[ i ] ) );
		}
	}
	if ( !sorted ) {
		d.sort( ascending );
	}
	// Get the middle index:
	id = Math.floor( len / 2 );

	if ( len % 2 ) {
		// The number of elements is not evenly divisible by two, hence we have a middle index:
		return d[ id ];
	}
	// Even number of elements, so must take the mean of the two middle values:
	return ( d[ id-1 ] + d[ id ] ) / 2.0;
} // end FUNCTION median()


// EXPORTS //

module.exports = median;

},{"validate.io-array":140,"validate.io-boolean":141,"validate.io-function":144,"validate.io-object":154}],21:[function(require,module,exports){
/**
*
*	COMPUTE: mode
*
*
*	DESCRIPTION:
*		- Computes the mode of an array.
*
*
*	NOTES:
*		[1] 
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

(function() {
	'use strict';

	/**
	* FUNCTION: mode( arr )
	*	Computes the mode of an array.
	*
	* @param {Array} arr - array of values
	* @returns {Array} mode
	*/
	function mode( arr ) {
		if ( !Array.isArray( arr ) ) {
			throw new TypeError( 'mode()::invalid input argument. Must provide an array.' );
		}
		var len = arr.length,
			count = {},
			max = 0,
			vals = [],
			val;

		for ( var i = 0; i < len; i++ ) {
			val = arr[ i ];
			if ( !count[ val ] ) {
				count[ val ] = 0;
			}
			count[ val ] += 1;
			if ( count[ val ] === max ) {
				vals.push( val );
			} else {
				max = count[ val ];
				vals = [ val ];
			}
		}
		return vals.sort( function sort( a, b ) {
			return a - b;
		});
	} // end FUNCTION mode()


	// EXPORTS //

	module.exports = mode;

})();
},{}],22:[function(require,module,exports){
'use strict';

// EXPORTS //

module.exports = 4294967295; // 2**32 - 1

},{}],23:[function(require,module,exports){
'use strict';

// EXPORTS //

module.exports = Number.POSITIVE_INFINITY;

},{}],24:[function(require,module,exports){
'use strict'

module.exports = daleChall
daleChall.gradeLevel = daleChallGradeLevel

var difficultWordWeight = 0.1579
var wordWeight = 0.0496
var difficultWordThreshold = 0.05
var percentage = 100
var adjustment = 3.6365

// Grade map associated with the scores.
var gradeMap = {
  4: [0, 4],
  5: [5, 6],
  6: [7, 8],
  7: [9, 10],
  8: [11, 12],
  9: [13, 15],
  10: [16, Infinity],
  NaN: [NaN, NaN]
}

function daleChall(counts) {
  var percentageOfDifficultWords
  var score

  if (!counts || !counts.sentence || !counts.word) {
    return NaN
  }

  percentageOfDifficultWords = (counts.difficultWord || 0) / counts.word

  score =
    difficultWordWeight * percentageOfDifficultWords * percentage +
    (wordWeight * counts.word) / counts.sentence

  if (percentageOfDifficultWords > difficultWordThreshold) {
    score += adjustment
  }

  return score
}

// Mapping between a dale-chall score and a U.S. grade level.
function daleChallGradeLevel(score) {
  score = Math.floor(score)

  if (score < 5) {
    score = 4
  } else if (score > 9) {
    score = 10
  }

  return gradeMap[score].concat()
}

},{}],25:[function(require,module,exports){
module.exports=[
  "a",
  "able",
  "aboard",
  "about",
  "above",
  "absent",
  "accept",
  "accident",
  "account",
  "ache",
  "aching",
  "acorn",
  "acre",
  "across",
  "act",
  "acts",
  "add",
  "address",
  "admire",
  "adventure",
  "afar",
  "afraid",
  "after",
  "afternoon",
  "afterward",
  "afterwards",
  "again",
  "against",
  "age",
  "aged",
  "ago",
  "agree",
  "ah",
  "ahead",
  "aid",
  "aim",
  "air",
  "airfield",
  "airplane",
  "airport",
  "airship",
  "airy",
  "alarm",
  "alike",
  "alive",
  "all",
  "alley",
  "alligator",
  "allow",
  "almost",
  "alone",
  "along",
  "aloud",
  "already",
  "also",
  "always",
  "am",
  "america",
  "american",
  "among",
  "amount",
  "an",
  "and",
  "angel",
  "anger",
  "angry",
  "animal",
  "another",
  "answer",
  "ant",
  "any",
  "anybody",
  "anyhow",
  "anyone",
  "anything",
  "anyway",
  "anywhere",
  "apart",
  "apartment",
  "ape",
  "apiece",
  "appear",
  "apple",
  "april",
  "apron",
  "are",
  "aren't",
  "arise",
  "arithmetic",
  "arm",
  "armful",
  "army",
  "arose",
  "around",
  "arrange",
  "arrive",
  "arrived",
  "arrow",
  "art",
  "artist",
  "as",
  "ash",
  "ashes",
  "aside",
  "ask",
  "asleep",
  "at",
  "ate",
  "attack",
  "attend",
  "attention",
  "august",
  "aunt",
  "author",
  "auto",
  "automobile",
  "autumn",
  "avenue",
  "awake",
  "awaken",
  "away",
  "awful",
  "awfully",
  "awhile",
  "ax",
  "axe",
  "baa",
  "babe",
  "babies",
  "back",
  "background",
  "backward",
  "backwards",
  "bacon",
  "bad",
  "badge",
  "badly",
  "bag",
  "bake",
  "baker",
  "bakery",
  "baking",
  "ball",
  "balloon",
  "banana",
  "band",
  "bandage",
  "bang",
  "banjo",
  "bank",
  "banker",
  "bar",
  "barber",
  "bare",
  "barefoot",
  "barely",
  "bark",
  "barn",
  "barrel",
  "base",
  "baseball",
  "basement",
  "basket",
  "bat",
  "batch",
  "bath",
  "bathe",
  "bathing",
  "bathroom",
  "bathtub",
  "battle",
  "battleship",
  "bay",
  "be",
  "beach",
  "bead",
  "beam",
  "bean",
  "bear",
  "beard",
  "beast",
  "beat",
  "beating",
  "beautiful",
  "beautify",
  "beauty",
  "became",
  "because",
  "become",
  "becoming",
  "bed",
  "bedbug",
  "bedroom",
  "bedspread",
  "bedtime",
  "bee",
  "beech",
  "beef",
  "beefsteak",
  "beehive",
  "been",
  "beer",
  "beet",
  "before",
  "beg",
  "began",
  "beggar",
  "begged",
  "begin",
  "beginning",
  "begun",
  "behave",
  "behind",
  "being",
  "believe",
  "bell",
  "belong",
  "below",
  "belt",
  "bench",
  "bend",
  "beneath",
  "bent",
  "berries",
  "berry",
  "beside",
  "besides",
  "best",
  "bet",
  "better",
  "between",
  "bib",
  "bible",
  "bicycle",
  "bid",
  "big",
  "bigger",
  "bill",
  "billboard",
  "bin",
  "bind",
  "bird",
  "birth",
  "birthday",
  "biscuit",
  "bit",
  "bite",
  "biting",
  "bitter",
  "black",
  "blackberry",
  "blackbird",
  "blackboard",
  "blackness",
  "blacksmith",
  "blame",
  "blank",
  "blanket",
  "blast",
  "blaze",
  "bleed",
  "bless",
  "blessing",
  "blew",
  "blind",
  "blindfold",
  "blinds",
  "block",
  "blood",
  "bloom",
  "blossom",
  "blot",
  "blow",
  "blue",
  "blueberry",
  "bluebird",
  "blush",
  "board",
  "boast",
  "boat",
  "bob",
  "bobwhite",
  "bodies",
  "body",
  "boil",
  "boiler",
  "bold",
  "bone",
  "bonnet",
  "boo",
  "book",
  "bookcase",
  "bookkeeper",
  "boom",
  "boot",
  "born",
  "borrow",
  "boss",
  "both",
  "bother",
  "bottle",
  "bottom",
  "bought",
  "bounce",
  "bow",
  "bow-wow",
  "bowl",
  "box",
  "boxcar",
  "boxer",
  "boxes",
  "boy",
  "boyhood",
  "bracelet",
  "brain",
  "brake",
  "bran",
  "branch",
  "brass",
  "brave",
  "bread",
  "break",
  "breakfast",
  "breast",
  "breath",
  "breathe",
  "breeze",
  "brick",
  "bride",
  "bridge",
  "bright",
  "brightness",
  "bring",
  "broad",
  "broadcast",
  "broke",
  "broken",
  "brook",
  "broom",
  "brother",
  "brought",
  "brown",
  "brush",
  "bubble",
  "bucket",
  "buckle",
  "bud",
  "buffalo",
  "bug",
  "buggy",
  "build",
  "building",
  "built",
  "bulb",
  "bull",
  "bullet",
  "bum",
  "bumblebee",
  "bump",
  "bun",
  "bunch",
  "bundle",
  "bunny",
  "burn",
  "burst",
  "bury",
  "bus",
  "bush",
  "bushel",
  "business",
  "busy",
  "but",
  "butcher",
  "butt",
  "butter",
  "buttercup",
  "butterfly",
  "buttermilk",
  "butterscotch",
  "button",
  "buttonhole",
  "buy",
  "buzz",
  "by",
  "bye",
  "cab",
  "cabbage",
  "cabin",
  "cabinet",
  "cackle",
  "cage",
  "cake",
  "calendar",
  "calf",
  "call",
  "caller",
  "calling",
  "came",
  "camel",
  "camp",
  "campfire",
  "can",
  "can't",
  "canal",
  "canary",
  "candle",
  "candlestick",
  "candy",
  "cane",
  "cannon",
  "cannot",
  "canoe",
  "canyon",
  "cap",
  "cape",
  "capital",
  "captain",
  "car",
  "card",
  "cardboard",
  "care",
  "careful",
  "careless",
  "carelessness",
  "carload",
  "carpenter",
  "carpet",
  "carriage",
  "carrot",
  "carry",
  "cart",
  "carve",
  "case",
  "cash",
  "cashier",
  "castle",
  "cat",
  "catbird",
  "catch",
  "catcher",
  "caterpillar",
  "catfish",
  "catsup",
  "cattle",
  "caught",
  "cause",
  "cave",
  "ceiling",
  "cell",
  "cellar",
  "cent",
  "center",
  "cereal",
  "certain",
  "certainly",
  "chain",
  "chair",
  "chalk",
  "champion",
  "chance",
  "change",
  "chap",
  "charge",
  "charm",
  "chart",
  "chase",
  "chatter",
  "cheap",
  "cheat",
  "check",
  "checkers",
  "cheek",
  "cheer",
  "cheese",
  "cherry",
  "chest",
  "chew",
  "chick",
  "chicken",
  "chief",
  "child",
  "childhood",
  "children",
  "chill",
  "chilly",
  "chimney",
  "chin",
  "china",
  "chip",
  "chipmunk",
  "chocolate",
  "choice",
  "choose",
  "chop",
  "chorus",
  "chose",
  "chosen",
  "christen",
  "christmas",
  "church",
  "churn",
  "cigarette",
  "circle",
  "circus",
  "citizen",
  "city",
  "clang",
  "clap",
  "class",
  "classmate",
  "classroom",
  "claw",
  "clay",
  "clean",
  "cleaner",
  "clear",
  "clerk",
  "clever",
  "click",
  "cliff",
  "climb",
  "clip",
  "cloak",
  "clock",
  "close",
  "closet",
  "cloth",
  "clothes",
  "clothing",
  "cloud",
  "cloudy",
  "clover",
  "clown",
  "club",
  "cluck",
  "clump",
  "coach",
  "coal",
  "coast",
  "coat",
  "cob",
  "cobbler",
  "cocoa",
  "coconut",
  "cocoon",
  "cod",
  "codfish",
  "coffee",
  "coffeepot",
  "coin",
  "cold",
  "collar",
  "college",
  "color",
  "colored",
  "colt",
  "column",
  "comb",
  "come",
  "comfort",
  "comic",
  "coming",
  "company",
  "compare",
  "conductor",
  "cone",
  "connect",
  "coo",
  "cook",
  "cooked",
  "cookie",
  "cookies",
  "cooking",
  "cool",
  "cooler",
  "coop",
  "copper",
  "copy",
  "cord",
  "cork",
  "corn",
  "corner",
  "correct",
  "cost",
  "cot",
  "cottage",
  "cotton",
  "couch",
  "cough",
  "could",
  "couldn't",
  "count",
  "counter",
  "country",
  "county",
  "course",
  "court",
  "cousin",
  "cover",
  "cow",
  "coward",
  "cowardly",
  "cowboy",
  "cozy",
  "crab",
  "crack",
  "cracker",
  "cradle",
  "cramps",
  "cranberry",
  "crank",
  "cranky",
  "crash",
  "crawl",
  "crazy",
  "cream",
  "creamy",
  "creek",
  "creep",
  "crept",
  "cried",
  "cries",
  "croak",
  "crook",
  "crooked",
  "crop",
  "cross",
  "cross-eyed",
  "crossing",
  "crow",
  "crowd",
  "crowded",
  "crown",
  "cruel",
  "crumb",
  "crumble",
  "crush",
  "crust",
  "cry",
  "cub",
  "cuff",
  "cup",
  "cupboard",
  "cupful",
  "cure",
  "curl",
  "curly",
  "curtain",
  "curve",
  "cushion",
  "custard",
  "customer",
  "cut",
  "cute",
  "cutting",
  "dab",
  "dad",
  "daddy",
  "daily",
  "dairy",
  "daisy",
  "dam",
  "damage",
  "dame",
  "damp",
  "dance",
  "dancer",
  "dancing",
  "dandy",
  "danger",
  "dangerous",
  "dare",
  "dark",
  "darkness",
  "darling",
  "darn",
  "dart",
  "dash",
  "date",
  "daughter",
  "dawn",
  "day",
  "daybreak",
  "daytime",
  "dead",
  "deaf",
  "deal",
  "dear",
  "death",
  "december",
  "decide",
  "deck",
  "deed",
  "deep",
  "deer",
  "defeat",
  "defend",
  "defense",
  "delight",
  "den",
  "dentist",
  "depend",
  "deposit",
  "describe",
  "desert",
  "deserve",
  "desire",
  "desk",
  "destroy",
  "devil",
  "dew",
  "diamond",
  "did",
  "didn't",
  "die",
  "died",
  "dies",
  "difference",
  "different",
  "dig",
  "dim",
  "dime",
  "dine",
  "ding-dong",
  "dinner",
  "dip",
  "direct",
  "direction",
  "dirt",
  "dirty",
  "discover",
  "dish",
  "dislike",
  "dismiss",
  "ditch",
  "dive",
  "diver",
  "divide",
  "do",
  "dock",
  "doctor",
  "does",
  "doesn't",
  "dog",
  "doll",
  "dollar",
  "dolly",
  "don't",
  "done",
  "donkey",
  "door",
  "doorbell",
  "doorknob",
  "doorstep",
  "dope",
  "dot",
  "double",
  "dough",
  "dove",
  "down",
  "downstairs",
  "downtown",
  "dozen",
  "drag",
  "drain",
  "drank",
  "draw",
  "drawer",
  "drawing",
  "dream",
  "dress",
  "dresser",
  "dressmaker",
  "drew",
  "dried",
  "drift",
  "drill",
  "drink",
  "drip",
  "drive",
  "driven",
  "driver",
  "drop",
  "drove",
  "drown",
  "drowsy",
  "drub",
  "drum",
  "drunk",
  "dry",
  "duck",
  "due",
  "dug",
  "dull",
  "dumb",
  "dump",
  "during",
  "dust",
  "dusty",
  "duty",
  "dwarf",
  "dwell",
  "dwelt",
  "dying",
  "each",
  "eager",
  "eagle",
  "ear",
  "early",
  "earn",
  "earth",
  "east",
  "eastern",
  "easy",
  "eat",
  "eaten",
  "edge",
  "egg",
  "eh",
  "eight",
  "eighteen",
  "eighth",
  "eighty",
  "either",
  "elbow",
  "elder",
  "eldest",
  "electric",
  "electricity",
  "elephant",
  "eleven",
  "elf",
  "elm",
  "else",
  "elsewhere",
  "empty",
  "end",
  "ending",
  "enemy",
  "engine",
  "engineer",
  "english",
  "enjoy",
  "enough",
  "enter",
  "envelope",
  "equal",
  "erase",
  "eraser",
  "errand",
  "escape",
  "eve",
  "even",
  "evening",
  "ever",
  "every",
  "everybody",
  "everyday",
  "everyone",
  "everything",
  "everywhere",
  "evil",
  "exact",
  "except",
  "exchange",
  "excited",
  "exciting",
  "excuse",
  "exit",
  "expect",
  "explain",
  "extra",
  "eye",
  "eyebrow",
  "fable",
  "face",
  "facing",
  "fact",
  "factory",
  "fail",
  "faint",
  "fair",
  "fairy",
  "faith",
  "fake",
  "fall",
  "false",
  "family",
  "fan",
  "fancy",
  "far",
  "far-off",
  "faraway",
  "fare",
  "farm",
  "farmer",
  "farming",
  "farther",
  "fashion",
  "fast",
  "fasten",
  "fat",
  "father",
  "fault",
  "favor",
  "favorite",
  "fear",
  "feast",
  "feather",
  "february",
  "fed",
  "feed",
  "feel",
  "feet",
  "fell",
  "fellow",
  "felt",
  "fence",
  "fever",
  "few",
  "fib",
  "fiddle",
  "field",
  "fife",
  "fifteen",
  "fifth",
  "fifty",
  "fig",
  "fight",
  "figure",
  "file",
  "fill",
  "film",
  "finally",
  "find",
  "fine",
  "finger",
  "finish",
  "fire",
  "firearm",
  "firecracker",
  "fireplace",
  "fireworks",
  "firing",
  "first",
  "fish",
  "fisherman",
  "fist",
  "fit",
  "fits",
  "five",
  "fix",
  "flag",
  "flake",
  "flame",
  "flap",
  "flash",
  "flashlight",
  "flat",
  "flea",
  "flesh",
  "flew",
  "flies",
  "flight",
  "flip",
  "flip-flop",
  "float",
  "flock",
  "flood",
  "floor",
  "flop",
  "flour",
  "flow",
  "flower",
  "flowery",
  "flutter",
  "fly",
  "foam",
  "fog",
  "foggy",
  "fold",
  "folks",
  "follow",
  "following",
  "fond",
  "food",
  "fool",
  "foolish",
  "foot",
  "football",
  "footprint",
  "for",
  "forehead",
  "forest",
  "forget",
  "forgive",
  "forgot",
  "forgotten",
  "fork",
  "form",
  "fort",
  "forth",
  "fortune",
  "forty",
  "forward",
  "fought",
  "found",
  "fountain",
  "four",
  "fourteen",
  "fourth",
  "fox",
  "frame",
  "free",
  "freedom",
  "freeze",
  "freight",
  "french",
  "fresh",
  "fret",
  "friday",
  "fried",
  "friend",
  "friendly",
  "friendship",
  "frighten",
  "frog",
  "from",
  "front",
  "frost",
  "frown",
  "froze",
  "fruit",
  "fry",
  "fudge",
  "fuel",
  "full",
  "fully",
  "fun",
  "funny",
  "fur",
  "furniture",
  "further",
  "fuzzy",
  "gain",
  "gallon",
  "gallop",
  "game",
  "gang",
  "garage",
  "garbage",
  "garden",
  "gas",
  "gasoline",
  "gate",
  "gather",
  "gave",
  "gay",
  "gear",
  "geese",
  "general",
  "gentle",
  "gentleman",
  "gentlemen",
  "geography",
  "get",
  "getting",
  "giant",
  "gift",
  "gingerbread",
  "girl",
  "give",
  "given",
  "giving",
  "glad",
  "gladly",
  "glance",
  "glass",
  "glasses",
  "gleam",
  "glide",
  "glory",
  "glove",
  "glow",
  "glue",
  "go",
  "goal",
  "goat",
  "gobble",
  "god",
  "godmother",
  "goes",
  "going",
  "gold",
  "golden",
  "goldfish",
  "golf",
  "gone",
  "good",
  "good-by",
  "good-bye",
  "good-looking",
  "goodbye",
  "goodness",
  "goods",
  "goody",
  "goose",
  "gooseberry",
  "got",
  "govern",
  "government",
  "gown",
  "grab",
  "gracious",
  "grade",
  "grain",
  "grand",
  "grandchild",
  "grandchildren",
  "granddaughter",
  "grandfather",
  "grandma",
  "grandmother",
  "grandpa",
  "grandson",
  "grandstand",
  "grape",
  "grapefruit",
  "grapes",
  "grass",
  "grasshopper",
  "grateful",
  "grave",
  "gravel",
  "graveyard",
  "gravy",
  "gray",
  "graze",
  "grease",
  "great",
  "green",
  "greet",
  "grew",
  "grind",
  "groan",
  "grocery",
  "ground",
  "group",
  "grove",
  "grow",
  "guard",
  "guess",
  "guest",
  "guide",
  "gulf",
  "gum",
  "gun",
  "gunpowder",
  "guy",
  "ha",
  "habit",
  "had",
  "hadn't",
  "hail",
  "hair",
  "haircut",
  "hairpin",
  "half",
  "hall",
  "halt",
  "ham",
  "hammer",
  "hand",
  "handful",
  "handkerchief",
  "handle",
  "handwriting",
  "hang",
  "happen",
  "happily",
  "happiness",
  "happy",
  "harbor",
  "hard",
  "hardly",
  "hardship",
  "hardware",
  "hare",
  "hark",
  "harm",
  "harness",
  "harp",
  "harvest",
  "has",
  "hasn't",
  "haste",
  "hasten",
  "hasty",
  "hat",
  "hatch",
  "hatchet",
  "hate",
  "haul",
  "have",
  "haven't",
  "having",
  "hawk",
  "hay",
  "hayfield",
  "haystack",
  "he",
  "he'd",
  "he'll",
  "he's",
  "head",
  "headache",
  "heal",
  "health",
  "healthy",
  "heap",
  "hear",
  "heard",
  "hearing",
  "heart",
  "heat",
  "heater",
  "heaven",
  "heavy",
  "heel",
  "height",
  "held",
  "hell",
  "hello",
  "helmet",
  "help",
  "helper",
  "helpful",
  "hem",
  "hen",
  "henhouse",
  "her",
  "herd",
  "here",
  "here's",
  "hero",
  "hers",
  "herself",
  "hey",
  "hickory",
  "hid",
  "hidden",
  "hide",
  "high",
  "highway",
  "hill",
  "hillside",
  "hilltop",
  "hilly",
  "him",
  "himself",
  "hind",
  "hint",
  "hip",
  "hire",
  "his",
  "hiss",
  "history",
  "hit",
  "hitch",
  "hive",
  "ho",
  "hoe",
  "hog",
  "hold",
  "holder",
  "hole",
  "holiday",
  "hollow",
  "holy",
  "home",
  "homely",
  "homesick",
  "honest",
  "honey",
  "honeybee",
  "honeymoon",
  "honk",
  "honor",
  "hood",
  "hoof",
  "hook",
  "hoop",
  "hop",
  "hope",
  "hopeful",
  "hopeless",
  "horn",
  "horse",
  "horseback",
  "horseshoe",
  "hose",
  "hospital",
  "host",
  "hot",
  "hotel",
  "hound",
  "hour",
  "house",
  "housetop",
  "housewife",
  "housework",
  "how",
  "however",
  "howl",
  "hug",
  "huge",
  "hum",
  "humble",
  "hump",
  "hundred",
  "hung",
  "hunger",
  "hungry",
  "hunk",
  "hunt",
  "hunter",
  "hurrah",
  "hurried",
  "hurry",
  "hurt",
  "husband",
  "hush",
  "hut",
  "hymn",
  "i",
  "i'd",
  "i'll",
  "i'm",
  "i've",
  "ice",
  "icy",
  "idea",
  "ideal",
  "if",
  "ill",
  "important",
  "impossible",
  "improve",
  "in",
  "inch",
  "inches",
  "income",
  "indeed",
  "indian",
  "indoors",
  "ink",
  "inn",
  "insect",
  "inside",
  "instant",
  "instead",
  "insult",
  "intend",
  "interested",
  "interesting",
  "into",
  "invite",
  "iron",
  "is",
  "island",
  "isn't",
  "it",
  "it's",
  "its",
  "itself",
  "ivory",
  "ivy",
  "jacket",
  "jacks",
  "jail",
  "jam",
  "january",
  "jar",
  "jaw",
  "jay",
  "jelly",
  "jellyfish",
  "jerk",
  "jig",
  "job",
  "jockey",
  "join",
  "joke",
  "joking",
  "jolly",
  "journey",
  "joy",
  "joyful",
  "joyous",
  "judge",
  "jug",
  "juice",
  "juicy",
  "july",
  "jump",
  "june",
  "junior",
  "junk",
  "just",
  "keen",
  "keep",
  "kept",
  "kettle",
  "key",
  "kick",
  "kid",
  "kill",
  "killed",
  "kind",
  "kindly",
  "kindness",
  "king",
  "kingdom",
  "kiss",
  "kitchen",
  "kite",
  "kitten",
  "kitty",
  "knee",
  "kneel",
  "knew",
  "knife",
  "knit",
  "knives",
  "knob",
  "knock",
  "knot",
  "know",
  "known",
  "lace",
  "lad",
  "ladder",
  "ladies",
  "lady",
  "laid",
  "lake",
  "lamb",
  "lame",
  "lamp",
  "land",
  "lane",
  "language",
  "lantern",
  "lap",
  "lard",
  "large",
  "lash",
  "lass",
  "last",
  "late",
  "laugh",
  "laundry",
  "law",
  "lawn",
  "lawyer",
  "lay",
  "lazy",
  "lead",
  "leader",
  "leaf",
  "leak",
  "lean",
  "leap",
  "learn",
  "learned",
  "least",
  "leather",
  "leave",
  "leaving",
  "led",
  "left",
  "leg",
  "lemon",
  "lemonade",
  "lend",
  "length",
  "less",
  "lesson",
  "let",
  "let's",
  "letter",
  "letting",
  "lettuce",
  "level",
  "liberty",
  "library",
  "lice",
  "lick",
  "lid",
  "lie",
  "life",
  "lift",
  "light",
  "lightness",
  "lightning",
  "like",
  "likely",
  "liking",
  "lily",
  "limb",
  "lime",
  "limp",
  "line",
  "linen",
  "lion",
  "lip",
  "list",
  "listen",
  "lit",
  "little",
  "live",
  "lively",
  "liver",
  "lives",
  "living",
  "lizard",
  "load",
  "loaf",
  "loan",
  "loaves",
  "lock",
  "locomotive",
  "log",
  "lone",
  "lonely",
  "lonesome",
  "long",
  "look",
  "lookout",
  "loop",
  "loose",
  "lord",
  "lose",
  "loser",
  "loss",
  "lost",
  "lot",
  "loud",
  "love",
  "lovely",
  "lover",
  "low",
  "luck",
  "lucky",
  "lumber",
  "lump",
  "lunch",
  "lying",
  "ma",
  "machine",
  "machinery",
  "mad",
  "made",
  "magazine",
  "magic",
  "maid",
  "mail",
  "mailbox",
  "mailman",
  "major",
  "make",
  "making",
  "male",
  "mama",
  "mamma",
  "man",
  "manager",
  "mane",
  "manger",
  "many",
  "map",
  "maple",
  "marble",
  "march",
  "mare",
  "mark",
  "market",
  "marriage",
  "married",
  "marry",
  "mask",
  "mast",
  "master",
  "mat",
  "match",
  "matter",
  "mattress",
  "may",
  "maybe",
  "mayor",
  "maypole",
  "me",
  "meadow",
  "meal",
  "mean",
  "means",
  "meant",
  "measure",
  "meat",
  "medicine",
  "meet",
  "meeting",
  "melt",
  "member",
  "men",
  "mend",
  "meow",
  "merry",
  "mess",
  "message",
  "met",
  "metal",
  "mew",
  "mice",
  "middle",
  "midnight",
  "might",
  "mighty",
  "mile",
  "miler",
  "milk",
  "milkman",
  "mill",
  "million",
  "mind",
  "mine",
  "miner",
  "mint",
  "minute",
  "mirror",
  "mischief",
  "miss",
  "misspell",
  "mistake",
  "misty",
  "mitt",
  "mitten",
  "mix",
  "moment",
  "monday",
  "money",
  "monkey",
  "month",
  "moo",
  "moon",
  "moonlight",
  "moose",
  "mop",
  "more",
  "morning",
  "morrow",
  "moss",
  "most",
  "mostly",
  "mother",
  "motor",
  "mount",
  "mountain",
  "mouse",
  "mouth",
  "move",
  "movie",
  "movies",
  "moving",
  "mow",
  "mr.",
  "mrs.",
  "much",
  "mud",
  "muddy",
  "mug",
  "mule",
  "multiply",
  "murder",
  "music",
  "must",
  "my",
  "myself",
  "nail",
  "name",
  "nap",
  "napkin",
  "narrow",
  "nasty",
  "naughty",
  "navy",
  "near",
  "nearby",
  "nearly",
  "neat",
  "neck",
  "necktie",
  "need",
  "needle",
  "needn't",
  "negro",
  "neighbor",
  "neighborhood",
  "neither",
  "nerve",
  "nest",
  "net",
  "never",
  "nevermore",
  "new",
  "news",
  "newspaper",
  "next",
  "nibble",
  "nice",
  "nickel",
  "night",
  "nightgown",
  "nine",
  "nineteen",
  "ninety",
  "no",
  "nobody",
  "nod",
  "noise",
  "noisy",
  "none",
  "noon",
  "nor",
  "north",
  "northern",
  "nose",
  "not",
  "note",
  "nothing",
  "notice",
  "november",
  "now",
  "nowhere",
  "number",
  "nurse",
  "nut",
  "o'clock",
  "oak",
  "oar",
  "oatmeal",
  "oats",
  "obey",
  "ocean",
  "october",
  "odd",
  "of",
  "off",
  "offer",
  "office",
  "officer",
  "often",
  "oh",
  "oil",
  "old",
  "old-fashioned",
  "on",
  "once",
  "one",
  "onion",
  "only",
  "onward",
  "open",
  "or",
  "orange",
  "orchard",
  "order",
  "ore",
  "organ",
  "other",
  "otherwise",
  "ouch",
  "ought",
  "our",
  "ours",
  "ourselves",
  "out",
  "outdoors",
  "outfit",
  "outlaw",
  "outline",
  "outside",
  "outward",
  "oven",
  "over",
  "overalls",
  "overcoat",
  "overeat",
  "overhead",
  "overhear",
  "overnight",
  "overturn",
  "owe",
  "owing",
  "owl",
  "own",
  "owner",
  "ox",
  "pa",
  "pace",
  "pack",
  "package",
  "pad",
  "page",
  "paid",
  "pail",
  "pain",
  "painful",
  "paint",
  "painter",
  "painting",
  "pair",
  "pal",
  "palace",
  "pale",
  "pan",
  "pancake",
  "pane",
  "pansy",
  "pants",
  "papa",
  "paper",
  "parade",
  "pardon",
  "parent",
  "park",
  "part",
  "partly",
  "partner",
  "party",
  "pass",
  "passenger",
  "past",
  "paste",
  "pasture",
  "pat",
  "patch",
  "path",
  "patter",
  "pave",
  "pavement",
  "paw",
  "pay",
  "payment",
  "pea",
  "peace",
  "peaceful",
  "peach",
  "peaches",
  "peak",
  "peanut",
  "pear",
  "pearl",
  "peas",
  "peck",
  "peek",
  "peel",
  "peep",
  "peg",
  "pen",
  "pencil",
  "penny",
  "people",
  "pepper",
  "peppermint",
  "perfume",
  "perhaps",
  "person",
  "pet",
  "phone",
  "piano",
  "pick",
  "pickle",
  "picnic",
  "picture",
  "pie",
  "piece",
  "pig",
  "pigeon",
  "piggy",
  "pile",
  "pill",
  "pillow",
  "pin",
  "pine",
  "pineapple",
  "pink",
  "pint",
  "pipe",
  "pistol",
  "pit",
  "pitch",
  "pitcher",
  "pity",
  "place",
  "plain",
  "plan",
  "plane",
  "plant",
  "plate",
  "platform",
  "platter",
  "play",
  "player",
  "playground",
  "playhouse",
  "playmate",
  "plaything",
  "pleasant",
  "please",
  "pleasure",
  "plenty",
  "plow",
  "plug",
  "plum",
  "pocket",
  "pocketbook",
  "poem",
  "point",
  "poison",
  "poke",
  "pole",
  "police",
  "policeman",
  "polish",
  "polite",
  "pond",
  "ponies",
  "pony",
  "pool",
  "poor",
  "pop",
  "popcorn",
  "popped",
  "porch",
  "pork",
  "possible",
  "post",
  "postage",
  "postman",
  "pot",
  "potato",
  "potatoes",
  "pound",
  "pour",
  "powder",
  "power",
  "powerful",
  "praise",
  "pray",
  "prayer",
  "prepare",
  "present",
  "pretty",
  "price",
  "prick",
  "prince",
  "princess",
  "print",
  "prison",
  "prize",
  "promise",
  "proper",
  "protect",
  "proud",
  "prove",
  "prune",
  "public",
  "puddle",
  "puff",
  "pull",
  "pump",
  "pumpkin",
  "punch",
  "punish",
  "pup",
  "pupil",
  "puppy",
  "pure",
  "purple",
  "purse",
  "push",
  "puss",
  "pussy",
  "pussycat",
  "put",
  "putting",
  "puzzle",
  "quack",
  "quart",
  "quarter",
  "queen",
  "queer",
  "question",
  "quick",
  "quickly",
  "quiet",
  "quilt",
  "quit",
  "quite",
  "rabbit",
  "race",
  "rack",
  "radio",
  "radish",
  "rag",
  "rail",
  "railroad",
  "railway",
  "rain",
  "rainbow",
  "rainy",
  "raise",
  "raisin",
  "rake",
  "ram",
  "ran",
  "ranch",
  "rang",
  "rap",
  "rapidly",
  "rat",
  "rate",
  "rather",
  "rattle",
  "raw",
  "ray",
  "reach",
  "read",
  "reader",
  "reading",
  "ready",
  "real",
  "really",
  "reap",
  "rear",
  "reason",
  "rebuild",
  "receive",
  "recess",
  "record",
  "red",
  "redbird",
  "redbreast",
  "refuse",
  "reindeer",
  "rejoice",
  "remain",
  "remember",
  "remind",
  "remove",
  "rent",
  "repair",
  "repay",
  "repeat",
  "report",
  "rest",
  "return",
  "review",
  "reward",
  "rib",
  "ribbon",
  "rice",
  "rich",
  "rid",
  "riddle",
  "ride",
  "rider",
  "riding",
  "right",
  "rim",
  "ring",
  "rip",
  "ripe",
  "rise",
  "rising",
  "river",
  "road",
  "roadside",
  "roar",
  "roast",
  "rob",
  "robber",
  "robe",
  "robin",
  "rock",
  "rocket",
  "rocky",
  "rode",
  "roll",
  "roller",
  "roof",
  "room",
  "rooster",
  "root",
  "rope",
  "rose",
  "rosebud",
  "rot",
  "rotten",
  "rough",
  "round",
  "route",
  "row",
  "rowboat",
  "royal",
  "rub",
  "rubbed",
  "rubber",
  "rubbish",
  "rug",
  "rule",
  "ruler",
  "rumble",
  "run",
  "rung",
  "runner",
  "running",
  "rush",
  "rust",
  "rusty",
  "rye",
  "sack",
  "sad",
  "saddle",
  "sadness",
  "safe",
  "safety",
  "said",
  "sail",
  "sailboat",
  "sailor",
  "saint",
  "salad",
  "sale",
  "salt",
  "same",
  "sand",
  "sandwich",
  "sandy",
  "sang",
  "sank",
  "sap",
  "sash",
  "sat",
  "satin",
  "satisfactory",
  "saturday",
  "sausage",
  "savage",
  "save",
  "savings",
  "saw",
  "say",
  "scab",
  "scales",
  "scare",
  "scarf",
  "school",
  "schoolboy",
  "schoolhouse",
  "schoolmaster",
  "schoolroom",
  "scorch",
  "score",
  "scrap",
  "scrape",
  "scratch",
  "scream",
  "screen",
  "screw",
  "scrub",
  "sea",
  "seal",
  "seam",
  "search",
  "season",
  "seat",
  "second",
  "secret",
  "see",
  "seed",
  "seeing",
  "seek",
  "seem",
  "seen",
  "seesaw",
  "select",
  "self",
  "selfish",
  "sell",
  "send",
  "sense",
  "sent",
  "sentence",
  "separate",
  "september",
  "servant",
  "serve",
  "service",
  "set",
  "setting",
  "settle",
  "settlement",
  "seven",
  "seventeen",
  "seventh",
  "seventy",
  "several",
  "sew",
  "shade",
  "shadow",
  "shady",
  "shake",
  "shaker",
  "shaking",
  "shall",
  "shame",
  "shan't",
  "shape",
  "share",
  "sharp",
  "shave",
  "she",
  "she'd",
  "she'll",
  "she's",
  "shear",
  "shears",
  "shed",
  "sheep",
  "sheet",
  "shelf",
  "shell",
  "shepherd",
  "shine",
  "shining",
  "shiny",
  "ship",
  "shirt",
  "shock",
  "shoe",
  "shoemaker",
  "shone",
  "shook",
  "shoot",
  "shop",
  "shopping",
  "shore",
  "short",
  "shot",
  "should",
  "shoulder",
  "shouldn't",
  "shout",
  "shovel",
  "show",
  "shower",
  "shut",
  "shy",
  "sick",
  "sickness",
  "side",
  "sidewalk",
  "sideways",
  "sigh",
  "sight",
  "sign",
  "silence",
  "silent",
  "silk",
  "sill",
  "silly",
  "silver",
  "simple",
  "sin",
  "since",
  "sing",
  "singer",
  "single",
  "sink",
  "sip",
  "sir",
  "sis",
  "sissy",
  "sister",
  "sit",
  "sitting",
  "six",
  "sixteen",
  "sixth",
  "sixty",
  "size",
  "skate",
  "skater",
  "ski",
  "skin",
  "skip",
  "skirt",
  "sky",
  "slam",
  "slap",
  "slate",
  "slave",
  "sled",
  "sleep",
  "sleepy",
  "sleeve",
  "sleigh",
  "slept",
  "slice",
  "slid",
  "slide",
  "sling",
  "slip",
  "slipped",
  "slipper",
  "slippery",
  "slit",
  "slow",
  "slowly",
  "sly",
  "smack",
  "small",
  "smart",
  "smell",
  "smile",
  "smoke",
  "smooth",
  "snail",
  "snake",
  "snap",
  "snapping",
  "sneeze",
  "snow",
  "snowball",
  "snowflake",
  "snowy",
  "snuff",
  "snug",
  "so",
  "soak",
  "soap",
  "sob",
  "socks",
  "sod",
  "soda",
  "sofa",
  "soft",
  "soil",
  "sold",
  "soldier",
  "sole",
  "some",
  "somebody",
  "somehow",
  "someone",
  "something",
  "sometime",
  "sometimes",
  "somewhere",
  "son",
  "song",
  "soon",
  "sore",
  "sorrow",
  "sorry",
  "sort",
  "soul",
  "sound",
  "soup",
  "sour",
  "south",
  "southern",
  "space",
  "spade",
  "spank",
  "sparrow",
  "speak",
  "speaker",
  "spear",
  "speech",
  "speed",
  "spell",
  "spelling",
  "spend",
  "spent",
  "spider",
  "spike",
  "spill",
  "spin",
  "spinach",
  "spirit",
  "spit",
  "splash",
  "spoil",
  "spoke",
  "spook",
  "spoon",
  "sport",
  "spot",
  "spread",
  "spring",
  "springtime",
  "sprinkle",
  "square",
  "squash",
  "squeak",
  "squeeze",
  "squirrel",
  "stable",
  "stack",
  "stage",
  "stair",
  "stall",
  "stamp",
  "stand",
  "star",
  "stare",
  "start",
  "starve",
  "state",
  "states",
  "station",
  "stay",
  "steak",
  "steal",
  "steam",
  "steamboat",
  "steamer",
  "steel",
  "steep",
  "steeple",
  "steer",
  "stem",
  "step",
  "stepping",
  "stick",
  "sticky",
  "stiff",
  "still",
  "stillness",
  "sting",
  "stir",
  "stitch",
  "stock",
  "stocking",
  "stole",
  "stone",
  "stood",
  "stool",
  "stoop",
  "stop",
  "stopped",
  "stopping",
  "store",
  "stories",
  "stork",
  "storm",
  "stormy",
  "story",
  "stove",
  "straight",
  "strange",
  "stranger",
  "strap",
  "straw",
  "strawberry",
  "stream",
  "street",
  "stretch",
  "string",
  "strip",
  "stripes",
  "strong",
  "stuck",
  "study",
  "stuff",
  "stump",
  "stung",
  "subject",
  "such",
  "suck",
  "sudden",
  "suffer",
  "sugar",
  "suit",
  "sum",
  "summer",
  "sun",
  "sunday",
  "sunflower",
  "sung",
  "sunk",
  "sunlight",
  "sunny",
  "sunrise",
  "sunset",
  "sunshine",
  "supper",
  "suppose",
  "sure",
  "surely",
  "surface",
  "surprise",
  "swallow",
  "swam",
  "swamp",
  "swan",
  "swat",
  "swear",
  "sweat",
  "sweater",
  "sweep",
  "sweet",
  "sweetheart",
  "sweetness",
  "swell",
  "swept",
  "swift",
  "swim",
  "swimming",
  "swing",
  "switch",
  "sword",
  "swore",
  "table",
  "tablecloth",
  "tablespoon",
  "tablet",
  "tack",
  "tag",
  "tail",
  "tailor",
  "take",
  "taken",
  "taking",
  "tale",
  "talk",
  "talker",
  "tall",
  "tame",
  "tan",
  "tank",
  "tap",
  "tape",
  "tar",
  "tardy",
  "task",
  "taste",
  "taught",
  "tax",
  "tea",
  "teach",
  "teacher",
  "team",
  "tear",
  "tease",
  "teaspoon",
  "teeth",
  "telephone",
  "tell",
  "temper",
  "ten",
  "tennis",
  "tent",
  "term",
  "terrible",
  "test",
  "than",
  "thank",
  "thankful",
  "thanks",
  "thanksgiving",
  "that",
  "that's",
  "the",
  "theater",
  "thee",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "they'd",
  "they'll",
  "they're",
  "they've",
  "thick",
  "thief",
  "thimble",
  "thin",
  "thing",
  "think",
  "third",
  "thirsty",
  "thirteen",
  "thirty",
  "this",
  "thorn",
  "those",
  "though",
  "thought",
  "thousand",
  "thread",
  "three",
  "threw",
  "throat",
  "throne",
  "through",
  "throw",
  "thrown",
  "thumb",
  "thunder",
  "thursday",
  "thy",
  "tick",
  "ticket",
  "tickle",
  "tie",
  "tiger",
  "tight",
  "till",
  "time",
  "tin",
  "tinkle",
  "tiny",
  "tip",
  "tiptoe",
  "tire",
  "tired",
  "title",
  "to",
  "toad",
  "toadstool",
  "toast",
  "tobacco",
  "today",
  "toe",
  "together",
  "toilet",
  "told",
  "tomato",
  "tomorrow",
  "ton",
  "tone",
  "tongue",
  "tonight",
  "too",
  "took",
  "tool",
  "toot",
  "tooth",
  "toothbrush",
  "toothpick",
  "top",
  "tore",
  "torn",
  "toss",
  "touch",
  "tow",
  "toward",
  "towards",
  "towel",
  "tower",
  "town",
  "toy",
  "trace",
  "track",
  "trade",
  "train",
  "tramp",
  "trap",
  "tray",
  "treasure",
  "treat",
  "tree",
  "trick",
  "tricycle",
  "tried",
  "trim",
  "trip",
  "trolley",
  "trouble",
  "truck",
  "true",
  "truly",
  "trunk",
  "trust",
  "truth",
  "try",
  "tub",
  "tuesday",
  "tug",
  "tulip",
  "tumble",
  "tune",
  "tunnel",
  "turkey",
  "turn",
  "turtle",
  "twelve",
  "twenty",
  "twice",
  "twig",
  "twin",
  "two",
  "ugly",
  "umbrella",
  "uncle",
  "under",
  "understand",
  "underwear",
  "undress",
  "unfair",
  "unfinished",
  "unfold",
  "unfriendly",
  "unhappy",
  "unhurt",
  "uniform",
  "united",
  "unkind",
  "unknown",
  "unless",
  "unpleasant",
  "until",
  "unwilling",
  "up",
  "upon",
  "upper",
  "upset",
  "upside",
  "upstairs",
  "uptown",
  "upward",
  "us",
  "use",
  "used",
  "useful",
  "valentine",
  "valley",
  "valuable",
  "value",
  "vase",
  "vegetable",
  "velvet",
  "very",
  "vessel",
  "victory",
  "view",
  "village",
  "vine",
  "violet",
  "visit",
  "visitor",
  "voice",
  "vote",
  "wag",
  "wagon",
  "waist",
  "wait",
  "wake",
  "waken",
  "walk",
  "wall",
  "walnut",
  "want",
  "war",
  "warm",
  "warn",
  "was",
  "wash",
  "washer",
  "washtub",
  "wasn't",
  "waste",
  "watch",
  "watchman",
  "water",
  "watermelon",
  "waterproof",
  "wave",
  "wax",
  "way",
  "wayside",
  "we",
  "we'd",
  "we'll",
  "we're",
  "we've",
  "weak",
  "weaken",
  "weakness",
  "wealth",
  "weapon",
  "wear",
  "weary",
  "weather",
  "weave",
  "web",
  "wedding",
  "wednesday",
  "wee",
  "weed",
  "week",
  "weep",
  "weigh",
  "welcome",
  "well",
  "went",
  "were",
  "west",
  "western",
  "wet",
  "whale",
  "what",
  "what's",
  "wheat",
  "wheel",
  "when",
  "whenever",
  "where",
  "which",
  "while",
  "whip",
  "whipped",
  "whirl",
  "whiskey",
  "whisky",
  "whisper",
  "whistle",
  "white",
  "who",
  "who'd",
  "who'll",
  "who's",
  "whole",
  "whom",
  "whose",
  "why",
  "wicked",
  "wide",
  "wife",
  "wiggle",
  "wild",
  "wildcat",
  "will",
  "willing",
  "willow",
  "win",
  "wind",
  "windmill",
  "window",
  "windy",
  "wine",
  "wing",
  "wink",
  "winner",
  "winter",
  "wipe",
  "wire",
  "wise",
  "wish",
  "wit",
  "witch",
  "with",
  "without",
  "woke",
  "wolf",
  "woman",
  "women",
  "won",
  "won't",
  "wonder",
  "wonderful",
  "wood",
  "wooden",
  "woodpecker",
  "woods",
  "wool",
  "woolen",
  "word",
  "wore",
  "work",
  "worker",
  "workman",
  "world",
  "worm",
  "worn",
  "worry",
  "worse",
  "worst",
  "worth",
  "would",
  "wouldn't",
  "wound",
  "wove",
  "wrap",
  "wrapped",
  "wreck",
  "wren",
  "wring",
  "write",
  "writing",
  "written",
  "wrong",
  "wrote",
  "wrung",
  "yard",
  "yarn",
  "year",
  "yell",
  "yellow",
  "yes",
  "yesterday",
  "yet",
  "yolk",
  "yonder",
  "you",
  "you'd",
  "you'll",
  "you're",
  "you've",
  "young",
  "youngster",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "youth"
]

},{}],26:[function(require,module,exports){
/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing. The function also has a property 'clear' 
 * that is a function which will clear the timer to prevent previously scheduled executions. 
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */
function debounce(func, wait, immediate){
  var timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    var last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        context = args = null;
      }
    }
  };

  var debounced = function(){
    context = this;
    args = arguments;
    timestamp = Date.now();
    var callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };

  debounced.clear = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };
  
  debounced.flush = function() {
    if (timeout) {
      result = func.apply(context, args);
      context = args = null;
      
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
};

// Adds compatibility for ES modules
debounce.debounce = debounce;

module.exports = debounce;

},{}],27:[function(require,module,exports){
arguments[4][9][0].apply(exports,arguments)
},{"dup":9}],28:[function(require,module,exports){
arguments[4][10][0].apply(exports,arguments)
},{"./ctors.js":27,"dup":10}],29:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],30:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"./dtypes.js":29,"dup":12}],31:[function(require,module,exports){
'use strict';

// MODULES //

var arrayLike = require( 'validate.io-array-like' ),
	typeName = require( 'type-name' ),
	dtype = require( 'dstructs-array-dtype' ),
	getCtor = require( 'dstructs-array-constructors' );


// CAST //

/**
* FUNCTION: cast( x, type )
*	Casts an input array or array-like object to a specified type.
*
* @param {String|Object|Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} x - value to cast
* @param {String|Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} type - type to which to cast or a value from which the desired type should be inferred
* @returns {Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} casted value
*/
function cast( x, type ) {
	/* jshint newcap:false */
	var ctor,
		len,
		d,
		i;

	if ( !arrayLike( x ) ) {
		throw new TypeError( 'invalid input argument. First argument must be an array-like object. Value: `' + x + '`.' );
	}
	if ( typeof type === 'string' ) {
		ctor = getCtor( type );
	} else {
		ctor = getCtor( dtype( typeName( type ) ) );
	}
	if ( ctor === null ) {
		throw new Error( 'invalid input argument. Unrecognized/unsupported type to which to cast. Value: `' + type + '`.' );
	}
	len = x.length;

	// Ensure fast elements (contiguous memory)...
	if ( type === 'generic' && len > 64000 ) {
		d = new ctor( 64000 );
		for ( i = 0; i < 64000; i++ ) {
			d[ i ] = x[ i ];
		}
		for ( i = 64000; i < len; i++ ) {
			d.push( x[ i ] );
		}
	} else {
		d = new ctor( len );
		for ( i = 0; i < len; i++ ) {
			d[ i ] = x[ i ];
		}
	}
	return d;
} // end FUNCTION cast()


// EXPORTS //

module.exports = cast;

},{"dstructs-array-constructors":28,"dstructs-array-dtype":30,"type-name":121,"validate.io-array-like":139}],32:[function(require,module,exports){
'use strict';

// BASE TYPES //

var BTYPES = {
	'int8': Int8Array,
	'uint8': Uint8Array,
	'uint8_clamped': Uint8ClampedArray,
	'int16': Int16Array,
	'uint16': Uint16Array,
	'int32': Int32Array,
	'uint32': Uint32Array,
	'float32': Float32Array,
	'float64': Float64Array
};


// EXPORTS //

module.exports = BTYPES;

},{}],33:[function(require,module,exports){
'use strict';

// MATRIX //

/**
* FUNCTION: Matrix( data, dtype, shape, offset, strides )
*	Matrix constructor.
*
* @constructor
* @param {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} data - input typed array
* @param {String} dtype - matrix data type
* @param {Number[]} shape - matrix dimensions/shape
* @param {Number} offset - matrix offset
* @param {Number[]} strides - matrix strides
* @returns {Matrix} Matrix instance
*/
function Matrix( data, dtype, shape, offset, strides ) {
	if ( !( this instanceof Matrix ) ) {
		return new Matrix( data, dtype, shape, offset, strides );
	}
	// Underlying data type:
	Object.defineProperty( this, 'dtype', {
		'value': dtype,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Matrix dimensions:
	Object.defineProperty( this, 'shape', {
		'value': shape,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Matrix strides:
	Object.defineProperty( this, 'strides', {
		'value': strides,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Matrix offset:
	Object.defineProperty( this, 'offset', {
		'value': offset,
		'configurable': false,
		'enumerable': true,
		'writable': true
	});

	// Number of matrix dimensions:
	Object.defineProperty( this, 'ndims', {
		'value': shape.length,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Matrix length:
	Object.defineProperty( this, 'length', {
		'value': data.length,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Number of bytes used by the matrix elements:
	Object.defineProperty( this, 'nbytes', {
		'value': data.byteLength,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	// Matrix data store:
	Object.defineProperty( this, 'data', {
		'value': data,
		'configurable': false,
		'enumerable': true,
		'writable': false
	});

	return this;
} // end FUNCTION Matrix()


// METHODS //

Matrix.prototype.set = require( './set.js' );
Matrix.prototype.iset = require( './iset.js' );
Matrix.prototype.mset = require( './mset.js' );
Matrix.prototype.sset = require( './sset.js' );

Matrix.prototype.get = require( './get.js' );
Matrix.prototype.iget = require( './iget.js' );
Matrix.prototype.mget = require( './mget.js' );
Matrix.prototype.sget = require( './sget.js' );

Matrix.prototype.toString = require( './tostring.js' );
Matrix.prototype.toJSON = require( './tojson.js' );


// EXPORTS //

module.exports = Matrix;

},{"./get.js":36,"./iget.js":38,"./iset.js":41,"./mget.js":45,"./mset.js":47,"./set.js":55,"./sget.js":57,"./sset.js":59,"./tojson.js":61,"./tostring.js":62}],34:[function(require,module,exports){
'use strict';

// MATRIX //

/**
* FUNCTION: Matrix( data, dtype, shape, offset, strides )
*	Matrix constructor.
*
* @constructor
* @param {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} data - input typed array
* @param {String} dtype - matrix data type
* @param {Number[]} shape - matrix dimensions/shape
* @param {Number} offset - matrix offset
* @param {Number[]} strides - matrix strides
* @returns {Matrix} Matrix instance
*/
function Matrix( data, dtype, shape, offset, strides ) {
	if ( !( this instanceof Matrix ) ) {
		return new Matrix( data, dtype, shape, offset, strides );
	}
	this.dtype = dtype;
	this.shape = shape;
	this.strides = strides;
	this.offset = offset;
	this.ndims = shape.length;
	this.length = data.length;
	this.nbytes = data.byteLength;
	this.data = data;
	return this;
} // end FUNCTION Matrix()


// METHODS //

Matrix.prototype.set = require( './set.raw.js' );
Matrix.prototype.iset = require( './iset.raw.js' );
Matrix.prototype.mset = require( './mset.raw.js' );
Matrix.prototype.sset = require( './sset.raw.js' );

Matrix.prototype.get = require( './get.raw.js' );
Matrix.prototype.iget = require( './iget.raw.js' );
Matrix.prototype.mget = require( './mget.raw.js' );
Matrix.prototype.sget = require( './sget.raw.js' );

Matrix.prototype.toString = require( './tostring.js' );
Matrix.prototype.toJSON = require( './tojson.js' );

// EXPORTS //

module.exports = Matrix;

},{"./get.raw.js":37,"./iget.raw.js":39,"./iset.raw.js":42,"./mget.raw.js":46,"./mset.raw.js":48,"./set.raw.js":56,"./sget.raw.js":58,"./sset.raw.js":60,"./tojson.js":61,"./tostring.js":62}],35:[function(require,module,exports){
'use strict';

// DATA TYPES //

var DTYPES = [
	'int8',
	'uint8',
	'uint8_clamped',
	'int16',
	'uint16',
	'int32',
	'uint32',
	'float32',
	'float64'
];


// EXPORTS //

module.exports = DTYPES;

},{}],36:[function(require,module,exports){
'use strict';

// MODULES //

var isNonNegativeInteger = require( 'validate.io-nonnegative-integer' );


// GET //

/**
* FUNCTION: get( i, j )
*	Returns a matrix element based on the provided row and column indices.
*
* @param {Number} i - row index
* @param {Number} j - column index
* @returns {Number|Undefined} matrix element
*/
function get( i, j ) {
	/*jshint validthis:true */
	if ( !isNonNegativeInteger( i ) || !isNonNegativeInteger( j ) ) {
		throw new TypeError( 'invalid input argument. Indices must be nonnegative integers. Values: `[' + i + ','+ j + ']`.' );
	}
	return this.data[ this.offset + i*this.strides[0] + j*this.strides[1] ];
} // end FUNCTION get()


// EXPORTS //

module.exports = get;

},{"validate.io-nonnegative-integer":151}],37:[function(require,module,exports){
'use strict';

/**
* FUNCTION: get( i, j )
*	Returns a matrix element based on the provided row and column indices.
*
* @param {Number} i - row index
* @param {Number} j - column index
* @returns {Number|Undefined} matrix element
*/
function get( i, j ) {
	/*jshint validthis:true */
	return this.data[ this.offset + i*this.strides[0] + j*this.strides[1] ];
} // end FUNCTION get()


// EXPORTS //

module.exports = get;

},{}],38:[function(require,module,exports){
'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer-primitive' );


// IGET //

/**
* FUNCTION: iget( idx )
*	Returns a matrix element located at a specified index.
*
* @param {Number} idx - linear index
* @returns {Number|Undefined} matrix element
*/
function iget( idx ) {
	/*jshint validthis:true */
	var r, j;
	if ( !isInteger( idx ) ) {
		throw new TypeError( 'invalid input argument. Must provide a integer. Value: `' + idx + '`.' );
	}
	if ( idx < 0 ) {
		idx += this.length;
		if ( idx < 0 ) {
			return;
		}
	}
	j = idx % this.strides[ 0 ];
	r = idx - j;
	if ( this.strides[ 0 ] < 0 ) {
		r = -r;
	}
	return this.data[ this.offset + r + j*this.strides[1] ];
} // end FUNCTION iget()


// EXPORTS //

module.exports = iget;

},{"validate.io-integer-primitive":145}],39:[function(require,module,exports){
'use strict';

/**
* FUNCTION: iget( idx )
*	Returns a matrix element located at a specified index.
*
* @param {Number} idx - linear index
* @returns {Number|Undefined} matrix element
*/
function iget( idx ) {
	/*jshint validthis:true */
	var r, j;
	if ( idx < 0 ) {
		idx += this.length;
		if ( idx < 0 ) {
			return;
		}
	}
	j = idx % this.strides[ 0 ];
	r = idx - j;
	if ( this.strides[ 0 ] < 0 ) {
		r = -r;
	}
	return this.data[ this.offset + r + j*this.strides[1] ];
} // end FUNCTION iget()


// EXPORTS //

module.exports = iget;

},{}],40:[function(require,module,exports){
'use strict';

// EXPORTS //

module.exports = require( './matrix.js' );
module.exports.raw = require( './matrix.raw.js' );

},{"./matrix.js":43,"./matrix.raw.js":44}],41:[function(require,module,exports){
'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer-primitive' ),
	isnan = require( 'validate.io-nan' ),
	isNumber = require( 'validate.io-number-primitive' );


// ISET //

/**
* FUNCTION: iset( idx, value )
*	Sets a matrix element located at a specified index.
*
* @param {Number} idx - linear index
* @param {Number} value - value to set
* @returns {Matrix} Matrix instance
*/
function iset( idx, v ) {
	/* jshint validthis: true */
	var r, j;
	if ( !isInteger( idx ) ) {
		throw new TypeError( 'invalid input argument. An index must be an integer. Value: `' + idx + '`.' );
	}
	if ( !isNumber( v ) && !isnan( v ) ) {
		throw new TypeError( 'invalid input argument. An input value must be a number primitive. Value: `' + v + '`.' );
	}
	if ( idx < 0 ) {
		idx += this.length;
		if ( idx < 0 ) {
			return this;
		}
	}
	j = idx % this.strides[ 0 ];
	r = idx - j;
	if ( this.strides[ 0 ] < 0 ) {
		r = -r;
	}
	this.data[ this.offset + r + j*this.strides[1] ] = v;
	return this;
} // end FUNCTION iset()


// EXPORTS //

module.exports = iset;

},{"validate.io-integer-primitive":145,"validate.io-nan":149,"validate.io-number-primitive":152}],42:[function(require,module,exports){
'use strict';

/**
* FUNCTION: iset( idx, value )
*	Sets a matrix element located at a specified index.
*
* @param {Number} idx - linear index
* @param {Number} value - value to set
* @returns {Matrix} Matrix instance
*/
function iset( idx, v ) {
	/* jshint validthis: true */
	var r, j;
	if ( idx < 0 ) {
		idx += this.length;
		if ( idx < 0 ) {
			return this;
		}
	}
	j = idx % this.strides[ 0 ];
	r = idx - j;
	if ( this.strides[ 0 ] < 0 ) {
		r = -r;
	}
	this.data[ this.offset + r + j*this.strides[1] ] = v;
	return this;
} // end FUNCTION iset()


// EXPORTS //

module.exports = iset;

},{}],43:[function(require,module,exports){
'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	isNonNegativeIntegerArray = require( 'validate.io-nonnegative-integer-array' ),
	contains = require( 'validate.io-contains' ),
	isArray = require( 'validate.io-array' ),
	cast = require( 'dstructs-cast-arrays' ),
	getType = require( 'compute-dtype' ),
	Matrix = require( './ctor.js' );


// VARIABLES //

var BTYPES = require( './btypes.js' ),
	DTYPES = require( './dtypes.js' );


// CREATE MATRIX //

/**
* FUNCTION: matrix( [data,] shape[, dtype] )
*	Returns a Matrix instance.
*
* @constructor
* @param {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} [data] - input typed array
* @param {Number[]} shape - matrix dimensions/shape
* @param {String} [dtype="float64"] - matrix data type
* @returns {Matrix} Matrix instance
*/
function matrix() {
	var dtype,
		ndims,
		shape,
		data,
		vFLG,
		len,
		dt,
		i;

	// Parse the input arguments (polymorphic interface)...
	if ( arguments.length === 1 ) {
		shape = arguments[ 0 ];
		vFLG = 2; // arg #s
	}
	else if ( arguments.length === 2 ) {
		if ( isString( arguments[ 1 ] ) ) {
			shape = arguments[ 0 ];
			dtype = arguments[ 1 ];
			vFLG = 23; // arg #s
		} else {
			data = arguments[ 0 ];
			shape = arguments[ 1 ];
			vFLG = 12; // arg #s
		}
	}
	else {
		data = arguments[ 0 ];
		shape = arguments[ 1 ];
		dtype = arguments[ 2 ];
		vFLG = 123; // arg #s
	}

	// Input argument validation...
	if ( !isNonNegativeIntegerArray( shape ) ) {
		throw new TypeError( 'invalid input argument. A matrix shape must be an array of nonnegative integers. Value: `' + shape + '`.' );
	}
	ndims = shape.length;
	if ( ndims !== 2 ) {
		throw new Error( 'invalid input argument. Shape must be a 2-element array. Value: `' + shape + '`.' );
	}
	// If a `dtype` has been provided, validate...
	if ( vFLG === 123 || vFLG === 23 ) {
		if ( !contains( DTYPES, dtype ) ) {
			throw new TypeError( 'invalid input argument. Unrecognized/unsupported data type. Value: `' + dtype + '`.' );
		}
	} else {
		dtype = 'float64';
	}
	len = 1;
	for ( i = 0; i < ndims; i++ ) {
		len *= shape[ i ];
	}
	// If a `data` argument has been provided, validate...
	if ( vFLG === 123 || vFLG === 12 ) {
		dt = getType( data );
		if ( !contains( DTYPES, dt ) && !isArray( data ) ) {
			throw new TypeError( 'invalid input argument. Input data must be a valid type. Consult the documentation for a list of valid data types. Value: `' + data + '`.' );
		}
		if ( len !== data.length ) {
			throw new Error( 'invalid input argument. Matrix shape does not match the input data length.' );
		}
		// Only cast if either 1) both a `data` and `dtype` argument have been provided and they do not agree or 2) when provided a plain Array...
		if ( ( vFLG === 123 && dt !== dtype ) || dt === 'generic' ) {
			data = cast( data, dtype );
		} else {
			dtype = dt;
		}
	} else {
		// Initialize a zero-filled typed array:
		data = new BTYPES[ dtype ]( len );
	}
	// Return a new Matrix instance:
	return new Matrix( data, dtype, shape, 0, [shape[1],1] );
} // end FUNCTION matrix()


// EXPORTS //

module.exports = matrix;

},{"./btypes.js":32,"./ctor.js":33,"./dtypes.js":35,"compute-dtype":13,"dstructs-cast-arrays":31,"validate.io-array":140,"validate.io-contains":143,"validate.io-nonnegative-integer-array":150,"validate.io-string-primitive":156}],44:[function(require,module,exports){
'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	contains = require( 'validate.io-contains' ),
	getType = require( 'compute-dtype' ),
	Matrix = require( './ctor.raw.js' );


// VARIABLES //

var BTYPES = require( './btypes.js' ),
	DTYPES = require( './dtypes.js' );


// CREATE MATRIX //

/**
* FUNCTION: matrix( [data,] shape[, dtype] )
*	Returns a Matrix instance.
*
* @constructor
* @param {Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} [data] - input typed array
* @param {Number[]} shape - matrix dimensions/shape
* @param {String} [dtype="float64"] - matrix data type
* @returns {Matrix} Matrix instance
*/
function matrix() {
	var dtype,
		ndims,
		shape,
		data,
		len,
		i;

	if ( arguments.length === 1 ) {
		shape = arguments[ 0 ];
	}
	else if ( arguments.length === 2 ) {
		if ( isString( arguments[ 1 ] ) ) {
			shape = arguments[ 0 ];
			dtype = arguments[ 1 ];
		} else {
			data = arguments[ 0 ];
			shape = arguments[ 1 ];
		}
	}
	else {
		data = arguments[ 0 ];
		shape = arguments[ 1 ];
		dtype = arguments[ 2 ];
	}
	ndims = shape.length;
	if ( ndims !== 2 ) {
		throw new Error( 'invalid input argument. Shape must be a 2-element array. Value: `' + shape + '`.' );
	}
	len = 1;
	for ( i = 0; i < ndims; i++ ) {
		len *= shape[ i ];
	}
	if ( data ) {
		if ( !dtype ) {
			dtype = getType( data );
			if ( !contains( DTYPES, dtype ) ) {
				throw new TypeError( 'invalid input argument. Input data must be a valid type. Consult the documentation for a list of valid data types. Value: `' + data + '`.' );
			}
		}
		if ( len !== data.length ) {
			throw new Error( 'invalid input argument. Matrix shape does not match the input data length.' );
		}
	} else {
		// Initialize a zero-filled typed array...
		if ( !dtype ) {
			dtype = 'float64';
		}
		data = new BTYPES[ dtype ]( len );
	}
	// Return a new Matrix instance:
	return new Matrix( data, dtype, shape, 0, [shape[1],1] );
} // end FUNCTION matrix()


// EXPORTS //

module.exports = matrix;

},{"./btypes.js":32,"./ctor.raw.js":34,"./dtypes.js":35,"compute-dtype":13,"validate.io-contains":143,"validate.io-string-primitive":156}],45:[function(require,module,exports){
'use strict';

// MODULES //

var isNonNegativeIntegerArray = require( 'validate.io-nonnegative-integer-array' );


// VARIABLES //

var BTYPES = require( './btypes.js' );


// MGET //

/**
* FUNCTION: mget( i[, j] )
*	Returns multiple matrix elements. If provided a single argument, `i` is treated as an array of linear indices.
*
* @param {Number[]|Null} i - linear/row indices
* @param {Number[]|Null} [j] - column indices
* @returns {Matrix} a new Matrix instance
*/
function mget( rows, cols ) {
	/*jshint validthis:true */
	var nRows,
		nCols,
		out,
		sgn,
		d,
		s0, s1, s2, s3,
		o,
		r, dr,
		i, j, m, n;

	s0 = this.strides[ 0 ];
	s1 = this.strides[ 1 ];
	o = this.offset;

	if ( arguments.length < 2 ) {
		if ( !isNonNegativeIntegerArray( rows ) ) {
			throw new TypeError( 'invalid input argument. Linear indices must be specified as a nonnegative integer array. Value: `' + rows + '`.' );
		}
		// Filter the input indices to ensure within bounds...
		i = [];
		for ( n = 0; n < rows.length; n++ ) {
			if ( rows[ n ] < this.length ) {
				i.push( rows[ n ] );
			}
		}
		m = i.length;

		// Create a row vector (matrix):
		d = new BTYPES[ this.dtype ]( m );
		out = new this.constructor( d, this.dtype, [1,m], 0, [m,1] );

		sgn = ( s0 < 0 ) ? -1 : 1;
		for ( n = 0; n < m; n++ ) {
			j = i[ n ] % s0;
			r = sgn * ( i[n] - j );
			d[ n ] = this.data[ o + r + j*s1 ];
		}
	} else {
		nRows = this.shape[ 0 ];
		if ( rows === null ) {
			i = new Array( nRows );
			for ( n = 0; n < nRows; n++ ) {
				i[ n ] = n;
			}
		}
		else if ( isNonNegativeIntegerArray( rows ) ) {
			i = [];
			for ( n = 0; n < rows.length; n++ ) {
				if ( rows[ n ] < nRows ) {
					i.push( rows[ n ] );
				}
			}
		}
		else {
			throw new TypeError( 'invalid input argument. Row indices must be specified as a nonnegative integer array. Value: `' + rows + '`.' );
		}

		nCols = this.shape[ 1 ];
		if ( cols === null ) {
			j = new Array( nCols );
			for ( n = 0; n < nCols; n++ ) {
				j[ n ] = n;
			}
		}
		else if ( isNonNegativeIntegerArray( cols ) ) {
			j = [];
			for ( n = 0; n < cols.length; n++ ) {
				if ( cols[ n ] < nCols ) {
					j.push( cols[ n ] );
				}
			}
		}
		else {
			throw new TypeError( 'invalid input argument. Column indices must be specified as a nonnegative integer array. Value: `' + cols + '`.' );
		}
		nRows = i.length;
		nCols = j.length;

		d = new BTYPES[ this.dtype ]( nRows*nCols );
		out = new this.constructor( d, this.dtype, [nRows,nCols], 0, [nCols,1]);

		s2 = out.strides[ 0 ];
		s3 = out.strides[ 1 ];
		for ( m = 0; m < nRows; m++ ) {
			r = o + i[m]*s0;
			dr = m * s2;
			for ( n = 0; n < nCols; n++ ) {
				d[ dr + n*s3 ] = this.data[ r + j[n]*s1 ];
			}
		}
	}
	return out;
} // end FUNCTION mget()


// EXPORTS //

module.exports = mget;

},{"./btypes.js":32,"validate.io-nonnegative-integer-array":150}],46:[function(require,module,exports){
'use strict';

// VARIABLES //

var BTYPES = require( './btypes.js' );


// MGET //

/**
* FUNCTION: mget( i[, j] )
*	Returns multiple matrix elements. If provided a single argument, `i` is treated as an array of linear indices.
*
* @param {Number[]|Null} i - linear/row indices
* @param {Number[]|Null} [j] - column indices
* @returns {Matrix} a new Matrix instance
*/
function mget( rows, cols ) {
	/*jshint validthis:true */
	var nRows,
		nCols,
		out,
		sgn,
		d,
		s0, s1, s2, s3,
		o,
		r, dr,
		i, j, m, n;

	s0 = this.strides[ 0 ];
	s1 = this.strides[ 1 ];
	o = this.offset;

	if ( arguments.length < 2 ) {
		i = rows;
		m = i.length;

		// Create a row vector (matrix):
		d = new BTYPES[ this.dtype ]( m );
		out = new this.constructor( d, this.dtype, [1,m], 0, [m,1] );

		sgn = ( s0 < 0 ) ? -1 : 1;
		for ( n = 0; n < m; n++ ) {
			j = i[ n ] % s0;
			r = sgn * ( i[n] - j );
			d[ n ] = this.data[ o + r + j*s1 ];
		}
	} else {
		if ( rows === null ) {
			nRows = this.shape[ 0 ];
			i = new Array( nRows );
			for ( n = 0; n < nRows; n++ ) {
				i[ n ] = n;
			}
		} else {
			nRows = rows.length;
			i = rows;
		}

		if ( cols === null ) {
			nCols = this.shape[ 1 ];
			j = new Array( nCols );
			for ( n = 0; n < nCols; n++ ) {
				j[ n ] = n;
			}
		} else {
			nCols = cols.length;
			j = cols;
		}

		d = new BTYPES[ this.dtype ]( nRows*nCols );
		out = new this.constructor( d, this.dtype, [nRows,nCols], 0, [nCols,1] );

		s2 = out.strides[ 0 ];
		s3 = out.strides[ 1 ];
		for ( m = 0; m < nRows; m++ ) {
			r = o + i[m]*s0;
			dr = m * s2;
			for ( n = 0; n < nCols; n++ ) {
				d[ dr + n*s3 ] = this.data[ r + j[n]*s1 ];
			}
		}
	}
	return out;
} // end FUNCTION mget()


// EXPORTS //

module.exports = mget;

},{"./btypes.js":32}],47:[function(require,module,exports){
'use strict';

// MODULES //

var isFunction = require( 'validate.io-function' ),
	isnan = require( 'validate.io-nan' ),
	isNumber = require( 'validate.io-number-primitive' ),
	isNonNegativeIntegerArray = require( 'validate.io-nonnegative-integer-array' );


// FUNCTIONS //

var mset1 = require( './mset1.js' ),
	mset2 = require( './mset2.js' ),
	mset3 = require( './mset3.js' ),
	mset4 = require( './mset4.js' ),
	mset5 = require( './mset5.js' ),
	mset6 = require( './mset6.js' );

/**
* FUNCTION: getIndices( idx, len )
*	Validates and returns an array of indices.
*
* @private
* @param {Number[]|Null} idx - indices
* @param {Number} len - max index
* @returns {Number[]} indices
*/
function getIndices( idx, len ) {
	var out,
		i;
	if ( idx === null ) {
		out = new Array( len );
		for ( i = 0; i < len; i++ ) {
			out[ i ] = i;
		}
	}
	else if ( isNonNegativeIntegerArray( idx ) ) {
		out = [];
		for ( i = 0; i < idx.length; i++ ) {
			if ( idx[ i ] < len ) {
				out.push( idx[ i ] );
			}
		}
	}
	else {
		throw new TypeError( 'invalid input argument. Row and column indices must be arrays of nonnegative integers. Value: `' + idx + '`.' );
	}
	return out;
} // end FUNCTION getIndices()


// MSET //

/**
* FUNCTION: mset( i[, j], value[, thisArg] )
*	Sets multiple matrix elements. If provided a single array, `i` is treated as an array of linear indices.
*
* @param {Number[]|Null} i - linear/row indices
* @param {Number[]|Null} [j] - column indices
* @param {Number|Matrix|Function} value - either a single numeric value, a matrix containing the values to set, or a function which returns a numeric value
* @returns {Matrix} Matrix instance
*/
function mset() {
	/*jshint validthis:true */
	var nargs = arguments.length,
		args,
		rows,
		cols,
		i;

	args = new Array( nargs );
	for ( i = 0; i < nargs; i++ ) {
		args[ i ] = arguments[ i ];
	}

	// 2 input arguments...
	if ( nargs < 3 ) {
		if ( !isNonNegativeIntegerArray( args[ 0 ] ) ) {
			throw new TypeError( 'invalid input argument. First argument must be an array of nonnegative integers. Value: `' + args[ 0 ] + '`.' );
		}
		// indices, clbk
		if ( isFunction( args[ 1 ] ) ) {
			mset2( this, args[ 0 ], args[ 1 ] );
		}
		// indices, number
		else if ( isNumber( args[ 1 ] ) || isnan( args[ 1 ] ) ) {
			mset1( this, args[ 0 ], args[ 1 ] );
		}
		// indices, matrix
		else {
			// NOTE: no validation for Matrix instance.
			mset3( this, args[ 0 ], args[ 1 ] );
		}
	}
	// 3 input arguments...
	else if ( nargs === 3 ) {
		// indices, clbk, context
		if ( isFunction( args[ 1 ] ) ) {
			if ( !isNonNegativeIntegerArray( args[ 0 ] ) ) {
				throw new TypeError( 'invalid input argument. First argument must be an array of nonnegative integers. Value: `' + args[ 0 ] + '`.' );
			}
			mset2( this, args[ 0 ], args[ 1 ], args[ 2 ] );
		}
		// rows, cols, function
		else if ( isFunction( args[ 2 ] ) ) {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );
			mset4( this, rows, cols, args[ 2 ], this );
		}
		// rows, cols, number
		else if ( isNumber( args[ 2 ] ) ) {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );
			mset5( this, rows, cols, args[ 2 ] );
		}
		// rows, cols, matrix
		else {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );

			// NOTE: no validation for Matrix instance.
			mset6( this, rows, cols, args[ 2 ] );
		}
	}
	// 4 input arguments...
	else {
		// rows, cols, function, context
		if ( !isFunction( args[ 2 ] ) ) {
			throw new TypeError( 'invalid input argument. Callback argument must be a function. Value: `' + args[ 2 ] + '`.' );
		}
		rows = getIndices( args[ 0 ], this.shape[ 0 ] );
		cols = getIndices( args[ 1 ], this.shape[ 1 ] );
		mset4( this, rows, cols, args[ 2 ], args[ 3 ] );
	}
	return this;
} // end FUNCTION mset()


// EXPORTS //

module.exports = mset;

},{"./mset1.js":49,"./mset2.js":50,"./mset3.js":51,"./mset4.js":52,"./mset5.js":53,"./mset6.js":54,"validate.io-function":144,"validate.io-nan":149,"validate.io-nonnegative-integer-array":150,"validate.io-number-primitive":152}],48:[function(require,module,exports){
'use strict';

// FUNCTIONS //

var mset1 = require( './mset1.js' ),
	mset2 = require( './mset2.js' ),
	mset3 = require( './mset3.js' ),
	mset4 = require( './mset4.js' ),
	mset5 = require( './mset5.js' ),
	mset6 = require( './mset6.js' );

/**
* FUNCTION: getIndices( idx, len )
*	Returns an array of indices.
*
* @private
* @param {Number[]|Null} idx - indices
* @param {Number} len - max index
* @returns {Number[]} indices
*/
function getIndices( idx, len ) {
	var out,
		i;
	if ( idx === null ) {
		out = new Array( len );
		for ( i = 0; i < len; i++ ) {
			out[ i ] = i;
		}
	} else {
		out = idx;
	}
	return out;
} // end FUNCTION getIndices()


// MSET //

/**
* FUNCTION: mset( i[, j], value[, thisArg] )
*	Sets multiple matrix elements. If provided a single array, `i` is treated as an array of linear indices.
*
* @param {Number[]|Null} i - linear/row indices
* @param {Number[]|Null} [j] - column indices
* @param {Number|Matrix|Function} value - either a single numeric value, a matrix containing the values to set, or a function which returns a numeric value
* @returns {Matrix} Matrix instance
*/
function mset() {
	/*jshint validthis:true */
	var nargs = arguments.length,
		args,
		rows,
		cols,
		i;

	args = new Array( nargs );
	for ( i = 0; i < nargs; i++ ) {
		args[ i ] = arguments[ i ];
	}

	// 2 input arguments...
	if ( nargs < 3 ) {
		// indices, clbk
		if ( typeof args[ 1 ] === 'function' ) {
			mset2( this, args[ 0 ], args[ 1 ] );
		}
		// indices, number
		else if ( typeof args[ 1 ] === 'number' ) {
			mset1( this, args[ 0 ], args[ 1 ] );
		}
		// indices, matrix
		else {
			mset3( this, args[ 0 ], args[ 1 ] );
		}
	}
	// 3 input arguments...
	else if ( nargs === 3 ) {
		// indices, clbk, context
		if ( typeof args[ 1 ] === 'function' ) {
			mset2( this, args[ 0 ], args[ 1 ], args[ 2 ] );
		}
		// rows, cols, function
		else if ( typeof args[ 2 ] === 'function' ) {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );
			mset4( this, rows, cols, args[ 2 ], this );
		}
		// rows, cols, number
		else if ( typeof args[ 2 ] === 'number' ) {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );
			mset5( this, rows, cols, args[ 2 ] );
		}
		// rows, cols, matrix
		else {
			rows = getIndices( args[ 0 ], this.shape[ 0 ] );
			cols = getIndices( args[ 1 ], this.shape[ 1 ] );
			mset6( this, rows, cols, args[ 2 ] );
		}
	}
	// 4 input arguments...
	else {
		rows = getIndices( args[ 0 ], this.shape[ 0 ] );
		cols = getIndices( args[ 1 ], this.shape[ 1 ] );
		mset4( this, rows, cols, args[ 2 ], args[ 3 ] );
	}
	return this;
} // end FUNCTION mset()


// EXPORTS //

module.exports = mset;

},{"./mset1.js":49,"./mset2.js":50,"./mset3.js":51,"./mset4.js":52,"./mset5.js":53,"./mset6.js":54}],49:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset1( mat, idx, v )
*	Sets multiple matrix elements to a numeric value `v`.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} idx - linear indices
* @param {Number} v - numeric value
* @returns {Void}
*/
function mset1( mat, idx, v ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		len = idx.length,
		o = mat.offset,
		sgn,
		r, j, n;

	sgn = ( s0 < 0 ) ? -1 : 1;
	for ( n = 0; n < len; n++ ) {
		j = idx[ n ] % s0;
		r = sgn * ( idx[n] - j );
		mat.data[ o + r + j*s1 ] = v;
	}
} // end FUNCTION mset1()


// EXPORTS //

module.exports = mset1;

},{}],50:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset2( mat, idx, clbk, ctx )
*	Sets multiple matrix elements using a callback function.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} idx - linear indices
* @param {Function} clbk - callback function
* @param {Object} ctx - `this` context when invoking the provided callback
* @returns {Void}
*/
function mset2( mat, idx, clbk, ctx ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		len = idx.length,
		o = mat.offset,
		sgn,
		r, c,
		i, k, n;

	sgn = ( s0 < 0 ) ? -1 : 1;
	for ( n = 0; n < len; n++ ) {
		// Get the column number:
		c = idx[ n ] % s0;

		// Determine the row offset:
		i = sgn * ( idx[n] - c );

		// Get the row number:
		r = i / s0;

		// Calculate the index:
		k = o + i + c*s1;

		// Set the value:
		mat.data[ k ] = clbk.call( ctx, mat.data[ k ], r, c, k );
	}
} // end FUNCTION mset2()


// EXPORTS //

module.exports = mset2;

},{}],51:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset3( mat, idx, m )
*	Sets multiple matrix elements using elements from another matrix.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} idx - linear indices
* @param {Matrix} m - Matrix instance
* @returns {Void}
*/
function mset3( mat, idx, m ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		s2 = m.strides[ 0 ],
		s3 = m.strides[ 1 ],
		len = idx.length,
		o0 = mat.offset,
		o1 = m.offset,
		sgn0, sgn1,
		r0, r1,
		j0, j1,
		n;

	if ( m.length !== len ) {
		throw new Error( 'invalid input argument. Number of indices does not match the number of elements in the value matrix.' );
	}
	sgn0 = ( s0 < 0 ) ? -1 : 1;
	sgn1 = ( s2 < 0 ) ? -1 : 1;
	for ( n = 0; n < len; n++ ) {
		// Get the column number and row offset for the first matrix:
		j0 = idx[ n ] % s0;
		r0 = sgn0 * ( idx[n] - j0 );

		// Get the column number and row offset for the value matrix:
		j1 = n % s2;
		r1 = sgn1 * ( n - j1 );

		mat.data[ o0 + r0 + j0*s1 ] = m.data[ o1 + r1 + j1*s3  ];
	}
} // end FUNCTION mset3()


// EXPORTS //

module.exports = mset3;

},{}],52:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset4( mat, rows, cols, clbk, ctx )
*	Sets multiple matrix elements using a callback function.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} rows - row indices
* @param {Number[]} cols - column indices
* @param {Function} clbk - callback function
* @param {Object} ctx - `this` context when invoking the provided callback
* @returns {Void}
*/
function mset4( mat, rows, cols, clbk, ctx ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		nRows = rows.length,
		nCols = cols.length,
		o = mat.offset,
		r,
		i, j, k;

	for ( i = 0; i < nRows; i++ ) {
		r = o + rows[i]*s0;
		for ( j = 0; j < nCols; j++ ) {
			k = r + cols[j]*s1;
			mat.data[ k ] = clbk.call( ctx, mat.data[ k ], rows[ i ], cols[ j ], k );
		}
	}
} // end FUNCTION mset4()


// EXPORTS //

module.exports = mset4;

},{}],53:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset5( mat, rows, cols, v )
*	Sets multiple matrix elements to a numeric value `v`.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} rows - row indices
* @param {Number[]} cols - column indices
* @param {Number} v - numeric value
* @returns {Void}
*/
function mset5( mat, rows, cols, v ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		nRows = rows.length,
		nCols = cols.length,
		o = mat.offset,
		r,
		i, j;

	for ( i = 0; i < nRows; i++ ) {
		r = o + rows[i]*s0;
		for ( j = 0; j < nCols; j++ ) {
			mat.data[ r + cols[j]*s1 ] = v;
		}
	}
} // end FUNCTION mset5()


// EXPORTS //

module.exports = mset5;

},{}],54:[function(require,module,exports){
'use strict';

/**
* FUNCTION: mset6( mat, rows, cols, m )
*	Sets multiple matrix elements using elements from another matrix.
*
* @private
* @param {Matrix} mat - Matrix instance
* @param {Number[]} rows - row indices
* @param {Number[]} cols - column indices
* @param {Matrix} m - Matrix instance
* @returns {Void}
*/
function mset6( mat, rows, cols, m ) {
	var s0 = mat.strides[ 0 ],
		s1 = mat.strides[ 1 ],
		s2 = m.strides[ 0 ],
		s3 = m.strides[ 1 ],
		nRows = rows.length,
		nCols = cols.length,
		o0 = mat.offset,
		o1 = m.offset,
		r0, r1,
		i, j;

	if ( m.shape[ 0 ] !== nRows || m.shape[ 1 ] !== nCols ) {
		throw new Error( 'invalid input argument. The dimensions given by the row and column indices do not match the value matrix dimensions.' );
	}
	for ( i = 0; i < nRows; i++ ) {
		r0 = o0 + rows[i]*s0;
		r1 = o1 + i*s2;
		for ( j = 0; j < nCols; j++ ) {
			mat.data[ r0 + cols[j]*s1 ] = m.data[ r1 + j*s3 ];
		}
	}
} // end FUNCTION mset6()


// EXPORTS //

module.exports = mset6;

},{}],55:[function(require,module,exports){
'use strict';

// MODULES //

var isNonNegativeInteger = require( 'validate.io-nonnegative-integer' ),
	isnan = require( 'validate.io-nan' ),
	isNumber = require( 'validate.io-number-primitive' );


// SET //

/**
* FUNCTION: set( i, j, value )
*	Sets a matrix element based on the provided row and column indices.
*
* @param {Number} i - row index
* @param {Number} j - column index
* @param {Number} value - value to set
* @returns {Matrix} Matrix instance
*/
function set( i, j, v ) {
	/* jshint validthis: true */
	if ( !isNonNegativeInteger( i ) || !isNonNegativeInteger( j ) ) {
		throw new TypeError( 'invalid input argument. Row and column indices must be nonnegative integers. Values: `[' + i + ',' + j + ']`.' );
	}
	if ( !isNumber( v ) && !isnan( v ) ) {
		throw new TypeError( 'invalid input argument. An input value must be a number primitive. Value: `' + v + '`.' );
	}
	i = this.offset + i*this.strides[0] + j*this.strides[1];
	if ( i >= 0 ) {
		this.data[ i ] = v;
	}
	return this;
} // end FUNCTION set()


// EXPORTS //

module.exports = set;

},{"validate.io-nan":149,"validate.io-nonnegative-integer":151,"validate.io-number-primitive":152}],56:[function(require,module,exports){
'use strict';

/**
* FUNCTION: set( i, j, value )
*	Sets a matrix element based on the provided row and column indices.
*
* @param {Number} i - row index
* @param {Number} j - column index
* @param {Number} value - value to set
* @returns {Matrix} Matrix instance
*/
function set( i, j, v ) {
	/* jshint validthis: true */
	i = this.offset + i*this.strides[0] + j*this.strides[1];
	if ( i >= 0 ) {
		this.data[ i ] = v;
	}
	return this;
} // end FUNCTION set()


// EXPORTS //

module.exports = set;

},{}],57:[function(require,module,exports){
'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	ispace = require( 'compute-indexspace' );


// VARIABLES //

var BTYPES = require( './btypes.js' );


// SUBSEQUENCE GET //

/**
* FUNCTION: sget( subsequence )
*	Returns matrix elements according to a specified subsequence.
*
* @param {String} subsequence - subsequence string
* @returns {Matrix} Matrix instance
*/
function sget( seq ) {
	/*jshint validthis:true */
	var nRows,
		nCols,
		rows,
		cols,
		seqs,
		mat,
		len,
		s0, s1,
		o,
		d,
		r, dr,
		i, j;

	if ( !isString( seq ) ) {
		throw new TypeError( 'invalid input argument. Must provide a string primitive. Value: `' + seq + '`.' );
	}
	seqs = seq.split( ',' );
	if ( seqs.length !== 2 ) {
		throw new Error( 'invalid input argument. Subsequence string must specify row and column subsequences. Value: `' + seq + '`.' );
	}
	rows = ispace( seqs[ 0 ], this.shape[ 0 ] );
	cols = ispace( seqs[ 1 ], this.shape[ 1 ] );

	nRows = rows.length;
	nCols = cols.length;
	len = nRows * nCols;

	d = new BTYPES[ this.dtype ]( len );
	mat = new this.constructor( d, this.dtype, [nRows,nCols], 0, [nCols,1] );

	if ( len ) {
		s0 = this.strides[ 0 ];
		s1 = this.strides[ 1 ];
		o = this.offset;
		for ( i = 0; i < nRows; i++ ) {
			r = o + rows[i]*s0;
			dr = i * nCols;
			for ( j = 0; j < nCols; j++ ) {
				d[ dr + j ] = this.data[ r + cols[j]*s1 ];
			}
		}
	}
	return mat;
} // end FUNCTION sget()


// EXPORTS //

module.exports = sget;

},{"./btypes.js":32,"compute-indexspace":14,"validate.io-string-primitive":156}],58:[function(require,module,exports){
'use strict';

// MODULES //

var ispace = require( 'compute-indexspace' );


// VARIABLES //

var BTYPES = require( './btypes.js' );


// SUBSEQUENCE GET //

/**
* FUNCTION: sget( subsequence )
*	Returns matrix elements according to a specified subsequence.
*
* @param {String} subsequence - subsequence string
* @returns {Matrix} Matrix instance
*/
function sget( seq ) {
	/*jshint validthis:true */
	var nRows,
		nCols,
		rows,
		cols,
		seqs,
		mat,
		len,
		s0, s1,
		o,
		d,
		r, dr,
		i, j;

	seqs = seq.split( ',' );
	rows = ispace( seqs[ 0 ], this.shape[ 0 ] );
	cols = ispace( seqs[ 1 ], this.shape[ 1 ] );

	nRows = rows.length;
	nCols = cols.length;
	len = nRows * nCols;

	d = new BTYPES[ this.dtype ]( len );
	mat = new this.constructor( d, this.dtype, [nRows,nCols], 0, [nCols,1] );

	if ( len ) {
		s0 = this.strides[ 0 ];
		s1 = this.strides[ 1 ];
		o = this.offset;
		for ( i = 0; i < nRows; i++ ) {
			r = o + rows[i]*s0;
			dr = i * nCols;
			for ( j = 0; j < nCols; j++ ) {
				d[ dr + j ] = this.data[ r + cols[j]*s1 ];
			}
		}
	}
	return mat;
} // end FUNCTION sget()


// EXPORTS //

module.exports = sget;

},{"./btypes.js":32,"compute-indexspace":14}],59:[function(require,module,exports){
'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	isNumber = require( 'validate.io-number-primitive' ),
	isFunction = require( 'validate.io-function' ),
	ispace = require( 'compute-indexspace' );


// SUBSEQUENCE SET //

/**
* FUNCTION: sset( subsequence, value[, thisArg] )
*	Sets matrix elements according to a specified subsequence.
*
* @param {String} subsequence - subsequence string
* @param {Number|Matrix|Function} value - either a single numeric value, a matrix containing the values to set, or a function which returns a numeric value
* @param {Object} [thisArg] - `this` context when executing a callback
* @returns {Matrix} Matrix instance
*/
function sset( seq, val, thisArg ) {
	/* jshint validthis: true */
	var nRows,
		nCols,
		clbk,
		rows,
		cols,
		seqs,
		mat,
		ctx,
		s0, s1, s2, s3,
		o0, o1,
		r0, r1,
		i, j, k;

	if ( !isString( seq ) ) {
		throw new TypeError( 'invalid input argument. Must provide a string primitive. Value: `' + seq + '`.' );
	}
	seqs = seq.split( ',' );
	if ( seqs.length !== 2 ) {
		throw new Error( 'invalid input argument. Subsequence string must specify row and column subsequences. Value: `' + seq + '`.' );
	}
	if ( isFunction( val ) ) {
		clbk = val;
	}
	else if ( !isNumber( val ) ) {
		mat = val;
	}
	rows = ispace( seqs[ 0 ], this.shape[ 0 ] );
	cols = ispace( seqs[ 1 ], this.shape[ 1 ] );

	nRows = rows.length;
	nCols = cols.length;

	if ( !( nRows && nCols ) ) {
		return this;
	}
	s0 = this.strides[ 0 ];
	s1 = this.strides[ 1 ];
	o0 = this.offset;

	// Callback...
	if ( clbk ) {
		if ( arguments.length > 2 ) {
			ctx = thisArg;
		} else {
			ctx = this;
		}
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			for ( j = 0; j < nCols; j++ ) {
				k = r0 + cols[j]*s1;
				this.data[ k ] = clbk.call( ctx, this.data[ k ], rows[i], cols[j], k );
			}
		}
	}
	// Input matrix...
	else if ( mat ) {
		if ( nRows !== mat.shape[ 0 ] ) {
			throw new Error( 'invalid input arguments. Row subsequence does not match input matrix dimensions. Expected a [' + nRows + ',' + nCols + '] matrix and instead received a [' + mat.shape.join( ',' ) + '] matrix.' );
		}
		if ( nCols !== mat.shape[ 1 ] ) {
			throw new Error( 'invalid input arguments. Column subsequence does not match input matrix dimensions. Expected a [' + nRows + ',' + nCols + '] matrix and instead received a [' + mat.shape.join( ',' ) + '] matrix.' );
		}
		s2 = mat.strides[ 0 ];
		s3 = mat.strides[ 1 ];
		o1 = mat.offset;
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			r1 = o1 + i*s2;
			for ( j = 0; j < nCols; j++ ) {
				this.data[ r0 + cols[j]*s1 ] = mat.data[ r1 + j*s3 ];
			}
		}
	}
	// Single numeric value...
	else {
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			for ( j = 0; j < nCols; j++ ) {
				this.data[ r0 + cols[j]*s1 ] = val;
			}
		}
	}
	return this;
} // end FUNCTION sset()


// EXPORTS //

module.exports = sset;

},{"compute-indexspace":14,"validate.io-function":144,"validate.io-number-primitive":152,"validate.io-string-primitive":156}],60:[function(require,module,exports){
'use strict';

// MODULES //

var ispace = require( 'compute-indexspace' );


// SUBSEQUENCE SET //

/**
* FUNCTION: sset( subsequence, value[, thisArg] )
*	Sets matrix elements according to a specified subsequence.
*
* @param {String} subsequence - subsequence string
* @param {Number|Matrix|Function} value - either a single numeric value, a matrix containing the values to set, or a function which returns a numeric value
* @param {Object} [thisArg] - `this` context when executing a callback
* @returns {Matrix} Matrix instance
*/
function sset( seq, val, thisArg ) {
	/* jshint validthis: true */
	var nRows,
		nCols,
		clbk,
		rows,
		cols,
		seqs,
		mat,
		ctx,
		s0, s1, s2, s3,
		o0, o1,
		r0, r1,
		i, j, k;

	seqs = seq.split( ',' );
	if ( typeof val === 'function' ) {
		clbk = val;
	}
	else if ( typeof val !== 'number' ) {
		mat = val;
	}
	rows = ispace( seqs[ 0 ], this.shape[ 0 ] );
	cols = ispace( seqs[ 1 ], this.shape[ 1 ] );

	nRows = rows.length;
	nCols = cols.length;

	if ( !( nRows && nCols ) ) {
		return this;
	}
	s0 = this.strides[ 0 ];
	s1 = this.strides[ 1 ];
	o0 = this.offset;

	// Callback...
	if ( clbk ) {
		if ( arguments.length > 2 ) {
			ctx = thisArg;
		} else {
			ctx = this;
		}
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			for ( j = 0; j < nCols; j++ ) {
				k = r0 + cols[j]*s1;
				this.data[ k ] = clbk.call( ctx, this.data[ k ], rows[i], cols[j], k );
			}
		}
	}
	// Input matrix...
	else if ( mat ) {
		if ( nRows !== mat.shape[ 0 ] ) {
			throw new Error( 'invalid input arguments. Row subsequence does not match input matrix dimensions. Expected a [' + nRows + ',' + nCols + '] matrix and instead received a [' + mat.shape.join( ',' ) + '] matrix.' );
		}
		if ( nCols !== mat.shape[ 1 ] ) {
			throw new Error( 'invalid input arguments. Column subsequence does not match input matrix dimensions. Expected a [' + nRows + ',' + nCols + '] matrix and instead received a [' + mat.shape.join( ',' ) + '] matrix.' );
		}
		s2 = mat.strides[ 0 ];
		s3 = mat.strides[ 1 ];
		o1 = mat.offset;
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			r1 = o1 + i*s2;
			for ( j = 0; j < nCols; j++ ) {
				this.data[ r0 + cols[j]*s1 ] = mat.data[ r1 + j*s3 ];
			}
		}
	}
	// Single numeric value...
	else {
		for ( i = 0; i < nRows; i++ ) {
			r0 = o0 + rows[i]*s0;
			for ( j = 0; j < nCols; j++ ) {
				this.data[ r0 + cols[j]*s1 ] = val;
			}
		}
	}
	return this;
} // end FUNCTION sset()


// EXPORTS //

module.exports = sset;

},{"compute-indexspace":14}],61:[function(require,module,exports){
'use strict';

// MODULES //

var cast = require( 'dstructs-cast-arrays' ),
	copy = require( 'utils-copy' );


// TOJSON //

/**
* FUNCTION: toJSON()
*	Returns a JSON representation of a Matrix.
*
* @returns {Object} JSON representation
*/
function toJSON() {
	/* jshint validthis: true */
	var prop,
		out;

	// Build an object containing all Matrix properties needed to revive a serialized Matrix...
	out = {};
	out.type = 'Matrix';
	out.dtype = this.dtype;
	out.shape = copy( this.shape );
	out.offset = this.offset;
	out.strides = copy( this.strides );

	prop = Object.getOwnPropertyDescriptor( this, 'data' );
	out.raw = prop.writable && prop.configurable && prop.enumerable;

	// Cast data to a generic array:
	out.data = cast( this.data, 'generic' );

	return out;
} // end FUNCTION toJSON()


// EXPORTS //

module.exports = toJSON;

},{"dstructs-cast-arrays":31,"utils-copy":134}],62:[function(require,module,exports){
'use strict';

/**
* FUNCTION: toString()
*	Returns a string representation of Matrix elements. Rows are delineated by semicolons. Column values are comma-delimited.
*
* @returns {String} string representation
*/
function toString() {
	/* jshint validthis: true */
	var nRows = this.shape[ 0 ],
		nCols = this.shape[ 1 ],
		s0 = this.strides[ 0 ],
		s1 = this.strides[ 1 ],
		m = nRows - 1,
		n = nCols - 1,
		str = '',
		o,
		i, j;

	for ( i = 0; i < nRows; i++ ) {
		o = this.offset + i*s0;
		for ( j = 0; j < nCols; j++ ) {
			str += this.data[ o + j*s1 ];
			if ( j < n ) {
				str += ',';
			}
		}
		if ( i < m ) {
			str += ';';
		}
	}
	return str;
} // end FUNCTION toString()


// EXPORTS //

module.exports = toString;

},{}],63:[function(require,module,exports){
'use strict';

var OneVersionConstraint = require('individual/one-version');

var MY_VERSION = '7';
OneVersionConstraint('ev-store', MY_VERSION);

var hashKey = '__EV_STORE_KEY@' + MY_VERSION;

module.exports = EvStore;

function EvStore(elem) {
    var hash = elem[hashKey];

    if (!hash) {
        hash = elem[hashKey] = {};
    }

    return hash;
}

},{"individual/one-version":71}],64:[function(require,module,exports){
'use strict';

var hasOwn = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var defineProperty = Object.defineProperty;
var gOPD = Object.getOwnPropertyDescriptor;

var isArray = function isArray(arr) {
	if (typeof Array.isArray === 'function') {
		return Array.isArray(arr);
	}

	return toStr.call(arr) === '[object Array]';
};

var isPlainObject = function isPlainObject(obj) {
	if (!obj || toStr.call(obj) !== '[object Object]') {
		return false;
	}

	var hasOwnConstructor = hasOwn.call(obj, 'constructor');
	var hasIsPrototypeOf = obj.constructor && obj.constructor.prototype && hasOwn.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !hasOwnConstructor && !hasIsPrototypeOf) {
		return false;
	}

	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.
	var key;
	for (key in obj) { /**/ }

	return typeof key === 'undefined' || hasOwn.call(obj, key);
};

// If name is '__proto__', and Object.defineProperty is available, define __proto__ as an own property on target
var setProperty = function setProperty(target, options) {
	if (defineProperty && options.name === '__proto__') {
		defineProperty(target, options.name, {
			enumerable: true,
			configurable: true,
			value: options.newValue,
			writable: true
		});
	} else {
		target[options.name] = options.newValue;
	}
};

// Return undefined instead of __proto__ if '__proto__' is not an own property
var getProperty = function getProperty(obj, name) {
	if (name === '__proto__') {
		if (!hasOwn.call(obj, name)) {
			return void 0;
		} else if (gOPD) {
			// In early versions of node, obj['__proto__'] is buggy when obj has
			// __proto__ as an own property. Object.getOwnPropertyDescriptor() works.
			return gOPD(obj, name).value;
		}
	}

	return obj[name];
};

module.exports = function extend() {
	var options, name, src, copy, copyIsArray, clone;
	var target = arguments[0];
	var i = 1;
	var length = arguments.length;
	var deep = false;

	// Handle a deep copy situation
	if (typeof target === 'boolean') {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}
	if (target == null || (typeof target !== 'object' && typeof target !== 'function')) {
		target = {};
	}

	for (; i < length; ++i) {
		options = arguments[i];
		// Only deal with non-null/undefined values
		if (options != null) {
			// Extend the base object
			for (name in options) {
				src = getProperty(target, name);
				copy = getProperty(options, name);

				// Prevent never-ending loop
				if (target !== copy) {
					// Recurse if we're merging plain objects or arrays
					if (deep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && isArray(src) ? src : [];
						} else {
							clone = src && isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						setProperty(target, { name: name, newValue: extend(deep, clone, copy) });

					// Don't bring in undefined values
					} else if (typeof copy !== 'undefined') {
						setProperty(target, { name: name, newValue: copy });
					}
				}
			}
		}
	}

	// Return the modified object
	return target;
};

},{}],65:[function(require,module,exports){
'use strict'

module.exports = flesch

var sentenceWeight = 1.015
var wordWeight = 84.6
var base = 206.835

function flesch(counts) {
  if (!counts || !counts.sentence || !counts.word || !counts.syllable) {
    return NaN
  }

  return (
    base -
    sentenceWeight * (counts.word / counts.sentence) -
    wordWeight * (counts.syllable / counts.word)
  )
}

},{}],66:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

var doccy;

if (typeof document !== 'undefined') {
    doccy = document;
} else {
    doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }
}

module.exports = doccy;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":5}],67:[function(require,module,exports){
(function (global){
var win;

if (typeof window !== "undefined") {
    win = window;
} else if (typeof global !== "undefined") {
    win = global;
} else if (typeof self !== "undefined"){
    win = self;
} else {
    win = {};
}

module.exports = win;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],68:[function(require,module,exports){
'use strict'

module.exports = gunningFog

var complexWordWeight = 100
var weight = 0.4

function gunningFog(counts) {
  if (!counts || !counts.sentence || !counts.word) {
    return NaN
  }

  return (
    weight *
    (counts.word / counts.sentence +
      complexWordWeight * ((counts.complexPolysillabicWord || 0) / counts.word))
  )
}

},{}],69:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],70:[function(require,module,exports){
(function (global){
'use strict';

/*global window, global*/

var root = typeof window !== 'undefined' ?
    window : typeof global !== 'undefined' ?
    global : {};

module.exports = Individual;

function Individual(key, value) {
    if (key in root) {
        return root[key];
    }

    root[key] = value;

    return value;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],71:[function(require,module,exports){
'use strict';

var Individual = require('./index.js');

module.exports = OneVersion;

function OneVersion(moduleName, version, defaultValue) {
    var key = '__INDIVIDUAL_ONE_VERSION_' + moduleName;
    var enforceKey = key + '_ENFORCE_SINGLETON';

    var versionValue = Individual(enforceKey, version);

    if (versionValue !== version) {
        throw new Error('Can only have one copy of ' +
            moduleName + '.\n' +
            'You already have version ' + versionValue +
            ' installed.\n' +
            'This means you cannot install version ' + version);
    }

    return Individual(key, defaultValue);
}

},{"./index.js":70}],72:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],73:[function(require,module,exports){
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

module.exports = function isBuffer (obj) {
  return obj != null && obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
}

},{}],74:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],75:[function(require,module,exports){
'use strict';
var toString = Object.prototype.toString;

module.exports = function (x) {
	var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};

},{}],76:[function(require,module,exports){
function lerp(v0, v1, t) {
    return v0*(1-t)+v1*t
}
module.exports = lerp
},{}],77:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')

module.exports = normalize

var all = /[-']/g
var dash = /-/g
var apostrophe = /’/g
var singleQuote = /'/g

function normalize(value, options) {
  var settings = options || {}
  var allowApostrophes = settings.allowApostrophes
  var allowDashes = settings.allowDashes
  var result = (typeof value === 'string' ? value : toString(value))
    .toLowerCase()
    .replace(apostrophe, "'")

  if (allowApostrophes && allowDashes) {
    return result
  }

  if (allowApostrophes) {
    return result.replace(dash, '')
  }

  if (allowDashes) {
    return result.replace(singleQuote, '')
  }

  return result.replace(all, '')
}

},{"nlcst-to-string":78}],78:[function(require,module,exports){
'use strict'

module.exports = nlcstToString

// Stringify one nlcst node or list of nodes.
function nlcstToString(node, separator) {
  var sep = separator || ''
  var values
  var length
  var children

  if (!node || (!('length' in node) && !node.type)) {
    throw new Error('Expected node, not `' + node + '`')
  }

  if (typeof node.value === 'string') {
    return node.value
  }

  children = 'length' in node ? node : node.children
  length = children.length

  // Shortcut: This is pretty common, and a small performance win.
  if (length === 1 && 'value' in children[0]) {
    return children[0].value
  }

  values = []

  while (length--) {
    values[length] = nlcstToString(children[length], sep)
  }

  return values.join(sep)
}

},{}],79:[function(require,module,exports){
module.exports={"105":"i","192":"A","193":"A","194":"A","195":"A","196":"A","197":"A","199":"C","200":"E","201":"E","202":"E","203":"E","204":"I","205":"I","206":"I","207":"I","209":"N","210":"O","211":"O","212":"O","213":"O","214":"O","216":"O","217":"U","218":"U","219":"U","220":"U","221":"Y","224":"a","225":"a","226":"a","227":"a","228":"a","229":"a","231":"c","232":"e","233":"e","234":"e","235":"e","236":"i","237":"i","238":"i","239":"i","241":"n","242":"o","243":"o","244":"o","245":"o","246":"o","248":"o","249":"u","250":"u","251":"u","252":"u","253":"y","255":"y","256":"A","257":"a","258":"A","259":"a","260":"A","261":"a","262":"C","263":"c","264":"C","265":"c","266":"C","267":"c","268":"C","269":"c","270":"D","271":"d","272":"D","273":"d","274":"E","275":"e","276":"E","277":"e","278":"E","279":"e","280":"E","281":"e","282":"E","283":"e","284":"G","285":"g","286":"G","287":"g","288":"G","289":"g","290":"G","291":"g","292":"H","293":"h","294":"H","295":"h","296":"I","297":"i","298":"I","299":"i","300":"I","301":"i","302":"I","303":"i","304":"I","308":"J","309":"j","310":"K","311":"k","313":"L","314":"l","315":"L","316":"l","317":"L","318":"l","319":"L","320":"l","321":"L","322":"l","323":"N","324":"n","325":"N","326":"n","327":"N","328":"n","332":"O","333":"o","334":"O","335":"o","336":"O","337":"o","338":"O","339":"o","340":"R","341":"r","342":"R","343":"r","344":"R","345":"r","346":"S","347":"s","348":"S","349":"s","350":"S","351":"s","352":"S","353":"s","354":"T","355":"t","356":"T","357":"t","358":"T","359":"t","360":"U","361":"u","362":"U","363":"u","364":"U","365":"u","366":"U","367":"u","368":"U","369":"u","370":"U","371":"u","372":"W","373":"w","374":"Y","375":"y","376":"Y","377":"Z","378":"z","379":"Z","380":"z","381":"Z","382":"z","384":"b","385":"B","386":"B","387":"b","390":"O","391":"C","392":"c","393":"D","394":"D","395":"D","396":"d","398":"E","400":"E","401":"F","402":"f","403":"G","407":"I","408":"K","409":"k","410":"l","412":"M","413":"N","414":"n","415":"O","416":"O","417":"o","420":"P","421":"p","422":"R","427":"t","428":"T","429":"t","430":"T","431":"U","432":"u","434":"V","435":"Y","436":"y","437":"Z","438":"z","461":"A","462":"a","463":"I","464":"i","465":"O","466":"o","467":"U","468":"u","477":"e","484":"G","485":"g","486":"G","487":"g","488":"K","489":"k","490":"O","491":"o","500":"G","501":"g","504":"N","505":"n","512":"A","513":"a","514":"A","515":"a","516":"E","517":"e","518":"E","519":"e","520":"I","521":"i","522":"I","523":"i","524":"O","525":"o","526":"O","527":"o","528":"R","529":"r","530":"R","531":"r","532":"U","533":"u","534":"U","535":"u","536":"S","537":"s","538":"T","539":"t","542":"H","543":"h","544":"N","545":"d","548":"Z","549":"z","550":"A","551":"a","552":"E","553":"e","558":"O","559":"o","562":"Y","563":"y","564":"l","565":"n","566":"t","567":"j","570":"A","571":"C","572":"c","573":"L","574":"T","575":"s","576":"z","579":"B","580":"U","581":"V","582":"E","583":"e","584":"J","585":"j","586":"Q","587":"q","588":"R","589":"r","590":"Y","591":"y","592":"a","593":"a","595":"b","596":"o","597":"c","598":"d","599":"d","600":"e","603":"e","604":"e","605":"e","606":"e","607":"j","608":"g","609":"g","610":"g","613":"h","614":"h","616":"i","618":"i","619":"l","620":"l","621":"l","623":"m","624":"m","625":"m","626":"n","627":"n","628":"n","629":"o","633":"r","634":"r","635":"r","636":"r","637":"r","638":"r","639":"r","640":"r","641":"r","642":"s","647":"t","648":"t","649":"u","651":"v","652":"v","653":"w","654":"y","655":"y","656":"z","657":"z","663":"c","665":"b","666":"e","667":"g","668":"h","669":"j","670":"k","671":"l","672":"q","686":"h","688":"h","690":"j","691":"r","692":"r","694":"r","695":"w","696":"y","737":"l","738":"s","739":"x","780":"v","829":"x","851":"x","867":"a","868":"e","869":"i","870":"o","871":"u","872":"c","873":"d","874":"h","875":"m","876":"r","877":"t","878":"v","879":"x","7424":"a","7427":"b","7428":"c","7429":"d","7431":"e","7432":"e","7433":"i","7434":"j","7435":"k","7436":"l","7437":"m","7438":"n","7439":"o","7440":"o","7441":"o","7442":"o","7443":"o","7446":"o","7447":"o","7448":"p","7449":"r","7450":"r","7451":"t","7452":"u","7453":"u","7454":"u","7455":"m","7456":"v","7457":"w","7458":"z","7522":"i","7523":"r","7524":"u","7525":"v","7680":"A","7681":"a","7682":"B","7683":"b","7684":"B","7685":"b","7686":"B","7687":"b","7690":"D","7691":"d","7692":"D","7693":"d","7694":"D","7695":"d","7696":"D","7697":"d","7698":"D","7699":"d","7704":"E","7705":"e","7706":"E","7707":"e","7710":"F","7711":"f","7712":"G","7713":"g","7714":"H","7715":"h","7716":"H","7717":"h","7718":"H","7719":"h","7720":"H","7721":"h","7722":"H","7723":"h","7724":"I","7725":"i","7728":"K","7729":"k","7730":"K","7731":"k","7732":"K","7733":"k","7734":"L","7735":"l","7738":"L","7739":"l","7740":"L","7741":"l","7742":"M","7743":"m","7744":"M","7745":"m","7746":"M","7747":"m","7748":"N","7749":"n","7750":"N","7751":"n","7752":"N","7753":"n","7754":"N","7755":"n","7764":"P","7765":"p","7766":"P","7767":"p","7768":"R","7769":"r","7770":"R","7771":"r","7774":"R","7775":"r","7776":"S","7777":"s","7778":"S","7779":"s","7786":"T","7787":"t","7788":"T","7789":"t","7790":"T","7791":"t","7792":"T","7793":"t","7794":"U","7795":"u","7796":"U","7797":"u","7798":"U","7799":"u","7804":"V","7805":"v","7806":"V","7807":"v","7808":"W","7809":"w","7810":"W","7811":"w","7812":"W","7813":"w","7814":"W","7815":"w","7816":"W","7817":"w","7818":"X","7819":"x","7820":"X","7821":"x","7822":"Y","7823":"y","7824":"Z","7825":"z","7826":"Z","7827":"z","7828":"Z","7829":"z","7835":"s","7840":"A","7841":"a","7842":"A","7843":"a","7864":"E","7865":"e","7866":"E","7867":"e","7868":"E","7869":"e","7880":"I","7881":"i","7882":"I","7883":"i","7884":"O","7885":"o","7886":"O","7887":"o","7908":"U","7909":"u","7910":"U","7911":"u","7922":"Y","7923":"y","7924":"Y","7925":"y","7926":"Y","7927":"y","7928":"Y","7929":"y","8305":"i","8341":"h","8342":"k","8343":"l","8344":"m","8345":"n","8346":"p","8347":"s","8348":"t","8450":"c","8458":"g","8459":"h","8460":"h","8461":"h","8464":"i","8465":"i","8466":"l","8467":"l","8468":"l","8469":"n","8472":"p","8473":"p","8474":"q","8475":"r","8476":"r","8477":"r","8484":"z","8488":"z","8492":"b","8493":"c","8495":"e","8496":"e","8497":"f","8498":"F","8499":"m","8500":"o","8506":"q","8513":"g","8514":"l","8515":"l","8516":"y","8517":"d","8518":"d","8519":"e","8520":"i","8521":"j","8526":"f","8579":"C","8580":"c","8765":"s","8766":"s","8959":"z","8999":"x","9746":"x","9776":"i","9866":"i","10005":"x","10006":"x","10007":"x","10008":"x","10625":"z","10626":"z","11362":"L","11364":"R","11365":"a","11366":"t","11373":"A","11374":"M","11375":"A","11390":"S","11391":"Z","19904":"i","42893":"H","42922":"H","42923":"E","42924":"G","42925":"L","42928":"K","42929":"T","62937":"x"}
},{}],80:[function(require,module,exports){
(function(global, factory) {
  if (typeof define === 'function' && define.amd) {
    define(function() {
      return factory(global, global.document);
    });
  } else if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(global, global.document);
  } else {
      global.normalize = factory(global, global.document);
  }
} (typeof window !== 'undefined' ? window : this, function (window, document) {
  var charmap = require('./charmap');
  var regex = null;
  var current_charmap;
  var old_charmap;

  function normalize(str, custom_charmap) {
    old_charmap = current_charmap;
    current_charmap = custom_charmap || charmap;

    regex = (regex && old_charmap === current_charmap) ? regex : buildRegExp(current_charmap);

    return str.replace(regex, function(charToReplace) {
      return current_charmap[charToReplace.charCodeAt(0)] || charToReplace;
    });
  }

  function buildRegExp(charmap){
     return new RegExp('[' + Object.keys(charmap).map(function(code) {return String.fromCharCode(code); }).join(' ') + ']', 'g');
   }

  return normalize;
}));

},{"./charmap":79}],81:[function(require,module,exports){
'use strict';

var keysShim;
if (!Object.keys) {
	// modified from https://github.com/es-shims/es5-shim
	var has = Object.prototype.hasOwnProperty;
	var toStr = Object.prototype.toString;
	var isArgs = require('./isArguments'); // eslint-disable-line global-require
	var isEnumerable = Object.prototype.propertyIsEnumerable;
	var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
	var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
	var dontEnums = [
		'toString',
		'toLocaleString',
		'valueOf',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'constructor'
	];
	var equalsConstructorPrototype = function (o) {
		var ctor = o.constructor;
		return ctor && ctor.prototype === o;
	};
	var excludedKeys = {
		$applicationCache: true,
		$console: true,
		$external: true,
		$frame: true,
		$frameElement: true,
		$frames: true,
		$innerHeight: true,
		$innerWidth: true,
		$onmozfullscreenchange: true,
		$onmozfullscreenerror: true,
		$outerHeight: true,
		$outerWidth: true,
		$pageXOffset: true,
		$pageYOffset: true,
		$parent: true,
		$scrollLeft: true,
		$scrollTop: true,
		$scrollX: true,
		$scrollY: true,
		$self: true,
		$webkitIndexedDB: true,
		$webkitStorageInfo: true,
		$window: true
	};
	var hasAutomationEqualityBug = (function () {
		/* global window */
		if (typeof window === 'undefined') { return false; }
		for (var k in window) {
			try {
				if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
					try {
						equalsConstructorPrototype(window[k]);
					} catch (e) {
						return true;
					}
				}
			} catch (e) {
				return true;
			}
		}
		return false;
	}());
	var equalsConstructorPrototypeIfNotBuggy = function (o) {
		/* global window */
		if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
			return equalsConstructorPrototype(o);
		}
		try {
			return equalsConstructorPrototype(o);
		} catch (e) {
			return false;
		}
	};

	keysShim = function keys(object) {
		var isObject = object !== null && typeof object === 'object';
		var isFunction = toStr.call(object) === '[object Function]';
		var isArguments = isArgs(object);
		var isString = isObject && toStr.call(object) === '[object String]';
		var theKeys = [];

		if (!isObject && !isFunction && !isArguments) {
			throw new TypeError('Object.keys called on a non-object');
		}

		var skipProto = hasProtoEnumBug && isFunction;
		if (isString && object.length > 0 && !has.call(object, 0)) {
			for (var i = 0; i < object.length; ++i) {
				theKeys.push(String(i));
			}
		}

		if (isArguments && object.length > 0) {
			for (var j = 0; j < object.length; ++j) {
				theKeys.push(String(j));
			}
		} else {
			for (var name in object) {
				if (!(skipProto && name === 'prototype') && has.call(object, name)) {
					theKeys.push(String(name));
				}
			}
		}

		if (hasDontEnumBug) {
			var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

			for (var k = 0; k < dontEnums.length; ++k) {
				if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
					theKeys.push(dontEnums[k]);
				}
			}
		}
		return theKeys;
	};
}
module.exports = keysShim;

},{"./isArguments":83}],82:[function(require,module,exports){
'use strict';

var slice = Array.prototype.slice;
var isArgs = require('./isArguments');

var origKeys = Object.keys;
var keysShim = origKeys ? function keys(o) { return origKeys(o); } : require('./implementation');

var originalKeys = Object.keys;

keysShim.shim = function shimObjectKeys() {
	if (Object.keys) {
		var keysWorksWithArguments = (function () {
			// Safari 5.0 bug
			var args = Object.keys(arguments);
			return args && args.length === arguments.length;
		}(1, 2));
		if (!keysWorksWithArguments) {
			Object.keys = function keys(object) { // eslint-disable-line func-name-matching
				if (isArgs(object)) {
					return originalKeys(slice.call(object));
				}
				return originalKeys(object);
			};
		}
	} else {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./implementation":81,"./isArguments":83}],83:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]' &&
			value !== null &&
			typeof value === 'object' &&
			typeof value.length === 'number' &&
			value.length >= 0 &&
			toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],84:[function(require,module,exports){
'use strict'

var Parser = require('parse-latin')
var toString = require('nlcst-to-string')
var visitChildren = require('unist-util-visit-children')
var modifyChildren = require('unist-util-modify-children')

module.exports = ParseEnglish

// Inherit from `ParseLatin`.
ParserPrototype.prototype = Parser.prototype

var proto = new ParserPrototype()

ParseEnglish.prototype = proto

// Add modifiers to `parser`.
proto.tokenizeSentencePlugins = [
  visitChildren(mergeEnglishElisionExceptions)
].concat(proto.tokenizeSentencePlugins)

proto.tokenizeParagraphPlugins = [
  modifyChildren(mergeEnglishPrefixExceptions)
].concat(proto.tokenizeParagraphPlugins)

// Transform English natural language into an NLCST-tree.
function ParseEnglish(doc, file) {
  if (!(this instanceof ParseEnglish)) {
    return new ParseEnglish(doc, file)
  }

  Parser.apply(this, arguments)
}

// Constructor to create a `ParseEnglish` prototype.
function ParserPrototype() {}

// Match a blacklisted (case-insensitive) abbreviation which when followed by a
// full-stop does not depict a sentence terminal marker.
var abbreviations = new RegExp(
  '^(' +
    // Business Abbreviations: Incorporation, Limited company.
    'inc|ltd|' +
    // English unit abbreviations:
    // -   Note that *Metric abbreviations* do not use full stops.
    // -   Note that some common plurals are included, although units should not
    //     be pluralised.
    //
    // barrel, cubic, dozen, fluid (ounce), foot, gallon, grain, gross,
    // inch, karat / knot, pound, mile, ounce, pint, quart, square,
    // tablespoon, teaspoon, yard.
    'bbls?|cu|doz|fl|ft|gal|gr|gro|in|kt|lbs?|mi|oz|pt|qt|sq|tbsp|' +
    'tsp|yds?|' +
    // Abbreviations of time references:
    // seconds, minutes, hours, Monday, Tuesday, *, Wednesday, Thursday, *,
    // Friday, Saturday, Sunday, January, Februari, March, April, June, July,
    // August, September, *, October, November, December.
    'sec|min|hr|mon|tue|tues|wed|thu|thurs|fri|sat|sun|jan|feb|mar|' +
    'apr|jun|jul|aug|sep|sept|oct|nov|dec' +
    ')$'
  // Note: There's no `i` flag here because the value to test against should be
  // all lowercase!
)

// Match a blacklisted (case-sensitive) abbreviation which when followed by a
// full-stop does not depict a sentence terminal marker.
var abbreviationsSensitive = new RegExp(
  '^(' +
    // Social:
    // Mister, Mistress, Mistress, woman, Mademoiselle, Madame, Monsieur,
    // Misters, Mesdames, Junior, Senior, *.
    'Mr|Mrs|Miss|Ms|Mss|Mses|Mlle|Mme|M|Messrs|Mmes|Jr|Sr|Snr|' +
    // Rank and academic:
    // Doctor, Magister, Attorney, Profesor, Honourable, Reverend, Father,
    // Monsignor, Sister, Brother, Saint, President, Superintendent,
    // Representative, Senator.
    'Dr|Mgr|Atty|Prof|Hon|Rev|Fr|Msgr|Sr|Br|St|Pres|Supt|Rep|Sen|' +
    // Rank and military:
    // Governor, Ambassador, Treasurer, Secretary, Admiral, Brigadier, General,
    // Commander, Colonel, Captain, Lieutenant, Major, Sergeant, Petty Officer,
    // Warrant Officer, Purple Heart.
    'Gov|Amb|Treas|Sec|Amd|Brig|Gen|Cdr|Col|Capt|Lt|Maj|Sgt|Po|Wo|Ph|' +
    // Common geographical abbreviations:
    // Avenue, Boulevard, Mountain, Road, Building, National, *, Route, *,
    // County, Park, Square, Drive, Port or Point, Street or State, Fort,
    // Peninsula, Territory, Highway, Freeway, Parkway.
    'Ave|Blvd|Mt|Rd|Bldgs?|Nat|Natl|Rt|Rte|Co|Pk|Sq|Dr|Pt|St|' +
    'Ft|Pen|Terr|Hwy|Fwy|Pkwy|' +
    // American state abbreviations:
    // Alabama, Arizona, Arkansas, California, *, Colorado, *,
    // Connecticut, Delaware, Florida, Georgia, Idaho, *, Illinois, Indiana,
    // Iowa, Kansas, *, Kentucky, *, Louisiana, Maine, Maryland, Massachusetts,
    // Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, *, Nevada,
    // Mexico, Dakota, Oklahoma, *, Oregon, Pennsylvania, *, *, Tennessee,
    // Texas, Utah, Vermont, Virginia, Washington, Wisconsin, *, Wyoming.
    'Ala|Ariz|Ark|Cal|Calif|Col|Colo|Conn|Del|Fla|Ga|Ida|Id|Ill|Ind|' +
    'Ia|Kan|Kans|Ken|Ky|La|Me|Md|Mass|Mich|Minn|Miss|Mo|Mont|Neb|' +
    'Nebr|Nev|Mex|Dak|Okla|Ok|Ore|Penna|Penn|Pa|Tenn|Tex|Ut|Vt|Va|' +
    'Wash|Wis|Wisc|Wyo|' +
    // Canadian province abbreviations:
    // Alberta, Manitoba, Ontario, Quebec, *, Saskatchewan, Yukon Territory.
    'Alta|Man|Ont|Qu\u00E9|Que|Sask|Yuk|' +
    // English county abbreviations:
    // Bedfordshire, Berkshire, Buckinghamshire, Cambridgeshire, Cheshire,
    // Cornwall, Cumberland, Derbyshire, *, Devon, Dorset, Durham,
    // Gloucestershire, Hampshire, Herefordshire, *, Hertfordshire,
    // Huntingdonshire, Lancashire, Leicestershire, Lincolnshire, Middlesex,
    // *, *, Norfolk, Northamptonshire, Northumberland, *, Nottinghamshire,
    // Oxfordshire, Rutland, Shropshire, Somerset, Staffordshire, *, Suffolk,
    // Surrey, Sussex, *, Warwickshire, *, *, Westmorland, Wiltshire,
    // Worcestershire, Yorkshire.
    'Beds|Berks|Bucks|Cambs|Ches|Corn|Cumb|Derbys|Derbs|Dev|Dor|Dur|' +
    'Glos|Hants|Here|Heref|Herts|Hunts|Lancs|Leics|Lincs|Mx|Middx|Mddx|' +
    'Norf|Northants|Northumb|Northd|Notts|Oxon|Rut|Shrops|Salop|Som|' +
    'Staffs|Staf|Suff|Sy|Sx|Ssx|Warks|War|Warw|Westm|Wilts|Worcs|Yorks' +
    ')$'
)

// Match a blacklisted word which when followed by an apostrophe depicts
// elision.
var elisionPrefix = new RegExp(
  '^(' +
    // Includes: - o' > of; - ol' > old.
    'o|ol' +
    ')$'
)

// Match a blacklisted word which when preceded by an apostrophe depicts
// elision.
var elisionAffix = new RegExp(
  '^(' +
    // Includes: 'im > him; 'er > her; 'em > them. 'cause > because.
    'im|er|em|cause|' +
    // Includes: 'twas > it was; 'tis > it is; 'twere > it were.
    'twas|tis|twere|' +
    // Matches groups of year, optionally followed by an `s`.
    '\\d\\ds?' +
    ')$'
)

// Match one apostrophe.
var apostrophe = /^['\u2019]$/

// Merge a sentence into its next sentence, when the sentence ends with a
// certain word.
function mergeEnglishPrefixExceptions(sentence, index, paragraph) {
  var children = sentence.children
  var period = children[children.length - 1]
  var word = children[children.length - 2]
  var value
  var next

  if (period && toString(period) === '.' && word && word.type === 'WordNode') {
    value = toString(word)

    if (
      abbreviations.test(lower(value)) ||
      abbreviationsSensitive.test(value)
    ) {
      // Merge period into abbreviation.
      word.children.push(period)
      children.pop()

      if (period.position && word.position) {
        word.position.end = period.position.end
      }

      // Merge sentences.
      next = paragraph.children[index + 1]

      if (next) {
        sentence.children = children.concat(next.children)

        paragraph.children.splice(index + 1, 1)

        // Update position.
        if (next.position && sentence.position) {
          sentence.position.end = next.position.end
        }

        // Next, iterate over the current node again.
        return index - 1
      }
    }
  }
}

// Merge an apostrophe depicting elision into its surrounding word.
function mergeEnglishElisionExceptions(child, index, sentence) {
  var siblings
  var sibling
  var other
  var length
  var value

  if (child.type !== 'PunctuationNode' && child.type !== 'SymbolNode') {
    return
  }

  siblings = sentence.children
  length = siblings.length
  value = toString(child)

  // Match abbreviation of `with`, `w/`
  if (value === '/') {
    sibling = siblings[index - 1]

    if (sibling && lower(toString(sibling)) === 'w') {
      // Remove the slash from the sentence.
      siblings.splice(index, 1)

      // Append the slash into the children of the previous node.
      sibling.children.push(child)

      // Update position.
      if (sibling.position && child.position) {
        sibling.position.end = child.position.end
      }
    }
  } else if (apostrophe.test(value)) {
    // If two preceding (the first white space and the second a word), and one
    // following (white space) nodes exist...
    sibling = siblings[index - 1]

    if (
      index > 2 &&
      index < length - 1 &&
      sibling.type === 'WordNode' &&
      siblings[index - 2].type === 'WhiteSpaceNode' &&
      siblings[index + 1].type === 'WhiteSpaceNode' &&
      elisionPrefix.test(lower(toString(sibling)))
    ) {
      // Remove the apostrophe from the sentence.
      siblings.splice(index, 1)

      // Append the apostrophe into the children of node.
      sibling.children.push(child)

      // Update position.
      if (sibling.position && child.position) {
        sibling.position.end = child.position.end
      }

      return
    }

    // If a following word exists, and the preceding node is not a word...
    if (
      index !== length - 1 &&
      siblings[index + 1].type === 'WordNode' &&
      (index === 0 || siblings[index - 1].type !== 'WordNode')
    ) {
      sibling = siblings[index + 1]
      value = lower(toString(sibling))

      if (elisionAffix.test(value)) {
        // Remove the apostrophe from the sentence.
        siblings.splice(index, 1)

        // Prepend the apostrophe into the children of node.
        sibling.children = [child].concat(sibling.children)

        // Update position.
        if (sibling.position && child.position) {
          sibling.position.start = child.position.start
        }
        // If both preceded and followed by an apostrophe, and the word is
        // `n`...
      } else if (
        value === 'n' &&
        index < length - 2 &&
        apostrophe.test(toString(siblings[index + 2]))
      ) {
        other = siblings[index + 2]

        // Remove the apostrophe from the sentence.
        siblings.splice(index, 1)
        siblings.splice(index + 1, 1)

        // Prepend the preceding apostrophe and append the into the following
        // apostrophe into the children of node.
        sibling.children = [child].concat(sibling.children, other)

        // Update position.
        if (sibling.position) {
          /* istanbul ignore else */
          if (child.position) {
            sibling.position.start = child.position.start
          }

          /* istanbul ignore else */
          if (other.position) {
            sibling.position.end = other.position.end
          }
        }
      }
    }
  }
}

function lower(value) {
  return value.toLowerCase()
}

},{"nlcst-to-string":78,"parse-latin":85,"unist-util-modify-children":125,"unist-util-visit-children":127}],85:[function(require,module,exports){
'use strict'
module.exports = require('./lib')

},{"./lib":87}],86:[function(require,module,exports){
// This module is generated by `script/build-expressions.js`.
'use strict'

module.exports = {
  affixSymbol: /^([\)\]\}\u0F3B\u0F3D\u169C\u2046\u207E\u208E\u2309\u230B\u232A\u2769\u276B\u276D\u276F\u2771\u2773\u2775\u27C6\u27E7\u27E9\u27EB\u27ED\u27EF\u2984\u2986\u2988\u298A\u298C\u298E\u2990\u2992\u2994\u2996\u2998\u29D9\u29DB\u29FD\u2E23\u2E25\u2E27\u2E29\u3009\u300B\u300D\u300F\u3011\u3015\u3017\u3019\u301B\u301E\u301F\uFD3E\uFE18\uFE36\uFE38\uFE3A\uFE3C\uFE3E\uFE40\uFE42\uFE44\uFE48\uFE5A\uFE5C\uFE5E\uFF09\uFF3D\uFF5D\uFF60\uFF63]|["'\xBB\u2019\u201D\u203A\u2E03\u2E05\u2E0A\u2E0D\u2E1D\u2E21]|[!\.\?\u2026\u203D])\1*$/,
  newLine: /^[ \t]*((\r?\n|\r)[\t ]*)+$/,
  newLineMulti: /^[ \t]*((\r?\n|\r)[\t ]*){2,}$/,
  terminalMarker: /^((?:[!\.\?\u2026\u203D])+)$/,
  wordSymbolInner: /^((?:[&'\x2D\.:=\?@\xAD\xB7\u2010\u2011\u2019\u2027])|(?:_)+)$/,
  numerical: /^(?:[0-9\xB2\xB3\xB9\xBC-\xBE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D58-\u0D5E\u0D66-\u0D78\u0DE6-\u0DEF\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uA9F0-\uA9F9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19]|\uD800[\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDEE1-\uDEFB\uDF20-\uDF23\uDF41\uDF4A\uDFD1-\uDFD5]|\uD801[\uDCA0-\uDCA9]|\uD802[\uDC58-\uDC5F\uDC79-\uDC7F\uDCA7-\uDCAF\uDCFB-\uDCFF\uDD16-\uDD1B\uDDBC\uDDBD\uDDC0-\uDDCF\uDDD2-\uDDFF\uDE40-\uDE48\uDE7D\uDE7E\uDE9D-\uDE9F\uDEEB-\uDEEF\uDF58-\uDF5F\uDF78-\uDF7F\uDFA9-\uDFAF]|\uD803[\uDCFA-\uDCFF\uDD30-\uDD39\uDE60-\uDE7E\uDF1D-\uDF26\uDF51-\uDF54]|\uD804[\uDC52-\uDC6F\uDCF0-\uDCF9\uDD36-\uDD3F\uDDD0-\uDDD9\uDDE1-\uDDF4\uDEF0-\uDEF9]|\uD805[\uDC50-\uDC59\uDCD0-\uDCD9\uDE50-\uDE59\uDEC0-\uDEC9\uDF30-\uDF3B]|\uD806[\uDCE0-\uDCF2]|\uD807[\uDC50-\uDC6C\uDD50-\uDD59\uDDA0-\uDDA9\uDFC0-\uDFD4]|\uD809[\uDC00-\uDC6E]|\uD81A[\uDE60-\uDE69\uDF50-\uDF59\uDF5B-\uDF61]|\uD81B[\uDE80-\uDE96]|\uD834[\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDFCE-\uDFFF]|\uD838[\uDD40-\uDD49\uDEF0-\uDEF9]|\uD83A[\uDCC7-\uDCCF\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D]|\uD83C[\uDD00-\uDD0C])+$/,
  digitStart: /^\d/,
  lowerInitial: /^(?:[a-z\xB5\xDF-\xF6\xF8-\xFF\u0101\u0103\u0105\u0107\u0109\u010B\u010D\u010F\u0111\u0113\u0115\u0117\u0119\u011B\u011D\u011F\u0121\u0123\u0125\u0127\u0129\u012B\u012D\u012F\u0131\u0133\u0135\u0137\u0138\u013A\u013C\u013E\u0140\u0142\u0144\u0146\u0148\u0149\u014B\u014D\u014F\u0151\u0153\u0155\u0157\u0159\u015B\u015D\u015F\u0161\u0163\u0165\u0167\u0169\u016B\u016D\u016F\u0171\u0173\u0175\u0177\u017A\u017C\u017E-\u0180\u0183\u0185\u0188\u018C\u018D\u0192\u0195\u0199-\u019B\u019E\u01A1\u01A3\u01A5\u01A8\u01AA\u01AB\u01AD\u01B0\u01B4\u01B6\u01B9\u01BA\u01BD-\u01BF\u01C6\u01C9\u01CC\u01CE\u01D0\u01D2\u01D4\u01D6\u01D8\u01DA\u01DC\u01DD\u01DF\u01E1\u01E3\u01E5\u01E7\u01E9\u01EB\u01ED\u01EF\u01F0\u01F3\u01F5\u01F9\u01FB\u01FD\u01FF\u0201\u0203\u0205\u0207\u0209\u020B\u020D\u020F\u0211\u0213\u0215\u0217\u0219\u021B\u021D\u021F\u0221\u0223\u0225\u0227\u0229\u022B\u022D\u022F\u0231\u0233-\u0239\u023C\u023F\u0240\u0242\u0247\u0249\u024B\u024D\u024F-\u0293\u0295-\u02AF\u0371\u0373\u0377\u037B-\u037D\u0390\u03AC-\u03CE\u03D0\u03D1\u03D5-\u03D7\u03D9\u03DB\u03DD\u03DF\u03E1\u03E3\u03E5\u03E7\u03E9\u03EB\u03ED\u03EF-\u03F3\u03F5\u03F8\u03FB\u03FC\u0430-\u045F\u0461\u0463\u0465\u0467\u0469\u046B\u046D\u046F\u0471\u0473\u0475\u0477\u0479\u047B\u047D\u047F\u0481\u048B\u048D\u048F\u0491\u0493\u0495\u0497\u0499\u049B\u049D\u049F\u04A1\u04A3\u04A5\u04A7\u04A9\u04AB\u04AD\u04AF\u04B1\u04B3\u04B5\u04B7\u04B9\u04BB\u04BD\u04BF\u04C2\u04C4\u04C6\u04C8\u04CA\u04CC\u04CE\u04CF\u04D1\u04D3\u04D5\u04D7\u04D9\u04DB\u04DD\u04DF\u04E1\u04E3\u04E5\u04E7\u04E9\u04EB\u04ED\u04EF\u04F1\u04F3\u04F5\u04F7\u04F9\u04FB\u04FD\u04FF\u0501\u0503\u0505\u0507\u0509\u050B\u050D\u050F\u0511\u0513\u0515\u0517\u0519\u051B\u051D\u051F\u0521\u0523\u0525\u0527\u0529\u052B\u052D\u052F\u0560-\u0588\u10D0-\u10FA\u10FD-\u10FF\u13F8-\u13FD\u1C80-\u1C88\u1D00-\u1D2B\u1D6B-\u1D77\u1D79-\u1D9A\u1E01\u1E03\u1E05\u1E07\u1E09\u1E0B\u1E0D\u1E0F\u1E11\u1E13\u1E15\u1E17\u1E19\u1E1B\u1E1D\u1E1F\u1E21\u1E23\u1E25\u1E27\u1E29\u1E2B\u1E2D\u1E2F\u1E31\u1E33\u1E35\u1E37\u1E39\u1E3B\u1E3D\u1E3F\u1E41\u1E43\u1E45\u1E47\u1E49\u1E4B\u1E4D\u1E4F\u1E51\u1E53\u1E55\u1E57\u1E59\u1E5B\u1E5D\u1E5F\u1E61\u1E63\u1E65\u1E67\u1E69\u1E6B\u1E6D\u1E6F\u1E71\u1E73\u1E75\u1E77\u1E79\u1E7B\u1E7D\u1E7F\u1E81\u1E83\u1E85\u1E87\u1E89\u1E8B\u1E8D\u1E8F\u1E91\u1E93\u1E95-\u1E9D\u1E9F\u1EA1\u1EA3\u1EA5\u1EA7\u1EA9\u1EAB\u1EAD\u1EAF\u1EB1\u1EB3\u1EB5\u1EB7\u1EB9\u1EBB\u1EBD\u1EBF\u1EC1\u1EC3\u1EC5\u1EC7\u1EC9\u1ECB\u1ECD\u1ECF\u1ED1\u1ED3\u1ED5\u1ED7\u1ED9\u1EDB\u1EDD\u1EDF\u1EE1\u1EE3\u1EE5\u1EE7\u1EE9\u1EEB\u1EED\u1EEF\u1EF1\u1EF3\u1EF5\u1EF7\u1EF9\u1EFB\u1EFD\u1EFF-\u1F07\u1F10-\u1F15\u1F20-\u1F27\u1F30-\u1F37\u1F40-\u1F45\u1F50-\u1F57\u1F60-\u1F67\u1F70-\u1F7D\u1F80-\u1F87\u1F90-\u1F97\u1FA0-\u1FA7\u1FB0-\u1FB4\u1FB6\u1FB7\u1FBE\u1FC2-\u1FC4\u1FC6\u1FC7\u1FD0-\u1FD3\u1FD6\u1FD7\u1FE0-\u1FE7\u1FF2-\u1FF4\u1FF6\u1FF7\u210A\u210E\u210F\u2113\u212F\u2134\u2139\u213C\u213D\u2146-\u2149\u214E\u2184\u2C30-\u2C5E\u2C61\u2C65\u2C66\u2C68\u2C6A\u2C6C\u2C71\u2C73\u2C74\u2C76-\u2C7B\u2C81\u2C83\u2C85\u2C87\u2C89\u2C8B\u2C8D\u2C8F\u2C91\u2C93\u2C95\u2C97\u2C99\u2C9B\u2C9D\u2C9F\u2CA1\u2CA3\u2CA5\u2CA7\u2CA9\u2CAB\u2CAD\u2CAF\u2CB1\u2CB3\u2CB5\u2CB7\u2CB9\u2CBB\u2CBD\u2CBF\u2CC1\u2CC3\u2CC5\u2CC7\u2CC9\u2CCB\u2CCD\u2CCF\u2CD1\u2CD3\u2CD5\u2CD7\u2CD9\u2CDB\u2CDD\u2CDF\u2CE1\u2CE3\u2CE4\u2CEC\u2CEE\u2CF3\u2D00-\u2D25\u2D27\u2D2D\uA641\uA643\uA645\uA647\uA649\uA64B\uA64D\uA64F\uA651\uA653\uA655\uA657\uA659\uA65B\uA65D\uA65F\uA661\uA663\uA665\uA667\uA669\uA66B\uA66D\uA681\uA683\uA685\uA687\uA689\uA68B\uA68D\uA68F\uA691\uA693\uA695\uA697\uA699\uA69B\uA723\uA725\uA727\uA729\uA72B\uA72D\uA72F-\uA731\uA733\uA735\uA737\uA739\uA73B\uA73D\uA73F\uA741\uA743\uA745\uA747\uA749\uA74B\uA74D\uA74F\uA751\uA753\uA755\uA757\uA759\uA75B\uA75D\uA75F\uA761\uA763\uA765\uA767\uA769\uA76B\uA76D\uA76F\uA771-\uA778\uA77A\uA77C\uA77F\uA781\uA783\uA785\uA787\uA78C\uA78E\uA791\uA793-\uA795\uA797\uA799\uA79B\uA79D\uA79F\uA7A1\uA7A3\uA7A5\uA7A7\uA7A9\uA7AF\uA7B5\uA7B7\uA7B9\uA7BB\uA7BD\uA7BF\uA7C3\uA7FA\uAB30-\uAB5A\uAB60-\uAB67\uAB70-\uABBF\uFB00-\uFB06\uFB13-\uFB17\uFF41-\uFF5A]|\uD801[\uDC28-\uDC4F\uDCD8-\uDCFB]|\uD803[\uDCC0-\uDCF2]|\uD806[\uDCC0-\uDCDF]|\uD81B[\uDE60-\uDE7F]|\uD835[\uDC1A-\uDC33\uDC4E-\uDC54\uDC56-\uDC67\uDC82-\uDC9B\uDCB6-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDCCF\uDCEA-\uDD03\uDD1E-\uDD37\uDD52-\uDD6B\uDD86-\uDD9F\uDDBA-\uDDD3\uDDEE-\uDE07\uDE22-\uDE3B\uDE56-\uDE6F\uDE8A-\uDEA5\uDEC2-\uDEDA\uDEDC-\uDEE1\uDEFC-\uDF14\uDF16-\uDF1B\uDF36-\uDF4E\uDF50-\uDF55\uDF70-\uDF88\uDF8A-\uDF8F\uDFAA-\uDFC2\uDFC4-\uDFC9\uDFCB]|\uD83A[\uDD22-\uDD43])/,
  surrogates: /[\uD800-\uDFFF]/,
  punctuation: /[!"'-\),-\/:;\?\[-\]_\{\}\xA1\xA7\xAB\xB6\xB7\xBB\xBF\u037E\u0387\u055A-\u055F\u0589\u058A\u05BE\u05C0\u05C3\u05C6\u05F3\u05F4\u0609\u060A\u060C\u060D\u061B\u061E\u061F\u066A-\u066D\u06D4\u0700-\u070D\u07F7-\u07F9\u0830-\u083E\u085E\u0964\u0965\u0970\u09FD\u0A76\u0AF0\u0C77\u0C84\u0DF4\u0E4F\u0E5A\u0E5B\u0F04-\u0F12\u0F14\u0F3A-\u0F3D\u0F85\u0FD0-\u0FD4\u0FD9\u0FDA\u104A-\u104F\u10FB\u1360-\u1368\u1400\u166E\u169B\u169C\u16EB-\u16ED\u1735\u1736\u17D4-\u17D6\u17D8-\u17DA\u1800-\u180A\u1944\u1945\u1A1E\u1A1F\u1AA0-\u1AA6\u1AA8-\u1AAD\u1B5A-\u1B60\u1BFC-\u1BFF\u1C3B-\u1C3F\u1C7E\u1C7F\u1CC0-\u1CC7\u1CD3\u2010-\u201F\u2022-\u2027\u2032-\u203A\u203C-\u2043\u2045-\u2051\u2053-\u205E\u207D\u207E\u208D\u208E\u2308-\u230B\u2329\u232A\u2768-\u2775\u27C5\u27C6\u27E6-\u27EF\u2983-\u2998\u29D8-\u29DB\u29FC\u29FD\u2CF9-\u2CFC\u2CFE\u2CFF\u2D70\u2E00-\u2E2E\u2E30-\u2E4F\u3001-\u3003\u3008-\u3011\u3014-\u301F\u3030\u303D\u30A0\u30FB\uA4FE\uA4FF\uA60D-\uA60F\uA673\uA67E\uA6F2-\uA6F7\uA874-\uA877\uA8CE\uA8CF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA95F\uA9C1-\uA9CD\uA9DE\uA9DF\uAA5C-\uAA5F\uAADE\uAADF\uAAF0\uAAF1\uABEB\uFD3E\uFD3F\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE61\uFE63\uFE68\uFE6A\uFE6B\uFF01-\uFF03\uFF05-\uFF0A\uFF0C-\uFF0F\uFF1A\uFF1B\uFF1F\uFF20\uFF3B-\uFF3D\uFF3F\uFF5B\uFF5D\uFF5F-\uFF65]|\uD800[\uDD00-\uDD02\uDF9F\uDFD0]|\uD801\uDD6F|\uD802[\uDC57\uDD1F\uDD3F\uDE50-\uDE58\uDE7F\uDEF0-\uDEF6\uDF39-\uDF3F\uDF99-\uDF9C]|\uD803[\uDF55-\uDF59]|\uD804[\uDC47-\uDC4D\uDCBB\uDCBC\uDCBE-\uDCC1\uDD40-\uDD43\uDD74\uDD75\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDDF\uDE38-\uDE3D\uDEA9]|\uD805[\uDC4B-\uDC4F\uDC5B\uDC5D\uDCC6\uDDC1-\uDDD7\uDE41-\uDE43\uDE60-\uDE6C\uDF3C-\uDF3E]|\uD806[\uDC3B\uDDE2\uDE3F-\uDE46\uDE9A-\uDE9C\uDE9E-\uDEA2]|\uD807[\uDC41-\uDC45\uDC70\uDC71\uDEF7\uDEF8\uDFFF]|\uD809[\uDC70-\uDC74]|\uD81A[\uDE6E\uDE6F\uDEF5\uDF37-\uDF3B\uDF44]|\uD81B[\uDE97-\uDE9A\uDFE2]|\uD82F\uDC9F|\uD836[\uDE87-\uDE8B]|\uD83A[\uDD5E\uDD5F]/,
  word: /[0-9A-Za-z\xAA\xB2\xB3\xB5\xB9\xBA\xBC-\xBE\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u052F\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05EF-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u07FD\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D3-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09F4-\u09F9\u09FC\u09FE\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71-\u0B77\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BF2\u0C00-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C78-\u0C7E\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D63\u0D66-\u0D78\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F33\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1369-\u137C\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u17F0-\u17F9\u180B-\u180D\u1810-\u1819\u1820-\u1878\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19DA\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABE\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CD0-\u1CD2\u1CD4-\u1CFA\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2070\u2071\u2074-\u2079\u207F-\u2089\u2090-\u209C\u20D0-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2150-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2CFD\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u3192-\u3195\u31A0-\u31BA\u31F0-\u31FF\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\u3400-\u4DB5\u4E00-\u9FEF\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA672\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7BF\uA7C2-\uA7C6\uA7F7-\uA827\uA830-\uA835\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB67\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD07-\uDD33\uDD40-\uDD78\uDD8A\uDD8B\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0-\uDEFB\uDF00-\uDF23\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC58-\uDC76\uDC79-\uDC9E\uDCA7-\uDCAF\uDCE0-\uDCF2\uDCF4\uDCF5\uDCFB-\uDD1B\uDD20-\uDD39\uDD80-\uDDB7\uDDBC-\uDDCF\uDDD2-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE35\uDE38-\uDE3A\uDE3F-\uDE48\uDE60-\uDE7E\uDE80-\uDE9F\uDEC0-\uDEC7\uDEC9-\uDEE6\uDEEB-\uDEEF\uDF00-\uDF35\uDF40-\uDF55\uDF58-\uDF72\uDF78-\uDF91\uDFA9-\uDFAF]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2\uDCFA-\uDD27\uDD30-\uDD39\uDE60-\uDE7E\uDF00-\uDF27\uDF30-\uDF54\uDFE0-\uDFF6]|\uD804[\uDC00-\uDC46\uDC52-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD44-\uDD46\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDC9-\uDDCC\uDDD0-\uDDDA\uDDDC\uDDE1-\uDDF4\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3B-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC5E\uDC5F\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB8\uDEC0-\uDEC9\uDF00-\uDF1A\uDF1D-\uDF2B\uDF30-\uDF3B]|\uD806[\uDC00-\uDC3A\uDCA0-\uDCF2\uDCFF\uDDA0-\uDDA7\uDDAA-\uDDD7\uDDDA-\uDDE1\uDDE3\uDDE4\uDE00-\uDE3E\uDE47\uDE50-\uDE99\uDE9D\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC6C\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59\uDD60-\uDD65\uDD67\uDD68\uDD6A-\uDD8E\uDD90\uDD91\uDD93-\uDD98\uDDA0-\uDDA9\uDEE0-\uDEF6\uDFC0-\uDFD4]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF5B-\uDF61\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDE40-\uDE96\uDF00-\uDF4A\uDF4F-\uDF87\uDF8F-\uDF9F\uDFE0\uDFE1\uDFE3]|\uD821[\uDC00-\uDFF7]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD50-\uDD52\uDD64-\uDD67\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44\uDEE0-\uDEF3\uDF60-\uDF78]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A\uDD00-\uDD2C\uDD30-\uDD3D\uDD40-\uDD49\uDD4E\uDEC0-\uDEF9]|\uD83A[\uDC00-\uDCC4\uDCC7-\uDCD6\uDD00-\uDD4B\uDD50-\uDD59]|\uD83B[\uDC71-\uDCAB\uDCAD-\uDCAF\uDCB1-\uDCB4\uDD01-\uDD2D\uDD2F-\uDD3D\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD83C[\uDD00-\uDD0C]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/,
  whiteSpace: /[\t-\r \x85\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/
}

},{}],87:[function(require,module,exports){
'use strict'

var createParser = require('./parser')
var expressions = require('./expressions')

module.exports = ParseLatin

// PARSE LATIN

// Transform Latin-script natural language into an NLCST-tree.
function ParseLatin(doc, file) {
  var value = file || doc

  if (!(this instanceof ParseLatin)) {
    return new ParseLatin(doc, file)
  }

  this.doc = value ? String(value) : null
}

// Quick access to the prototype.
var proto = ParseLatin.prototype

// Default position.
proto.position = true

// Create text nodes.
proto.tokenizeSymbol = createTextFactory('Symbol')
proto.tokenizeWhiteSpace = createTextFactory('WhiteSpace')
proto.tokenizePunctuation = createTextFactory('Punctuation')
proto.tokenizeSource = createTextFactory('Source')
proto.tokenizeText = createTextFactory('Text')

// Expose `run`.
proto.run = run

// Inject `plugins` to modifiy the result of the method at `key` on the operated
// on context.
proto.use = useFactory(function(context, key, plugins) {
  context[key] = context[key].concat(plugins)
})

// Inject `plugins` to modifiy the result of the method at `key` on the operated
// on context, before any other.
proto.useFirst = useFactory(function(context, key, plugins) {
  context[key] = plugins.concat(context[key])
})

// Easy access to the document parser. This additionally supports retext-style
// invocation: where an instance is created for each file, and the file is given
// on construction.
proto.parse = function(value) {
  return this.tokenizeRoot(value || this.doc)
}

// Transform a `value` into a list of `NLCSTNode`s.
proto.tokenize = function(value) {
  return tokenize(this, value)
}

// PARENT NODES
//
// All these nodes are `pluggable`: they come with a `use` method which accepts
// a plugin (`function(NLCSTNode)`).
// Every time one of these methods are called, the plugin is invoked with the
// node, allowing for easy modification.
//
// In fact, the internal transformation from `tokenize` (a list of words, white
// space, punctuation, and symbols) to `tokenizeRoot` (an NLCST tree), is also
// implemented through this mechanism.

// Create a `WordNode` with its children set to a single `TextNode`, its value
// set to the given `value`.
pluggable(ParseLatin, 'tokenizeWord', function(value, eat) {
  var add = (eat || noopEat)('')
  var parent = {type: 'WordNode', children: []}

  this.tokenizeText(value, eat, parent)

  return add(parent)
})

// Create a `SentenceNode` with its children set to `Node`s, their values set
// to the tokenized given `value`.
//
// Unless plugins add new nodes, the sentence is populated by `WordNode`s,
// `SymbolNode`s, `PunctuationNode`s, and `WhiteSpaceNode`s.
pluggable(
  ParseLatin,
  'tokenizeSentence',
  createParser({
    type: 'SentenceNode',
    tokenizer: 'tokenize'
  })
)

// Create a `ParagraphNode` with its children set to `Node`s, their values set
// to the tokenized given `value`.
//
// Unless plugins add new nodes, the paragraph is populated by `SentenceNode`s
// and `WhiteSpaceNode`s.
pluggable(
  ParseLatin,
  'tokenizeParagraph',
  createParser({
    type: 'ParagraphNode',
    delimiter: expressions.terminalMarker,
    delimiterType: 'PunctuationNode',
    tokenizer: 'tokenizeSentence'
  })
)

// Create a `RootNode` with its children set to `Node`s, their values set to the
// tokenized given `value`.
pluggable(
  ParseLatin,
  'tokenizeRoot',
  createParser({
    type: 'RootNode',
    delimiter: expressions.newLine,
    delimiterType: 'WhiteSpaceNode',
    tokenizer: 'tokenizeParagraph'
  })
)

// PLUGINS

proto.use('tokenizeSentence', [
  require('./plugin/merge-initial-word-symbol'),
  require('./plugin/merge-final-word-symbol'),
  require('./plugin/merge-inner-word-symbol'),
  require('./plugin/merge-inner-word-slash'),
  require('./plugin/merge-initialisms'),
  require('./plugin/merge-words'),
  require('./plugin/patch-position')
])

proto.use('tokenizeParagraph', [
  require('./plugin/merge-non-word-sentences'),
  require('./plugin/merge-affix-symbol'),
  require('./plugin/merge-initial-lower-case-letter-sentences'),
  require('./plugin/merge-initial-digit-sentences'),
  require('./plugin/merge-prefix-exceptions'),
  require('./plugin/merge-affix-exceptions'),
  require('./plugin/merge-remaining-full-stops'),
  require('./plugin/make-initial-white-space-siblings'),
  require('./plugin/make-final-white-space-siblings'),
  require('./plugin/break-implicit-sentences'),
  require('./plugin/remove-empty-nodes'),
  require('./plugin/patch-position')
])

proto.use('tokenizeRoot', [
  require('./plugin/make-initial-white-space-siblings'),
  require('./plugin/make-final-white-space-siblings'),
  require('./plugin/remove-empty-nodes'),
  require('./plugin/patch-position')
])

// TEXT NODES

// Factory to create a `Text`.
function createTextFactory(type) {
  type += 'Node'

  return createText

  // Construct a `Text` from a bound `type`
  function createText(value, eat, parent) {
    if (value === null || value === undefined) {
      value = ''
    }

    return (eat || noopEat)(value)(
      {
        type: type,
        value: String(value)
      },
      parent
    )
  }
}

// Run transform plug-ins for `key` on `nodes`.
function run(key, nodes) {
  var wareKey = key + 'Plugins'
  var plugins = this[wareKey]
  var index = -1

  if (plugins) {
    while (plugins[++index]) {
      plugins[index](nodes)
    }
  }

  return nodes
}

// Make a method “pluggable”.
function pluggable(Constructor, key, callback) {
  // Set a pluggable version of `callback` on `Constructor`.
  Constructor.prototype[key] = function() {
    return this.run(key, callback.apply(this, arguments))
  }
}

// Factory to inject `plugins`. Takes `callback` for the actual inserting.
function useFactory(callback) {
  return use

  // Validate if `plugins` can be inserted.
  // Invokes the bound `callback` to do the actual inserting.
  function use(key, plugins) {
    var self = this
    var wareKey

    // Throw if the method is not pluggable.
    if (!(key in self)) {
      throw new Error(
        'Illegal Invocation: Unsupported `key` for ' +
          '`use(key, plugins)`. Make sure `key` is a ' +
          'supported function'
      )
    }

    // Fail silently when no plugins are given.
    if (!plugins) {
      return
    }

    wareKey = key + 'Plugins'

    // Make sure `plugins` is a list.
    if (typeof plugins === 'function') {
      plugins = [plugins]
    } else {
      plugins = plugins.concat()
    }

    // Make sure `wareKey` exists.
    if (!self[wareKey]) {
      self[wareKey] = []
    }

    // Invoke callback with the ware key and plugins.
    callback(self, wareKey, plugins)
  }
}

// CLASSIFY

// Match a word character.
var wordRe = expressions.word

// Match a surrogate character.
var surrogatesRe = expressions.surrogates

// Match a punctuation character.
var punctuationRe = expressions.punctuation

// Match a white space character.
var whiteSpaceRe = expressions.whiteSpace

// Transform a `value` into a list of `NLCSTNode`s.
function tokenize(parser, value) {
  var tokens
  var offset
  var line
  var column
  var index
  var length
  var character
  var queue
  var prev
  var left
  var right
  var eater

  if (value === null || value === undefined) {
    value = ''
  } else if (value instanceof String) {
    value = value.toString()
  }

  if (typeof value !== 'string') {
    // Return the given nodes if this is either an empty array, or an array with
    // a node as a first child.
    if ('length' in value && (!value[0] || value[0].type)) {
      return value
    }

    throw new Error(
      "Illegal invocation: '" +
        value +
        "' is not a valid argument for 'ParseLatin'"
    )
  }

  tokens = []

  if (!value) {
    return tokens
  }

  index = 0
  offset = 0
  line = 1
  column = 1

  // Eat mechanism to use.
  eater = parser.position ? eat : noPositionEat

  length = value.length
  prev = ''
  queue = ''

  while (index < length) {
    character = value.charAt(index)

    if (whiteSpaceRe.test(character)) {
      right = 'WhiteSpace'
    } else if (punctuationRe.test(character)) {
      right = 'Punctuation'
    } else if (wordRe.test(character)) {
      right = 'Word'
    } else {
      right = 'Symbol'
    }

    tick()

    prev = character
    character = ''
    left = right
    right = null

    index++
  }

  tick()

  return tokens

  // Check one character.
  function tick() {
    if (
      left === right &&
      (left === 'Word' ||
        left === 'WhiteSpace' ||
        character === prev ||
        surrogatesRe.test(character))
    ) {
      queue += character
    } else {
      // Flush the previous queue.
      if (queue) {
        parser['tokenize' + left](queue, eater)
      }

      queue = character
    }
  }

  // Remove `subvalue` from `value`.
  // Expects `subvalue` to be at the start from `value`, and applies no
  // validation.
  function eat(subvalue) {
    var pos = position()

    update(subvalue)

    return apply

    // Add the given arguments, add `position` to the returned node, and return
    // the node.
    function apply() {
      return pos(add.apply(null, arguments))
    }
  }

  // Remove `subvalue` from `value`.
  // Does not patch positional information.
  function noPositionEat() {
    return apply

    // Add the given arguments and return the node.
    function apply() {
      return add.apply(null, arguments)
    }
  }

  // Add mechanism.
  function add(node, parent) {
    if (parent) {
      parent.children.push(node)
    } else {
      tokens.push(node)
    }

    return node
  }

  // Mark position and patch `node.position`.
  function position() {
    var before = now()

    // Add the position to a node.
    function patch(node) {
      node.position = new Position(before)

      return node
    }

    return patch
  }

  // Update line and column based on `value`.
  function update(subvalue) {
    var subvalueLength = subvalue.length
    var character = -1
    var lastIndex = -1

    offset += subvalueLength

    while (++character < subvalueLength) {
      if (subvalue.charAt(character) === '\n') {
        lastIndex = character
        line++
      }
    }

    if (lastIndex === -1) {
      column += subvalueLength
    } else {
      column = subvalueLength - lastIndex
    }
  }

  // Store position information for a node.
  function Position(start) {
    this.start = start
    this.end = now()
  }

  // Get the current position.
  function now() {
    return {
      line: line,
      column: column,
      offset: offset
    }
  }
}

// Add mechanism used when text-tokenisers are called directly outside of the
// `tokenize` function.
function noopAdd(node, parent) {
  if (parent) {
    parent.children.push(node)
  }

  return node
}

// Eat and add mechanism without adding positional information, used when
// text-tokenisers are called directly outside of the `tokenize` function.
function noopEat() {
  return noopAdd
}

},{"./expressions":86,"./parser":88,"./plugin/break-implicit-sentences":89,"./plugin/make-final-white-space-siblings":90,"./plugin/make-initial-white-space-siblings":91,"./plugin/merge-affix-exceptions":92,"./plugin/merge-affix-symbol":93,"./plugin/merge-final-word-symbol":94,"./plugin/merge-initial-digit-sentences":95,"./plugin/merge-initial-lower-case-letter-sentences":96,"./plugin/merge-initial-word-symbol":97,"./plugin/merge-initialisms":98,"./plugin/merge-inner-word-slash":99,"./plugin/merge-inner-word-symbol":100,"./plugin/merge-non-word-sentences":101,"./plugin/merge-prefix-exceptions":102,"./plugin/merge-remaining-full-stops":103,"./plugin/merge-words":104,"./plugin/patch-position":105,"./plugin/remove-empty-nodes":106}],88:[function(require,module,exports){
'use strict'

var tokenizer = require('./tokenizer')

module.exports = parserFactory

// Construct a parser based on `options`.
function parserFactory(options) {
  var type = options.type
  var tokenizerProperty = options.tokenizer
  var delimiter = options.delimiter
  var tokenize = delimiter && tokenizer(options.delimiterType, delimiter)

  return parser

  function parser(value) {
    var children = this[tokenizerProperty](value)

    return {
      type: type,
      children: tokenize ? tokenize(children) : children
    }
  }
}

},{"./tokenizer":107}],89:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(breakImplicitSentences)

// Two or more new line characters.
var multiNewLine = expressions.newLineMulti

// Break a sentence if a white space with more than one new-line is found.
function breakImplicitSentences(child, index, parent) {
  var children
  var position
  var length
  var tail
  var head
  var end
  var insertion
  var node

  if (child.type !== 'SentenceNode') {
    return
  }

  children = child.children

  // Ignore first and last child.
  length = children.length - 1
  position = 0

  while (++position < length) {
    node = children[position]

    if (node.type !== 'WhiteSpaceNode' || !multiNewLine.test(toString(node))) {
      continue
    }

    child.children = children.slice(0, position)

    insertion = {
      type: 'SentenceNode',
      children: children.slice(position + 1)
    }

    tail = children[position - 1]
    head = children[position + 1]

    parent.children.splice(index + 1, 0, node, insertion)

    if (child.position && tail.position && head.position) {
      end = child.position.end

      child.position.end = tail.position.end

      insertion.position = {
        start: head.position.start,
        end: end
      }
    }

    return index + 1
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],90:[function(require,module,exports){
'use strict'

var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(makeFinalWhiteSpaceSiblings)

// Move white space ending a paragraph up, so they are the siblings of
// paragraphs.
function makeFinalWhiteSpaceSiblings(child, index, parent) {
  var children = child.children
  var prev

  if (
    children &&
    children.length !== 0 &&
    children[children.length - 1].type === 'WhiteSpaceNode'
  ) {
    parent.children.splice(index + 1, 0, child.children.pop())
    prev = children[children.length - 1]

    if (prev && prev.position && child.position) {
      child.position.end = prev.position.end
    }

    // Next, iterate over the current node again.
    return index
  }
}

},{"unist-util-modify-children":125}],91:[function(require,module,exports){
'use strict'

var visitChildren = require('unist-util-visit-children')

module.exports = visitChildren(makeInitialWhiteSpaceSiblings)

// Move white space starting a sentence up, so they are the siblings of
// sentences.
function makeInitialWhiteSpaceSiblings(child, index, parent) {
  var children = child.children
  var next

  if (
    children &&
    children.length !== 0 &&
    children[0].type === 'WhiteSpaceNode'
  ) {
    parent.children.splice(index, 0, children.shift())
    next = children[0]

    if (next && next.position && child.position) {
      child.position.start = next.position.start
    }
  }
}

},{"unist-util-visit-children":127}],92:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeAffixExceptions)

// Merge a sentence into its previous sentence, when the sentence starts with a
// comma.
function mergeAffixExceptions(child, index, parent) {
  var children = child.children
  var node
  var position
  var value
  var previousChild

  if (!children || children.length === 0 || index === 0) {
    return
  }

  position = -1

  while (children[++position]) {
    node = children[position]

    if (node.type === 'WordNode') {
      return
    }

    if (node.type === 'SymbolNode' || node.type === 'PunctuationNode') {
      value = toString(node)

      if (value !== ',' && value !== ';') {
        return
      }

      previousChild = parent.children[index - 1]

      previousChild.children = previousChild.children.concat(children)

      // Update position.
      if (previousChild.position && child.position) {
        previousChild.position.end = child.position.end
      }

      parent.children.splice(index, 1)

      // Next, iterate over the node *now* at the current position.
      return index
    }
  }
}

},{"nlcst-to-string":78,"unist-util-modify-children":125}],93:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(mergeAffixSymbol)

// Closing or final punctuation, or terminal markers that should still be
// included in the previous sentence, even though they follow the sentence’s
// terminal marker.
var affixSymbol = expressions.affixSymbol

// Move certain punctuation following a terminal marker (thus in the next
// sentence) to the previous sentence.
function mergeAffixSymbol(child, index, parent) {
  var children = child.children
  var first
  var second
  var prev

  if (children && children.length !== 0 && index !== 0) {
    first = children[0]
    second = children[1]
    prev = parent.children[index - 1]

    if (
      (first.type === 'SymbolNode' || first.type === 'PunctuationNode') &&
      affixSymbol.test(toString(first))
    ) {
      prev.children.push(children.shift())

      // Update position.
      if (first.position && prev.position) {
        prev.position.end = first.position.end
      }

      if (second && second.position && child.position) {
        child.position.start = second.position.start
      }

      // Next, iterate over the previous node again.
      return index - 1
    }
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],94:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeFinalWordSymbol)

// Merge certain punctuation marks into their preceding words.
function mergeFinalWordSymbol(child, index, parent) {
  var children
  var prev
  var next

  if (
    index !== 0 &&
    (child.type === 'SymbolNode' || child.type === 'PunctuationNode') &&
    toString(child) === '-'
  ) {
    children = parent.children

    prev = children[index - 1]
    next = children[index + 1]

    if (
      (!next || next.type !== 'WordNode') &&
      (prev && prev.type === 'WordNode')
    ) {
      // Remove `child` from parent.
      children.splice(index, 1)

      // Add the punctuation mark at the end of the previous node.
      prev.children.push(child)

      // Update position.
      if (prev.position && child.position) {
        prev.position.end = child.position.end
      }

      // Next, iterate over the node *now* at the current position (which was
      // the next node).
      return index
    }
  }
}

},{"nlcst-to-string":78,"unist-util-modify-children":125}],95:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(mergeInitialDigitSentences)

// Initial lowercase letter.
var digit = expressions.digitStart

// Merge a sentence into its previous sentence, when the sentence starts with a
// lower case letter.
function mergeInitialDigitSentences(child, index, parent) {
  var children = child.children
  var siblings = parent.children
  var prev = siblings[index - 1]
  var head = children[0]

  if (prev && head && head.type === 'WordNode' && digit.test(toString(head))) {
    prev.children = prev.children.concat(children)
    siblings.splice(index, 1)

    // Update position.
    if (prev.position && child.position) {
      prev.position.end = child.position.end
    }

    // Next, iterate over the node *now* at the current position.
    return index
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],96:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(mergeInitialLowerCaseLetterSentences)

// Initial lowercase letter.
var lowerInitial = expressions.lowerInitial

// Merge a sentence into its previous sentence, when the sentence starts with a
// lower case letter.
function mergeInitialLowerCaseLetterSentences(child, index, parent) {
  var children = child.children
  var position
  var node
  var siblings
  var prev

  if (children && children.length !== 0 && index !== 0) {
    position = -1

    while (children[++position]) {
      node = children[position]

      if (node.type === 'WordNode') {
        if (!lowerInitial.test(toString(node))) {
          return
        }

        siblings = parent.children

        prev = siblings[index - 1]

        prev.children = prev.children.concat(children)

        siblings.splice(index, 1)

        // Update position.
        if (prev.position && child.position) {
          prev.position.end = child.position.end
        }

        // Next, iterate over the node *now* at the current position.
        return index
      }

      if (node.type === 'SymbolNode' || node.type === 'PunctuationNode') {
        return
      }
    }
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],97:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeInitialWordSymbol)

// Merge certain punctuation marks into their following words.
function mergeInitialWordSymbol(child, index, parent) {
  var children
  var next

  if (
    (child.type !== 'SymbolNode' && child.type !== 'PunctuationNode') ||
    toString(child) !== '&'
  ) {
    return
  }

  children = parent.children

  next = children[index + 1]

  // If either a previous word, or no following word, exists, exit early.
  if (
    (index !== 0 && children[index - 1].type === 'WordNode') ||
    !(next && next.type === 'WordNode')
  ) {
    return
  }

  // Remove `child` from parent.
  children.splice(index, 1)

  // Add the punctuation mark at the start of the next node.
  next.children.unshift(child)

  // Update position.
  if (next.position && child.position) {
    next.position.start = child.position.start
  }

  // Next, iterate over the node at the previous position, as it's now adjacent
  // to a following word.
  return index - 1
}

},{"nlcst-to-string":78,"unist-util-modify-children":125}],98:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(mergeInitialisms)

var numerical = expressions.numerical

// Merge initialisms.
function mergeInitialisms(child, index, parent) {
  var siblings
  var prev
  var children
  var length
  var position
  var otherChild
  var isAllDigits
  var value

  if (index !== 0 && toString(child) === '.') {
    siblings = parent.children

    prev = siblings[index - 1]
    children = prev.children

    length = children && children.length

    if (prev.type === 'WordNode' && length !== 1 && length % 2 !== 0) {
      position = length

      isAllDigits = true

      while (children[--position]) {
        otherChild = children[position]

        value = toString(otherChild)

        if (position % 2 === 0) {
          // Initialisms consist of one character values.
          if (value.length > 1) {
            return
          }

          if (!numerical.test(value)) {
            isAllDigits = false
          }
        } else if (value !== '.') {
          if (position < length - 2) {
            break
          } else {
            return
          }
        }
      }

      if (!isAllDigits) {
        // Remove `child` from parent.
        siblings.splice(index, 1)

        // Add child to the previous children.
        children.push(child)

        // Update position.
        if (prev.position && child.position) {
          prev.position.end = child.position.end
        }

        // Next, iterate over the node *now* at the current position.
        return index
      }
    }
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],99:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeInnerWordSlash)

var slash = '/'

// Merge words joined by certain punctuation marks.
function mergeInnerWordSlash(child, index, parent) {
  var siblings = parent.children
  var prev
  var next
  var prevValue
  var nextValue
  var queue
  var tail
  var count

  prev = siblings[index - 1]
  next = siblings[index + 1]

  if (
    prev &&
    prev.type === 'WordNode' &&
    (child.type === 'SymbolNode' || child.type === 'PunctuationNode') &&
    toString(child) === slash
  ) {
    prevValue = toString(prev)
    tail = child
    queue = [child]
    count = 1

    if (next && next.type === 'WordNode') {
      nextValue = toString(next)
      tail = next
      queue = queue.concat(next.children)
      count++
    }

    if (prevValue.length < 3 && (!nextValue || nextValue.length < 3)) {
      // Add all found tokens to `prev`s children.
      prev.children = prev.children.concat(queue)

      siblings.splice(index, count)

      // Update position.
      if (prev.position && tail.position) {
        prev.position.end = tail.position.end
      }

      // Next, iterate over the node *now* at the current position.
      return index
    }
  }
}

},{"nlcst-to-string":78,"unist-util-modify-children":125}],100:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')
var expressions = require('../expressions')

module.exports = modifyChildren(mergeInnerWordSymbol)

// Symbols part of surrounding words.
var wordSymbolInner = expressions.wordSymbolInner

// Merge words joined by certain punctuation marks.
function mergeInnerWordSymbol(child, index, parent) {
  var siblings
  var sibling
  var prev
  var last
  var position
  var tokens
  var queue

  if (
    index !== 0 &&
    (child.type === 'SymbolNode' || child.type === 'PunctuationNode')
  ) {
    siblings = parent.children
    prev = siblings[index - 1]

    if (prev && prev.type === 'WordNode') {
      position = index - 1

      tokens = []
      queue = []

      // -   If a token which is neither word nor inner word symbol is found,
      //     the loop is broken
      // -   If an inner word symbol is found,  it’s queued
      // -   If a word is found, it’s queued (and the queue stored and emptied)
      while (siblings[++position]) {
        sibling = siblings[position]

        if (sibling.type === 'WordNode') {
          tokens = tokens.concat(queue, sibling.children)

          queue = []
        } else if (
          (sibling.type === 'SymbolNode' ||
            sibling.type === 'PunctuationNode') &&
          wordSymbolInner.test(toString(sibling))
        ) {
          queue.push(sibling)
        } else {
          break
        }
      }

      if (tokens.length !== 0) {
        // If there is a queue, remove its length from `position`.
        if (queue.length !== 0) {
          position -= queue.length
        }

        // Remove every (one or more) inner-word punctuation marks and children
        // of words.
        siblings.splice(index, position - index)

        // Add all found tokens to `prev`s children.
        prev.children = prev.children.concat(tokens)

        last = tokens[tokens.length - 1]

        // Update position.
        if (prev.position && last.position) {
          prev.position.end = last.position.end
        }

        // Next, iterate over the node *now* at the current position.
        return index
      }
    }
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-modify-children":125}],101:[function(require,module,exports){
'use strict'

var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeNonWordSentences)

// Merge a sentence into the following sentence, when the sentence does not
// contain word tokens.
function mergeNonWordSentences(child, index, parent) {
  var children = child.children
  var position = -1
  var prev
  var next

  while (children[++position]) {
    if (children[position].type === 'WordNode') {
      return
    }
  }

  prev = parent.children[index - 1]

  if (prev) {
    prev.children = prev.children.concat(children)

    // Remove the child.
    parent.children.splice(index, 1)

    // Patch position.
    if (prev.position && child.position) {
      prev.position.end = child.position.end
    }

    // Next, iterate over the node *now* at the current position (which was the
    // next node).
    return index
  }

  next = parent.children[index + 1]

  if (next) {
    next.children = children.concat(next.children)

    // Patch position.
    if (next.position && child.position) {
      next.position.start = child.position.start
    }

    // Remove the child.
    parent.children.splice(index, 1)
  }
}

},{"unist-util-modify-children":125}],102:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergePrefixExceptions)

// Blacklist of full stop characters that should not be treated as terminal
// sentence markers: A case-insensitive abbreviation.
var abbreviationPrefix = new RegExp(
  '^(' +
    '[0-9]{1,3}|' +
    '[a-z]|' +
    // Common Latin Abbreviations:
    // Based on: <https://en.wikipedia.org/wiki/List_of_Latin_abbreviations>.
    // Where only the abbreviations written without joining full stops,
    // but with a final full stop, were extracted.
    //
    // circa, capitulus, confer, compare, centum weight, eadem, (et) alii,
    // et cetera, floruit, foliis, ibidem, idem, nemine && contradicente,
    // opere && citato, (per) cent, (per) procurationem, (pro) tempore,
    // sic erat scriptum, (et) sequentia, statim, videlicet. */
    'al|ca|cap|cca|cent|cf|cit|con|cp|cwt|ead|etc|ff|' +
    'fl|ibid|id|nem|op|pro|seq|sic|stat|tem|viz' +
    ')$'
)

// Merge a sentence into its next sentence, when the sentence ends with a
// certain word.
function mergePrefixExceptions(child, index, parent) {
  var children = child.children
  var period
  var node
  var next

  if (children && children.length > 1) {
    period = children[children.length - 1]

    if (period && toString(period) === '.') {
      node = children[children.length - 2]

      if (
        node &&
        node.type === 'WordNode' &&
        abbreviationPrefix.test(toString(node).toLowerCase())
      ) {
        // Merge period into abbreviation.
        node.children.push(period)
        children.pop()

        // Update position.
        if (period.position && node.position) {
          node.position.end = period.position.end
        }

        // Merge sentences.
        next = parent.children[index + 1]

        if (next) {
          child.children = children.concat(next.children)

          parent.children.splice(index + 1, 1)

          // Update position.
          if (next.position && child.position) {
            child.position.end = next.position.end
          }

          // Next, iterate over the current node again.
          return index - 1
        }
      }
    }
  }
}

},{"nlcst-to-string":78,"unist-util-modify-children":125}],103:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')
var visitChildren = require('unist-util-visit-children')
var expressions = require('../expressions')

module.exports = visitChildren(mergeRemainingFullStops)

// Blacklist of full stop characters that should not be treated as terminal
// sentence markers: A case-insensitive abbreviation.
var terminalMarker = expressions.terminalMarker

// Merge non-terminal-marker full stops into the previous word (if available),
// or the next word (if available).
function mergeRemainingFullStops(child) {
  var children = child.children
  var position = children.length
  var hasFoundDelimiter = false
  var grandchild
  var prev
  var next
  var nextNext

  while (children[--position]) {
    grandchild = children[position]

    if (
      grandchild.type !== 'SymbolNode' &&
      grandchild.type !== 'PunctuationNode'
    ) {
      // This is a sentence without terminal marker, so we 'fool' the code to
      // make it think we have found one.
      if (grandchild.type === 'WordNode') {
        hasFoundDelimiter = true
      }

      continue
    }

    // Exit when this token is not a terminal marker.
    if (!terminalMarker.test(toString(grandchild))) {
      continue
    }

    // Ignore the first terminal marker found (starting at the end), as it
    // should not be merged.
    if (!hasFoundDelimiter) {
      hasFoundDelimiter = true

      continue
    }

    // Only merge a single full stop.
    if (toString(grandchild) !== '.') {
      continue
    }

    prev = children[position - 1]
    next = children[position + 1]

    if (prev && prev.type === 'WordNode') {
      nextNext = children[position + 2]

      // Continue when the full stop is followed by a space and another full
      // stop, such as: `{.} .`
      if (
        next &&
        nextNext &&
        next.type === 'WhiteSpaceNode' &&
        toString(nextNext) === '.'
      ) {
        continue
      }

      // Remove `child` from parent.
      children.splice(position, 1)

      // Add the punctuation mark at the end of the previous node.
      prev.children.push(grandchild)

      // Update position.
      if (grandchild.position && prev.position) {
        prev.position.end = grandchild.position.end
      }

      position--
    } else if (next && next.type === 'WordNode') {
      // Remove `child` from parent.
      children.splice(position, 1)

      // Add the punctuation mark at the start of the next node.
      next.children.unshift(grandchild)

      if (grandchild.position && next.position) {
        next.position.start = grandchild.position.start
      }
    }
  }
}

},{"../expressions":86,"nlcst-to-string":78,"unist-util-visit-children":127}],104:[function(require,module,exports){
'use strict'

var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(mergeFinalWordSymbol)

// Merge multiple words. This merges the children of adjacent words, something
// which should not occur naturally by parse-latin, but might happen when custom
// tokens were passed in.
function mergeFinalWordSymbol(child, index, parent) {
  var siblings = parent.children
  var next

  if (child.type === 'WordNode') {
    next = siblings[index + 1]

    if (next && next.type === 'WordNode') {
      // Remove `next` from parent.
      siblings.splice(index + 1, 1)

      // Add the punctuation mark at the end of the previous node.
      child.children = child.children.concat(next.children)

      // Update position.
      if (next.position && child.position) {
        child.position.end = next.position.end
      }

      // Next, re-iterate the current node.
      return index
    }
  }
}

},{"unist-util-modify-children":125}],105:[function(require,module,exports){
'use strict'

var visitChildren = require('unist-util-visit-children')

module.exports = visitChildren(patchPosition)

// Patch the position on a parent node based on its first and last child.
function patchPosition(child, index, node) {
  var siblings = node.children

  if (!child.position) {
    return
  }

  if (
    index === 0 &&
    (!node.position || /* istanbul ignore next */ !node.position.start)
  ) {
    patch(node)
    node.position.start = child.position.start
  }

  if (index === siblings.length - 1 && (!node.position || !node.position.end)) {
    patch(node)
    node.position.end = child.position.end
  }
}

// Add a `position` object when it does not yet exist on `node`.
function patch(node) {
  if (!node.position) {
    node.position = {}
  }
}

},{"unist-util-visit-children":127}],106:[function(require,module,exports){
'use strict'

var modifyChildren = require('unist-util-modify-children')

module.exports = modifyChildren(removeEmptyNodes)

// Remove empty children.
function removeEmptyNodes(child, index, parent) {
  if ('children' in child && child.children.length === 0) {
    parent.children.splice(index, 1)

    // Next, iterate over the node *now* at the current position (which was the
    // next node).
    return index
  }
}

},{"unist-util-modify-children":125}],107:[function(require,module,exports){
'use strict'

var toString = require('nlcst-to-string')

module.exports = tokenizerFactory

// Factory to create a tokenizer based on a given `expression`.
function tokenizerFactory(childType, expression) {
  return tokenizer

  // A function that splits.
  function tokenizer(node) {
    var children = []
    var tokens = node.children
    var type = node.type
    var length = tokens.length
    var index = -1
    var lastIndex = length - 1
    var start = 0
    var first
    var last
    var parent

    while (++index < length) {
      if (
        index === lastIndex ||
        (tokens[index].type === childType &&
          expression.test(toString(tokens[index])))
      ) {
        first = tokens[start]
        last = tokens[index]

        parent = {
          type: type,
          children: tokens.slice(start, index + 1)
        }

        if (first.position && last.position) {
          parent.position = {
            start: first.position.start,
            end: last.position.end
          }
        }

        children.push(parent)

        start = index + 1
      }
    }

    return children
  }
}

},{"nlcst-to-string":78}],108:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":110}],109:[function(require,module,exports){
/* global define */

(function (root, pluralize) {
  /* istanbul ignore else */
  if (typeof require === 'function' && typeof exports === 'object' && typeof module === 'object') {
    // Node.
    module.exports = pluralize();
  } else if (typeof define === 'function' && define.amd) {
    // AMD, registers as an anonymous module.
    define(function () {
      return pluralize();
    });
  } else {
    // Browser global.
    root.pluralize = pluralize();
  }
})(this, function () {
  // Rule storage - pluralize and singularize need to be run sequentially,
  // while other rules can be optimized using an object for instant lookups.
  var pluralRules = [];
  var singularRules = [];
  var uncountables = {};
  var irregularPlurals = {};
  var irregularSingles = {};

  /**
   * Sanitize a pluralization rule to a usable regular expression.
   *
   * @param  {(RegExp|string)} rule
   * @return {RegExp}
   */
  function sanitizeRule (rule) {
    if (typeof rule === 'string') {
      return new RegExp('^' + rule + '$', 'i');
    }

    return rule;
  }

  /**
   * Pass in a word token to produce a function that can replicate the case on
   * another word.
   *
   * @param  {string}   word
   * @param  {string}   token
   * @return {Function}
   */
  function restoreCase (word, token) {
    // Tokens are an exact match.
    if (word === token) return token;

    // Upper cased words. E.g. "HELLO".
    if (word === word.toUpperCase()) return token.toUpperCase();

    // Title cased words. E.g. "Title".
    if (word[0] === word[0].toUpperCase()) {
      return token.charAt(0).toUpperCase() + token.substr(1).toLowerCase();
    }

    // Lower cased words. E.g. "test".
    return token.toLowerCase();
  }

  /**
   * Interpolate a regexp string.
   *
   * @param  {string} str
   * @param  {Array}  args
   * @return {string}
   */
  function interpolate (str, args) {
    return str.replace(/\$(\d{1,2})/g, function (match, index) {
      return args[index] || '';
    });
  }

  /**
   * Replace a word using a rule.
   *
   * @param  {string} word
   * @param  {Array}  rule
   * @return {string}
   */
  function replace (word, rule) {
    return word.replace(rule[0], function (match, index) {
      var result = interpolate(rule[1], arguments);

      if (match === '') {
        return restoreCase(word[index - 1], result);
      }

      return restoreCase(match, result);
    });
  }

  /**
   * Sanitize a word by passing in the word and sanitization rules.
   *
   * @param  {string}   token
   * @param  {string}   word
   * @param  {Array}    rules
   * @return {string}
   */
  function sanitizeWord (token, word, rules) {
    // Empty string or doesn't need fixing.
    if (!token.length || uncountables.hasOwnProperty(token)) {
      return word;
    }

    var len = rules.length;

    // Iterate over the sanitization rules and use the first one to match.
    while (len--) {
      var rule = rules[len];

      if (rule[0].test(word)) return replace(word, rule);
    }

    return word;
  }

  /**
   * Replace a word with the updated word.
   *
   * @param  {Object}   replaceMap
   * @param  {Object}   keepMap
   * @param  {Array}    rules
   * @return {Function}
   */
  function replaceWord (replaceMap, keepMap, rules) {
    return function (word) {
      // Get the correct token and case restoration functions.
      var token = word.toLowerCase();

      // Check against the keep object map.
      if (keepMap.hasOwnProperty(token)) {
        return restoreCase(word, token);
      }

      // Check against the replacement map for a direct word replacement.
      if (replaceMap.hasOwnProperty(token)) {
        return restoreCase(word, replaceMap[token]);
      }

      // Run all the rules against the word.
      return sanitizeWord(token, word, rules);
    };
  }

  /**
   * Check if a word is part of the map.
   */
  function checkWord (replaceMap, keepMap, rules, bool) {
    return function (word) {
      var token = word.toLowerCase();

      if (keepMap.hasOwnProperty(token)) return true;
      if (replaceMap.hasOwnProperty(token)) return false;

      return sanitizeWord(token, token, rules) === token;
    };
  }

  /**
   * Pluralize or singularize a word based on the passed in count.
   *
   * @param  {string}  word
   * @param  {number}  count
   * @param  {boolean} inclusive
   * @return {string}
   */
  function pluralize (word, count, inclusive) {
    var pluralized = count === 1
      ? pluralize.singular(word) : pluralize.plural(word);

    return (inclusive ? count + ' ' : '') + pluralized;
  }

  /**
   * Pluralize a word.
   *
   * @type {Function}
   */
  pluralize.plural = replaceWord(
    irregularSingles, irregularPlurals, pluralRules
  );

  /**
   * Check if a word is plural.
   *
   * @type {Function}
   */
  pluralize.isPlural = checkWord(
    irregularSingles, irregularPlurals, pluralRules
  );

  /**
   * Singularize a word.
   *
   * @type {Function}
   */
  pluralize.singular = replaceWord(
    irregularPlurals, irregularSingles, singularRules
  );

  /**
   * Check if a word is singular.
   *
   * @type {Function}
   */
  pluralize.isSingular = checkWord(
    irregularPlurals, irregularSingles, singularRules
  );

  /**
   * Add a pluralization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addPluralRule = function (rule, replacement) {
    pluralRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add a singularization rule to the collection.
   *
   * @param {(string|RegExp)} rule
   * @param {string}          replacement
   */
  pluralize.addSingularRule = function (rule, replacement) {
    singularRules.push([sanitizeRule(rule), replacement]);
  };

  /**
   * Add an uncountable word rule.
   *
   * @param {(string|RegExp)} word
   */
  pluralize.addUncountableRule = function (word) {
    if (typeof word === 'string') {
      uncountables[word.toLowerCase()] = true;
      return;
    }

    // Set singular and plural references for the word.
    pluralize.addPluralRule(word, '$0');
    pluralize.addSingularRule(word, '$0');
  };

  /**
   * Add an irregular word definition.
   *
   * @param {string} single
   * @param {string} plural
   */
  pluralize.addIrregularRule = function (single, plural) {
    plural = plural.toLowerCase();
    single = single.toLowerCase();

    irregularSingles[single] = plural;
    irregularPlurals[plural] = single;
  };

  /**
   * Irregular rules.
   */
  [
    // Pronouns.
    ['I', 'we'],
    ['me', 'us'],
    ['he', 'they'],
    ['she', 'they'],
    ['them', 'them'],
    ['myself', 'ourselves'],
    ['yourself', 'yourselves'],
    ['itself', 'themselves'],
    ['herself', 'themselves'],
    ['himself', 'themselves'],
    ['themself', 'themselves'],
    ['is', 'are'],
    ['was', 'were'],
    ['has', 'have'],
    ['this', 'these'],
    ['that', 'those'],
    // Words ending in with a consonant and `o`.
    ['echo', 'echoes'],
    ['dingo', 'dingoes'],
    ['volcano', 'volcanoes'],
    ['tornado', 'tornadoes'],
    ['torpedo', 'torpedoes'],
    // Ends with `us`.
    ['genus', 'genera'],
    ['viscus', 'viscera'],
    // Ends with `ma`.
    ['stigma', 'stigmata'],
    ['stoma', 'stomata'],
    ['dogma', 'dogmata'],
    ['lemma', 'lemmata'],
    ['schema', 'schemata'],
    ['anathema', 'anathemata'],
    // Other irregular rules.
    ['ox', 'oxen'],
    ['axe', 'axes'],
    ['die', 'dice'],
    ['yes', 'yeses'],
    ['foot', 'feet'],
    ['eave', 'eaves'],
    ['goose', 'geese'],
    ['tooth', 'teeth'],
    ['quiz', 'quizzes'],
    ['human', 'humans'],
    ['proof', 'proofs'],
    ['carve', 'carves'],
    ['valve', 'valves'],
    ['looey', 'looies'],
    ['thief', 'thieves'],
    ['groove', 'grooves'],
    ['pickaxe', 'pickaxes'],
    ['whiskey', 'whiskies']
  ].forEach(function (rule) {
    return pluralize.addIrregularRule(rule[0], rule[1]);
  });

  /**
   * Pluralization rules.
   */
  [
    [/s?$/i, 's'],
    [/[^\u0000-\u007F]$/i, '$0'],
    [/([^aeiou]ese)$/i, '$1'],
    [/(ax|test)is$/i, '$1es'],
    [/(alias|[^aou]us|tlas|gas|ris)$/i, '$1es'],
    [/(e[mn]u)s?$/i, '$1s'],
    [/([^l]ias|[aeiou]las|[emjzr]as|[iu]am)$/i, '$1'],
    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1i'],
    [/(alumn|alg|vertebr)(?:a|ae)$/i, '$1ae'],
    [/(seraph|cherub)(?:im)?$/i, '$1im'],
    [/(her|at|gr)o$/i, '$1oes'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|automat|quor)(?:a|um)$/i, '$1a'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)(?:a|on)$/i, '$1a'],
    [/sis$/i, 'ses'],
    [/(?:(kni|wi|li)fe|(ar|l|ea|eo|oa|hoo)f)$/i, '$1$2ves'],
    [/([^aeiouy]|qu)y$/i, '$1ies'],
    [/([^ch][ieo][ln])ey$/i, '$1ies'],
    [/(x|ch|ss|sh|zz)$/i, '$1es'],
    [/(matr|cod|mur|sil|vert|ind|append)(?:ix|ex)$/i, '$1ices'],
    [/(m|l)(?:ice|ouse)$/i, '$1ice'],
    [/(pe)(?:rson|ople)$/i, '$1ople'],
    [/(child)(?:ren)?$/i, '$1ren'],
    [/eaux$/i, '$0'],
    [/m[ae]n$/i, 'men'],
    ['thou', 'you']
  ].forEach(function (rule) {
    return pluralize.addPluralRule(rule[0], rule[1]);
  });

  /**
   * Singularization rules.
   */
  [
    [/s$/i, ''],
    [/(ss)$/i, '$1'],
    [/(wi|kni|(?:after|half|high|low|mid|non|night|[^\w]|^)li)ves$/i, '$1fe'],
    [/(ar|(?:wo|[ae])l|[eo][ao])ves$/i, '$1f'],
    [/ies$/i, 'y'],
    [/\b([pl]|zomb|(?:neck|cross)?t|coll|faer|food|gen|goon|group|lass|talk|goal|cut)ies$/i, '$1ie'],
    [/\b(mon|smil)ies$/i, '$1ey'],
    [/(m|l)ice$/i, '$1ouse'],
    [/(seraph|cherub)im$/i, '$1'],
    [/(x|ch|ss|sh|zz|tto|go|cho|alias|[^aou]us|tlas|gas|(?:her|at|gr)o|ris)(?:es)?$/i, '$1'],
    [/(analy|ba|diagno|parenthe|progno|synop|the|empha|cri)(?:sis|ses)$/i, '$1sis'],
    [/(movie|twelve|abuse|e[mn]u)s$/i, '$1'],
    [/(test)(?:is|es)$/i, '$1is'],
    [/(alumn|syllab|octop|vir|radi|nucle|fung|cact|stimul|termin|bacill|foc|uter|loc|strat)(?:us|i)$/i, '$1us'],
    [/(agend|addend|millenni|dat|extrem|bacteri|desiderat|strat|candelabr|errat|ov|symposi|curricul|quor)a$/i, '$1um'],
    [/(apheli|hyperbat|periheli|asyndet|noumen|phenomen|criteri|organ|prolegomen|hedr|automat)a$/i, '$1on'],
    [/(alumn|alg|vertebr)ae$/i, '$1a'],
    [/(cod|mur|sil|vert|ind)ices$/i, '$1ex'],
    [/(matr|append)ices$/i, '$1ix'],
    [/(pe)(rson|ople)$/i, '$1rson'],
    [/(child)ren$/i, '$1'],
    [/(eau)x?$/i, '$1'],
    [/men$/i, 'man']
  ].forEach(function (rule) {
    return pluralize.addSingularRule(rule[0], rule[1]);
  });

  /**
   * Uncountable rules.
   */
  [
    // Singular words with no plurals.
    'adulthood',
    'advice',
    'agenda',
    'aid',
    'alcohol',
    'ammo',
    'anime',
    'athletics',
    'audio',
    'bison',
    'blood',
    'bream',
    'buffalo',
    'butter',
    'carp',
    'cash',
    'chassis',
    'chess',
    'clothing',
    'cod',
    'commerce',
    'cooperation',
    'corps',
    'debris',
    'diabetes',
    'digestion',
    'elk',
    'energy',
    'equipment',
    'excretion',
    'expertise',
    'flounder',
    'fun',
    'gallows',
    'garbage',
    'graffiti',
    'headquarters',
    'health',
    'herpes',
    'highjinks',
    'homework',
    'housework',
    'information',
    'jeans',
    'justice',
    'kudos',
    'labour',
    'literature',
    'machinery',
    'mackerel',
    'mail',
    'media',
    'mews',
    'moose',
    'music',
    'manga',
    'news',
    'pike',
    'plankton',
    'pliers',
    'pollution',
    'premises',
    'rain',
    'research',
    'rice',
    'salmon',
    'scissors',
    'series',
    'sewage',
    'shambles',
    'shrimp',
    'species',
    'staff',
    'swine',
    'tennis',
    'traffic',
    'transporation',
    'trout',
    'tuna',
    'wealth',
    'welfare',
    'whiting',
    'wildebeest',
    'wildlife',
    'you',
    // Regexes.
    /[^aeiou]ese$/i, // "chinese", "japanese"
    /deer$/i, // "deer", "reindeer"
    /fish$/i, // "fish", "blowfish", "angelfish"
    /measles$/i,
    /o[iu]s$/i, // "carnivorous"
    /pox$/i, // "chickpox", "smallpox"
    /sheep$/i
  ].forEach(pluralize.addUncountableRule);

  return pluralize;
});

},{}],110:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],111:[function(require,module,exports){
'use strict';

var re = /^\/((?:\\\/|[^\/])+)\/([imgy]*)$/;
/*
	Matches parts of a regular expression string.

	/^\/
		-	match a string that begins with a /
	()
		-	capture
	(?:)+
		-	capture, but do not remember, a group of characters which occur 1 or more times
	\\\/
		-	match the literal \/
	|
		-	OR
	[^\/]
		-	anything which is not the literal \/
	\/
		-	match the literal /
	([imgy]*)
		-	capture any characters matching `imgy` occurring 0 or more times
	$/
		-	string end
*/


// EXPORTS //

module.exports = re;

},{}],112:[function(require,module,exports){
'use strict';

var path = require('path');

function replaceExt(npath, ext) {
  if (typeof npath !== 'string') {
    return npath;
  }

  if (npath.length === 0) {
    return npath;
  }

  var nFileName = path.basename(npath, path.extname(npath)) + ext;
  return path.join(path.dirname(npath), nFileName);
}

module.exports = replaceExt;

},{"path":108}],113:[function(require,module,exports){
'use strict'

var unherit = require('unherit')
var English = require('parse-english')

module.exports = parse
parse.Parser = English

function parse() {
  this.Parser = unherit(English)
}

},{"parse-english":84,"unherit":122}],114:[function(require,module,exports){
'use strict'

module.exports = smog

var sentenceSize = 30
var weight = 1.043
var base = 3.1291

// Get the grade level of a given value according to the SMOG formula.
// More information is available at WikiPedia:
// <https://en.wikipedia.org/wiki/SMOG>
function smog(counts) {
  if (!counts || !counts.sentence) {
    return NaN
  }

  return (
    base +
    weight *
      Math.sqrt(
        (counts.polysillabicWord || 0) * (sentenceSize / counts.sentence)
      )
  )
}

},{}],115:[function(require,module,exports){
'use strict'

module.exports = spache

var sentenceWeight = 0.121
var wordWeight = 0.082
var percentage = 100
var base = 0.659

// Get the grade level of a given value according to the Spache Readability
// Formula.
// More information is available at WikiPedia:
// <https://en.wikipedia.org/wiki/Spache_Readability_Formula>
function spache(counts) {
  if (!counts || !counts.sentence || !counts.word) {
    return NaN
  }

  return (
    base +
    (sentenceWeight * counts.word) / counts.sentence +
    ((wordWeight * (counts.unfamiliarWord || 0)) / counts.word) * percentage
  )
}

},{}],116:[function(require,module,exports){
module.exports=[
  "a",
  "able",
  "about",
  "above",
  "across",
  "act",
  "add",
  "afraid",
  "after",
  "afternoon",
  "again",
  "against",
  "ago",
  "air",
  "airplane",
  "alarm",
  "all",
  "almost",
  "alone",
  "along",
  "already",
  "also",
  "always",
  "am",
  "among",
  "an",
  "and",
  "angry",
  "animal",
  "another",
  "answer",
  "any",
  "anyone",
  "appear",
  "apple",
  "are",
  "arm",
  "around",
  "arrow",
  "as",
  "ask",
  "asleep",
  "at",
  "ate",
  "attention",
  "aunt",
  "awake",
  "away",
  "b",
  "baby",
  "back",
  "bad",
  "bag",
  "ball",
  "balloon",
  "bang",
  "bank",
  "bark",
  "barn",
  "basket",
  "be",
  "bean",
  "bear",
  "beat",
  "beautiful",
  "became",
  "because",
  "become",
  "bed",
  "bee",
  "been",
  "before",
  "began",
  "begin",
  "behind",
  "believe",
  "bell",
  "belong",
  "bend",
  "bent",
  "beside",
  "best",
  "better",
  "between",
  "big",
  "bird",
  "birthday",
  "bit",
  "bite",
  "black",
  "blanket",
  "blew",
  "block",
  "blow",
  "blue",
  "board",
  "boat",
  "book",
  "boot",
  "born",
  "borrow",
  "both",
  "bother",
  "bottle",
  "bottom",
  "bought",
  "bow",
  "box",
  "boy",
  "branch",
  "brave",
  "bread",
  "break",
  "breakfast",
  "breath",
  "brick",
  "bridge",
  "bright",
  "bring",
  "broke",
  "broken",
  "brother",
  "brought",
  "brown",
  "brush",
  "build",
  "bump",
  "burn",
  "bus",
  "busy",
  "but",
  "butter",
  "button",
  "buy",
  "by",
  "c",
  "cabin",
  "cage",
  "cake",
  "call",
  "came",
  "camp",
  "can",
  "can\\'t",
  "candle",
  "candy",
  "cap",
  "captain",
  "car",
  "card",
  "care",
  "careful",
  "carrot",
  "carry",
  "case",
  "castle",
  "cat",
  "catch",
  "cattle",
  "caught",
  "cause",
  "cent",
  "certain",
  "chair",
  "chance",
  "change",
  "chase",
  "chicken",
  "chief",
  "child",
  "children",
  "church",
  "circle",
  "circus",
  "city",
  "clap",
  "clean",
  "clever",
  "cliff",
  "climb",
  "clock",
  "close",
  "cloth",
  "clothes",
  "clown",
  "coat",
  "cold",
  "color",
  "come",
  "comfortable",
  "company",
  "contest",
  "continue",
  "cook",
  "cool",
  "corner",
  "could",
  "count",
  "country",
  "course",
  "cover",
  "cow",
  "crawl",
  "cream",
  "cry",
  "cup",
  "curtain",
  "cut",
  "d",
  "dad",
  "dance",
  "danger",
  "dangerous",
  "dark",
  "dash",
  "daughter",
  "day",
  "dear",
  "decide",
  "deep",
  "desk",
  "did",
  "didn\\'t",
  "die",
  "different",
  "dig",
  "dinner",
  "direction",
  "disappear",
  "disappoint",
  "discover",
  "distance",
  "do",
  "doctor",
  "does",
  "dog",
  "dollar",
  "don\\'t",
  "done",
  "door",
  "down",
  "dragon",
  "dream",
  "dress",
  "drink",
  "drive",
  "drop",
  "drove",
  "dry",
  "duck",
  "during",
  "dust",
  "e",
  "each",
  "eager",
  "ear",
  "early",
  "earn",
  "earth",
  "easy",
  "eat",
  "edge",
  "egg",
  "eight",
  "eighteen",
  "either",
  "elephant",
  "else",
  "empty",
  "end",
  "enemy",
  "enough",
  "enter",
  "even",
  "ever",
  "every",
  "everything",
  "exact",
  "except",
  "excite",
  "exclaim",
  "explain",
  "eye",
  "face",
  "fact",
  "fair",
  "fall",
  "family",
  "far",
  "farm",
  "farmer",
  "farther",
  "fast",
  "fat",
  "father",
  "feather",
  "feed",
  "feel",
  "feet",
  "fell",
  "fellow",
  "felt",
  "fence",
  "few",
  "field",
  "fierce",
  "fight",
  "figure",
  "fill",
  "final",
  "find",
  "fine",
  "finger",
  "finish",
  "fire",
  "first",
  "fish",
  "five",
  "flag",
  "flash",
  "flat",
  "flew",
  "floor",
  "flower",
  "fly",
  "follow",
  "food",
  "for",
  "forest",
  "forget",
  "forth",
  "found",
  "four",
  "fourth",
  "fox",
  "fresh",
  "friend",
  "frighten",
  "frog",
  "from",
  "front",
  "fruit",
  "full",
  "fun",
  "funny",
  "fur",
  "g",
  "game",
  "garden",
  "gasp",
  "gate",
  "gave",
  "get",
  "giant",
  "gift",
  "girl",
  "give",
  "glad",
  "glass",
  "go",
  "goat",
  "gone",
  "good",
  "got",
  "grandfather",
  "grandmother",
  "grass",
  "gray",
  "great",
  "green",
  "grew",
  "grin",
  "ground",
  "group",
  "grow",
  "growl",
  "guess",
  "gun",
  "h",
  "had",
  "hair",
  "half",
  "hall",
  "hand",
  "handle",
  "hang",
  "happen",
  "happiness",
  "happy",
  "hard",
  "harm",
  "has",
  "hat",
  "hate",
  "have",
  "he",
  "he\\'s",
  "head",
  "hear",
  "heard",
  "heavy",
  "held",
  "hello",
  "help",
  "hen",
  "her",
  "here",
  "herself",
  "hid",
  "hide",
  "high",
  "hill",
  "him",
  "himself",
  "his",
  "hit",
  "hold",
  "hole",
  "holiday",
  "home",
  "honey",
  "hop",
  "horn",
  "horse",
  "hot",
  "hour",
  "house",
  "how",
  "howl",
  "hum",
  "hundred",
  "hung",
  "hungry",
  "hunt",
  "hurry",
  "hurt",
  "husband",
  "i",
  "i\\'ll",
  "i\\'m",
  "ice",
  "idea",
  "if",
  "imagine",
  "important",
  "in",
  "inch",
  "indeed",
  "inside",
  "instead",
  "into",
  "invite",
  "is",
  "it",
  "it\\'s",
  "its",
  "j",
  "jacket",
  "jar",
  "jet",
  "job",
  "join",
  "joke",
  "joy",
  "jump",
  "just",
  "k",
  "keep",
  "kept",
  "key",
  "kick",
  "kill",
  "kind",
  "king",
  "kitchen",
  "kitten",
  "knee",
  "knew",
  "knock",
  "know",
  "l",
  "ladder",
  "lady",
  "laid",
  "lake",
  "land",
  "large",
  "last",
  "late",
  "laugh",
  "lay",
  "lazy",
  "lead",
  "leap",
  "learn",
  "least",
  "leave",
  "left",
  "leg",
  "less",
  "let",
  "let\\'s",
  "letter",
  "lick",
  "lift",
  "light",
  "like",
  "line",
  "lion",
  "list",
  "listen",
  "little",
  "live",
  "load",
  "long",
  "look",
  "lost",
  "lot",
  "loud",
  "love",
  "low",
  "luck",
  "lump",
  "lunch",
  "m",
  "machine",
  "made",
  "magic",
  "mail",
  "make",
  "man",
  "many",
  "march",
  "mark",
  "market",
  "master",
  "matter",
  "may",
  "maybe",
  "me",
  "mean",
  "meant",
  "meat",
  "meet",
  "melt",
  "men",
  "merry",
  "met",
  "middle",
  "might",
  "mile",
  "milk",
  "milkman",
  "mind",
  "mine",
  "minute",
  "miss",
  "mistake",
  "moment",
  "money",
  "monkey",
  "month",
  "more",
  "morning",
  "most",
  "mother",
  "mountain",
  "mouse",
  "mouth",
  "move",
  "much",
  "mud",
  "music",
  "must",
  "my",
  "n",
  "name",
  "near",
  "neck",
  "need",
  "needle",
  "neighbor",
  "neighborhood",
  "nest",
  "never",
  "new",
  "next",
  "nibble",
  "nice",
  "night",
  "nine",
  "no",
  "nod",
  "noise",
  "none",
  "north",
  "nose",
  "not",
  "note",
  "nothing",
  "notice",
  "now",
  "number",
  "o",
  "ocean",
  "of",
  "off",
  "offer",
  "often",
  "oh",
  "old",
  "on",
  "once",
  "one",
  "only",
  "open",
  "or",
  "orange",
  "order",
  "other",
  "our",
  "out",
  "outside",
  "over",
  "owl",
  "own",
  "p",
  "pack",
  "paid",
  "pail",
  "paint",
  "pair",
  "palace",
  "pan",
  "paper",
  "parade",
  "parent",
  "park",
  "part",
  "party",
  "pass",
  "past",
  "pasture",
  "path",
  "paw",
  "pay",
  "peanut",
  "peek",
  "pen",
  "penny",
  "people",
  "perfect",
  "perhaps",
  "person",
  "pet",
  "pick",
  "picket",
  "picnic",
  "picture",
  "pie",
  "piece",
  "pig",
  "pile",
  "pin",
  "place",
  "plan",
  "plant",
  "play",
  "pleasant",
  "please",
  "plenty",
  "plow",
  "point",
  "poke",
  "pole",
  "policeman",
  "pond",
  "poor",
  "pop",
  "postman",
  "pot",
  "potato",
  "pound",
  "pour",
  "practice",
  "prepare",
  "present",
  "pretend",
  "pretty",
  "princess",
  "prize",
  "probably",
  "problem",
  "promise",
  "protect",
  "proud",
  "puff",
  "pull",
  "puppy",
  "push",
  "put",
  "q",
  "queen",
  "queer",
  "quick",
  "quiet",
  "quite",
  "r",
  "rabbit",
  "raccoon",
  "race",
  "radio",
  "rag",
  "rain",
  "raise",
  "ran",
  "ranch",
  "rang",
  "reach",
  "read",
  "ready",
  "real",
  "red",
  "refuse",
  "remember",
  "reply",
  "rest",
  "return",
  "reward",
  "rich",
  "ride",
  "right",
  "ring",
  "river",
  "road",
  "roar",
  "rock",
  "rode",
  "roll",
  "roof",
  "room",
  "rope",
  "round",
  "row",
  "rub",
  "rule",
  "run",
  "rush",
  "s",
  "sad",
  "safe",
  "said",
  "sail",
  "sale",
  "salt",
  "same",
  "sand",
  "sang",
  "sat",
  "save",
  "saw",
  "say",
  "scare",
  "school",
  "scold",
  "scratch",
  "scream",
  "sea",
  "seat",
  "second",
  "secret",
  "see",
  "seed",
  "seem",
  "seen",
  "sell",
  "send",
  "sent",
  "seven",
  "several",
  "sew",
  "shadow",
  "shake",
  "shall",
  "shape",
  "she",
  "sheep",
  "shell",
  "shine",
  "ship",
  "shoe",
  "shone",
  "shook",
  "shoot",
  "shop",
  "shore",
  "short",
  "shot",
  "should",
  "show",
  "sick",
  "side",
  "sight",
  "sign",
  "signal",
  "silent",
  "silly",
  "silver",
  "since",
  "sing",
  "sister",
  "sit",
  "six",
  "size",
  "skip",
  "sky",
  "sled",
  "sleep",
  "slid",
  "slide",
  "slow",
  "small",
  "smart",
  "smell",
  "smile",
  "smoke",
  "snap",
  "sniff",
  "snow",
  "so",
  "soft",
  "sold",
  "some",
  "something",
  "sometimes",
  "son",
  "song",
  "soon",
  "sorry",
  "sound",
  "speak",
  "special",
  "spend",
  "spill",
  "splash",
  "spoke",
  "spot",
  "spread",
  "spring",
  "squirrel",
  "stand",
  "star",
  "start",
  "station",
  "stay",
  "step",
  "stick",
  "still",
  "stone",
  "stood",
  "stop",
  "store",
  "story",
  "straight",
  "strange",
  "street",
  "stretch",
  "strike",
  "strong",
  "such",
  "sudden",
  "sugar",
  "suit",
  "summer",
  "sun",
  "supper",
  "suppose",
  "sure",
  "surprise",
  "swallow",
  "sweet",
  "swim",
  "swing",
  "t",
  "table",
  "tail",
  "take",
  "talk",
  "tall",
  "tap",
  "taste",
  "teach",
  "teacher",
  "team",
  "tear",
  "teeth",
  "telephone",
  "tell",
  "ten",
  "tent",
  "than",
  "thank",
  "that",
  "that\\'s",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thick",
  "thin",
  "thing",
  "think",
  "third",
  "this",
  "those",
  "though",
  "thought",
  "three",
  "threw",
  "through",
  "throw",
  "tie",
  "tiger",
  "tight",
  "time",
  "tiny",
  "tip",
  "tire",
  "to",
  "today",
  "toe",
  "together",
  "told",
  "tomorrow",
  "too",
  "took",
  "tooth",
  "top",
  "touch",
  "toward",
  "tower",
  "town",
  "toy",
  "track",
  "traffic",
  "train",
  "trap",
  "tree",
  "trick",
  "trip",
  "trot",
  "truck",
  "true",
  "trunk",
  "try",
  "turkey",
  "turn",
  "turtle",
  "twelve",
  "twin",
  "two",
  "u",
  "ugly",
  "uncle",
  "under",
  "unhappy",
  "until",
  "up",
  "upon",
  "upstairs",
  "us",
  "use",
  "usual",
  "v",
  "valley",
  "vegetable",
  "very",
  "village",
  "visit",
  "voice",
  "w",
  "wag",
  "wagon",
  "wait",
  "wake",
  "walk",
  "want",
  "war",
  "warm",
  "was",
  "wash",
  "waste",
  "watch",
  "water",
  "wave",
  "way",
  "we",
  "wear",
  "weather",
  "week",
  "well",
  "went",
  "were",
  "wet",
  "what",
  "wheel",
  "when",
  "where",
  "which",
  "while",
  "whisper",
  "whistle",
  "white",
  "who",
  "whole",
  "whose",
  "why",
  "wide",
  "wife",
  "will",
  "win",
  "wind",
  "window",
  "wing",
  "wink",
  "winter",
  "wire",
  "wise",
  "wish",
  "with",
  "without",
  "woke",
  "wolf",
  "woman",
  "women",
  "won\\'t",
  "wonder",
  "wood",
  "word",
  "wore",
  "work",
  "world",
  "worm",
  "worry",
  "worth",
  "would",
  "wrong",
  "x",
  "y",
  "yard",
  "year",
  "yell",
  "yellow",
  "yes",
  "yet",
  "you",
  "young",
  "your",
  "z",
  "zoo"
]

},{}],117:[function(require,module,exports){
'use strict'

var pluralize = require('pluralize')
var normalize = require('normalize-strings')
var problematic = require('./problematic.json')

module.exports = syllables

var own = {}.hasOwnProperty

// Two expressions of occurrences which normally would be counted as two
// syllables, but should be counted as one.
var EXPRESSION_MONOSYLLABIC_ONE = new RegExp(
  [
    'cia(?:l|$)',
    'tia',
    'cius',
    'cious',
    '[^aeiou]giu',
    '[aeiouy][^aeiouy]ion',
    'iou',
    'sia$',
    'eous$',
    '[oa]gue$',
    '.[^aeiuoycgltdb]{2,}ed$',
    '.ely$',
    '^jua',
    'uai',
    'eau',
    '^busi$',
    '(?:[aeiouy](?:' +
      [
        '[bcfgklmnprsvwxyz]',
        'ch',
        'dg',
        'g[hn]',
        'lch',
        'l[lv]',
        'mm',
        'nch',
        'n[cgn]',
        'r[bcnsv]',
        'squ',
        's[chkls]',
        'th'
      ].join('|') +
      ')ed$)',
    '(?:[aeiouy](?:' +
      [
        '[bdfklmnprstvy]',
        'ch',
        'g[hn]',
        'lch',
        'l[lv]',
        'mm',
        'nch',
        'nn',
        'r[nsv]',
        'squ',
        's[cklst]',
        'th'
      ].join('|') +
      ')es$)'
  ].join('|'),
  'g'
)

var EXPRESSION_MONOSYLLABIC_TWO = new RegExp(
  '[aeiouy](?:' +
    [
      '[bcdfgklmnprstvyz]',
      'ch',
      'dg',
      'g[hn]',
      'l[lv]',
      'mm',
      'n[cgn]',
      'r[cnsv]',
      'squ',
      's[cklst]',
      'th'
    ].join('|') +
    ')e$',
  'g'
)

// Four expression of occurrences which normally would be counted as one
// syllable, but should be counted as two.
var EXPRESSION_DOUBLE_SYLLABIC_ONE = new RegExp(
  '(?:' +
    [
      '([^aeiouy])\\1l',
      '[^aeiouy]ie(?:r|s?t)',
      '[aeiouym]bl',
      'eo',
      'ism',
      'asm',
      'thm',
      'dnt',
      'snt',
      'uity',
      'dea',
      'gean',
      'oa',
      'ua',
      'react?',
      'orbed', // Cancel `'.[^aeiuoycgltdb]{2,}ed$',`
      'eings?',
      '[aeiouy]sh?e[rs]'
    ].join('|') +
    ')$',
  'g'
)

var EXPRESSION_DOUBLE_SYLLABIC_TWO = new RegExp(
  [
    'creat(?!u)',
    '[^gq]ua[^auieo]',
    '[aeiou]{3}',
    '^(?:ia|mc|coa[dglx].)',
    '^re(app|es|im|us)'
  ].join('|'),
  'g'
)

var EXPRESSION_DOUBLE_SYLLABIC_THREE = new RegExp(
  [
    '[^aeiou]y[ae]',
    '[^l]lien',
    'riet',
    'dien',
    'iu',
    'io',
    'ii',
    'uen',
    'real',
    'iell',
    'eo[^aeiou]',
    '[aeiou]y[aeiou]'
  ].join('|'),
  'g'
)

var EXPRESSION_DOUBLE_SYLLABIC_FOUR = /[^s]ia/

// Expression to match single syllable pre- and suffixes.
var EXPRESSION_SINGLE = new RegExp(
  [
    '^(?:' +
      [
        'un',
        'fore',
        'ware',
        'none?',
        'out',
        'post',
        'sub',
        'pre',
        'pro',
        'dis',
        'side',
        'some'
      ].join('|') +
      ')',
    '(?:' +
      [
        'ly',
        'less',
        'some',
        'ful',
        'ers?',
        'ness',
        'cians?',
        'ments?',
        'ettes?',
        'villes?',
        'ships?',
        'sides?',
        'ports?',
        'shires?',
        'tion(?:ed|s)?'
      ].join('|') +
      ')$'
  ].join('|'),
  'g'
)

// Expression to match double syllable pre- and suffixes.
var EXPRESSION_DOUBLE = new RegExp(
  [
    '^' +
      '(?:' +
      [
        'above',
        'anti',
        'ante',
        'counter',
        'hyper',
        'afore',
        'agri',
        'infra',
        'intra',
        'inter',
        'over',
        'semi',
        'ultra',
        'under',
        'extra',
        'dia',
        'micro',
        'mega',
        'kilo',
        'pico',
        'nano',
        'macro',
        'somer'
      ].join('|') +
      ')',
    '(?:' + ['fully', 'berry', 'woman', 'women', 'edly'].join('|') + ')$'
  ].join('|'),
  'g'
)

// Expression to match triple syllable suffixes.
var EXPRESSION_TRIPLE = /(creations?|ology|ologist|onomy|onomist)$/g

// Expression to split on word boundaries.
var SPLIT = /\b/g

// Expression to merge elision.
var APOSTROPHE = /['’]/g

// Expression to remove non-alphabetic characters from a given value.
var EXPRESSION_NONALPHABETIC = /[^a-z]/g

// Wrapper to support multiple word-parts (GH-11).
function syllables(value) {
  var values = normalize(String(value))
    .toLowerCase()
    .replace(APOSTROPHE, '')
    .split(SPLIT)
  var length = values.length
  var index = -1
  var total = 0

  while (++index < length) {
    total += syllable(values[index].replace(EXPRESSION_NONALPHABETIC, ''))
  }

  return total
}

// Get syllables in a given value.
function syllable(value) {
  var count = 0
  var index
  var length
  var singular
  var parts
  var addOne
  var subtractOne

  if (value.length === 0) {
    return count
  }

  // Return early when possible.
  if (value.length < 3) {
    return 1
  }

  // If `value` is a hard to count, it might be in `problematic`.
  if (own.call(problematic, value)) {
    return problematic[value]
  }

  // Additionally, the singular word might be in `problematic`.
  singular = pluralize(value, 1)

  if (own.call(problematic, singular)) {
    return problematic[singular]
  }

  addOne = returnFactory(1)
  subtractOne = returnFactory(-1)

  // Count some prefixes and suffixes, and remove their matched ranges.
  value = value
    .replace(EXPRESSION_TRIPLE, countFactory(3))
    .replace(EXPRESSION_DOUBLE, countFactory(2))
    .replace(EXPRESSION_SINGLE, countFactory(1))

  // Count multiple consonants.
  parts = value.split(/[^aeiouy]+/)
  index = -1
  length = parts.length

  while (++index < length) {
    if (parts[index] !== '') {
      count++
    }
  }

  // Subtract one for occurrences which should be counted as one (but are
  // counted as two).
  value
    .replace(EXPRESSION_MONOSYLLABIC_ONE, subtractOne)
    .replace(EXPRESSION_MONOSYLLABIC_TWO, subtractOne)

  // Add one for occurrences which should be counted as two (but are counted as
  // one).
  value
    .replace(EXPRESSION_DOUBLE_SYLLABIC_ONE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_TWO, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_THREE, addOne)
    .replace(EXPRESSION_DOUBLE_SYLLABIC_FOUR, addOne)

  // Make sure at least on is returned.
  return count || 1

  // Define scoped counters, to be used in `String#replace()` calls.
  // The scoped counter removes the matched value from the input.
  function countFactory(addition) {
    return counter
    function counter() {
      count += addition
      return ''
    }
  }

  // Define scoped counters, to be used in `String#replace()` calls.
  // The scoped counter does not remove the matched value from the input.
  function returnFactory(addition) {
    return returner
    function returner($0) {
      count += addition
      return $0
    }
  }
}

},{"./problematic.json":118,"normalize-strings":80,"pluralize":109}],118:[function(require,module,exports){
module.exports={
  "abalone": 4,
  "abare": 3,
  "abbruzzese": 4,
  "abed": 2,
  "aborigine": 5,
  "abruzzese": 4,
  "acreage": 3,
  "adame": 3,
  "adieu": 2,
  "adobe": 3,
  "anemone": 4,
  "apache": 3,
  "aphrodite": 4,
  "apostrophe": 4,
  "ariadne": 4,
  "cafe": 2,
  "calliope": 4,
  "catastrophe": 4,
  "chile": 2,
  "chloe": 2,
  "circe": 2,
  "coyote": 3,
  "daphne": 2,
  "epitome": 4,
  "eurydice": 4,
  "euterpe": 3,
  "every": 2,
  "everywhere": 3,
  "forever": 3,
  "gethsemane": 4,
  "guacamole": 4,
  "hermione": 4,
  "hyperbole": 4,
  "jesse": 2,
  "jukebox": 2,
  "karate": 3,
  "machete": 3,
  "maybe": 2,
  "newlywed": 3,
  "penelope": 4,
  "people": 2,
  "persephone": 4,
  "phoebe": 2,
  "pulse": 1,
  "queue": 1,
  "recipe": 3,
  "riverbed": 3,
  "sesame": 3,
  "shoreline": 2,
  "simile": 3,
  "snuffleupagus": 5,
  "sometimes": 2,
  "syncope": 3,
  "tamale": 3,
  "waterbed": 3,
  "wednesday": 2,
  "yosemite": 4,
  "zoe": 2
}

},{}],119:[function(require,module,exports){
'use strict'

var wrap = require('./wrap.js')

module.exports = trough

trough.wrap = wrap

var slice = [].slice

// Create new middleware.
function trough() {
  var fns = []
  var middleware = {}

  middleware.run = run
  middleware.use = use

  return middleware

  // Run `fns`.  Last argument must be a completion handler.
  function run() {
    var index = -1
    var input = slice.call(arguments, 0, -1)
    var done = arguments[arguments.length - 1]

    if (typeof done !== 'function') {
      throw new Error('Expected function as last argument, not ' + done)
    }

    next.apply(null, [null].concat(input))

    // Run the next `fn`, if any.
    function next(err) {
      var fn = fns[++index]
      var params = slice.call(arguments, 0)
      var values = params.slice(1)
      var length = input.length
      var pos = -1

      if (err) {
        done(err)
        return
      }

      // Copy non-nully input into values.
      while (++pos < length) {
        if (values[pos] === null || values[pos] === undefined) {
          values[pos] = input[pos]
        }
      }

      input = values

      // Next or done.
      if (fn) {
        wrap(fn, next).apply(null, input)
      } else {
        done.apply(null, [null].concat(input))
      }
    }
  }

  // Add `fn` to the list.
  function use(fn) {
    if (typeof fn !== 'function') {
      throw new Error('Expected `fn` to be a function, not ' + fn)
    }

    fns.push(fn)

    return middleware
  }
}

},{"./wrap.js":120}],120:[function(require,module,exports){
'use strict'

var slice = [].slice

module.exports = wrap

// Wrap `fn`.
// Can be sync or async; return a promise, receive a completion handler, return
// new values and errors.
function wrap(fn, callback) {
  var invoked

  return wrapped

  function wrapped() {
    var params = slice.call(arguments, 0)
    var callback = fn.length > params.length
    var result

    if (callback) {
      params.push(done)
    }

    try {
      result = fn.apply(null, params)
    } catch (error) {
      // Well, this is quite the pickle.
      // `fn` received a callback and invoked it (thus continuing the pipeline),
      // but later also threw an error.
      // We’re not about to restart the pipeline again, so the only thing left
      // to do is to throw the thing instead.
      if (callback && invoked) {
        throw error
      }

      return done(error)
    }

    if (!callback) {
      if (result && typeof result.then === 'function') {
        result.then(then, done)
      } else if (result instanceof Error) {
        done(result)
      } else {
        then(result)
      }
    }
  }

  // Invoke `next`, only once.
  function done() {
    if (!invoked) {
      invoked = true

      callback.apply(null, arguments)
    }
  }

  // Invoke `done` with one value.
  // Tracks if an error is passed, too.
  function then(value) {
    done(null, value)
  }
}

},{}],121:[function(require,module,exports){
/**
 * type-name - Just a reasonable typeof
 * 
 * https://github.com/twada/type-name
 *
 * Copyright (c) 2014-2015 Takuto Wada
 * Licensed under the MIT license.
 *   http://twada.mit-license.org/2014-2015
 */
'use strict';

var toStr = Object.prototype.toString;

function funcName (f) {
    return f.name ? f.name : /^\s*function\s*([^\(]*)/im.exec(f.toString())[1];
}

function ctorName (obj) {
    var strName = toStr.call(obj).slice(8, -1);
    if (strName === 'Object' && obj.constructor) {
        return funcName(obj.constructor);
    }
    return strName;
}

function typeName (val) {
    var type;
    if (val === null) {
        return 'null';
    }
    type = typeof(val);
    if (type === 'object') {
        return ctorName(val);
    }
    return type;
}

module.exports = typeName;

},{}],122:[function(require,module,exports){
'use strict'

var xtend = require('xtend')
var inherits = require('inherits')

module.exports = unherit

// Create a custom constructor which can be modified without affecting the
// original class.
function unherit(Super) {
  var result
  var key
  var value

  inherits(Of, Super)
  inherits(From, Of)

  // Clone values.
  result = Of.prototype

  for (key in result) {
    value = result[key]

    if (value && typeof value === 'object') {
      result[key] = 'concat' in value ? value.concat() : xtend(value)
    }
  }

  return Of

  // Constructor accepting a single argument, which itself is an `arguments`
  // object.
  function From(parameters) {
    return Super.apply(this, parameters)
  }

  // Constructor accepting variadic arguments.
  function Of() {
    if (!(this instanceof Of)) {
      return new From(arguments)
    }

    return Super.apply(this, arguments)
  }
}

},{"inherits":72,"xtend":188}],123:[function(require,module,exports){
(function (process){
'use strict'

var extend = require('extend')
var bail = require('bail')
var vfile = require('vfile')
var trough = require('trough')
var string = require('x-is-string')
var plain = require('is-plain-obj')

// Expose a frozen processor.
module.exports = unified().freeze()

var slice = [].slice
var own = {}.hasOwnProperty

// Process pipeline.
var pipeline = trough()
  .use(pipelineParse)
  .use(pipelineRun)
  .use(pipelineStringify)

function pipelineParse(p, ctx) {
  ctx.tree = p.parse(ctx.file)
}

function pipelineRun(p, ctx, next) {
  p.run(ctx.tree, ctx.file, done)

  function done(err, tree, file) {
    if (err) {
      next(err)
    } else {
      ctx.tree = tree
      ctx.file = file
      next()
    }
  }
}

function pipelineStringify(p, ctx) {
  ctx.file.contents = p.stringify(ctx.tree, ctx.file)
}

// Function to create the first processor.
function unified() {
  var attachers = []
  var transformers = trough()
  var namespace = {}
  var frozen = false
  var freezeIndex = -1

  // Data management.
  processor.data = data

  // Lock.
  processor.freeze = freeze

  // Plugins.
  processor.attachers = attachers
  processor.use = use

  // API.
  processor.parse = parse
  processor.stringify = stringify
  processor.run = run
  processor.runSync = runSync
  processor.process = process
  processor.processSync = processSync

  // Expose.
  return processor

  // Create a new processor based on the processor in the current scope.
  function processor() {
    var destination = unified()
    var length = attachers.length
    var index = -1

    while (++index < length) {
      destination.use.apply(null, attachers[index])
    }

    destination.data(extend(true, {}, namespace))

    return destination
  }

  // Freeze: used to signal a processor that has finished configuration.
  //
  // For example, take unified itself.  It’s frozen.  Plugins should not be
  // added to it.  Rather, it should be extended, by invoking it, before
  // modifying it.
  //
  // In essence, always invoke this when exporting a processor.
  function freeze() {
    var values
    var plugin
    var options
    var transformer

    if (frozen) {
      return processor
    }

    while (++freezeIndex < attachers.length) {
      values = attachers[freezeIndex]
      plugin = values[0]
      options = values[1]
      transformer = null

      if (options === false) {
        continue
      }

      if (options === true) {
        values[1] = undefined
      }

      transformer = plugin.apply(processor, values.slice(1))

      if (typeof transformer === 'function') {
        transformers.use(transformer)
      }
    }

    frozen = true
    freezeIndex = Infinity

    return processor
  }

  // Data management.  Getter / setter for processor-specific informtion.
  function data(key, value) {
    if (string(key)) {
      // Set `key`.
      if (arguments.length === 2) {
        assertUnfrozen('data', frozen)

        namespace[key] = value

        return processor
      }

      // Get `key`.
      return (own.call(namespace, key) && namespace[key]) || null
    }

    // Set space.
    if (key) {
      assertUnfrozen('data', frozen)
      namespace = key
      return processor
    }

    // Get space.
    return namespace
  }

  // Plugin management.
  //
  // Pass it:
  // *   an attacher and options,
  // *   a preset,
  // *   a list of presets, attachers, and arguments (list of attachers and
  //     options).
  function use(value) {
    var settings

    assertUnfrozen('use', frozen)

    if (value === null || value === undefined) {
      // Empty.
    } else if (typeof value === 'function') {
      addPlugin.apply(null, arguments)
    } else if (typeof value === 'object') {
      if ('length' in value) {
        addList(value)
      } else {
        addPreset(value)
      }
    } else {
      throw new Error('Expected usable value, not `' + value + '`')
    }

    if (settings) {
      namespace.settings = extend(namespace.settings || {}, settings)
    }

    return processor

    function addPreset(result) {
      addList(result.plugins)

      if (result.settings) {
        settings = extend(settings || {}, result.settings)
      }
    }

    function add(value) {
      if (typeof value === 'function') {
        addPlugin(value)
      } else if (typeof value === 'object') {
        if ('length' in value) {
          addPlugin.apply(null, value)
        } else {
          addPreset(value)
        }
      } else {
        throw new Error('Expected usable value, not `' + value + '`')
      }
    }

    function addList(plugins) {
      var length
      var index

      if (plugins === null || plugins === undefined) {
        // Empty.
      } else if (typeof plugins === 'object' && 'length' in plugins) {
        length = plugins.length
        index = -1

        while (++index < length) {
          add(plugins[index])
        }
      } else {
        throw new Error('Expected a list of plugins, not `' + plugins + '`')
      }
    }

    function addPlugin(plugin, value) {
      var entry = find(plugin)

      if (entry) {
        if (plain(entry[1]) && plain(value)) {
          value = extend(entry[1], value)
        }

        entry[1] = value
      } else {
        attachers.push(slice.call(arguments))
      }
    }
  }

  function find(plugin) {
    var length = attachers.length
    var index = -1
    var entry

    while (++index < length) {
      entry = attachers[index]

      if (entry[0] === plugin) {
        return entry
      }
    }
  }

  // Parse a file (in string or vfile representation) into a unist node using
  // the `Parser` on the processor.
  function parse(doc) {
    var file = vfile(doc)
    var Parser

    freeze()
    Parser = processor.Parser
    assertParser('parse', Parser)

    if (newable(Parser)) {
      return new Parser(String(file), file).parse()
    }

    return Parser(String(file), file) // eslint-disable-line new-cap
  }

  // Run transforms on a unist node representation of a file (in string or
  // vfile representation), async.
  function run(node, file, cb) {
    assertNode(node)
    freeze()

    if (!cb && typeof file === 'function') {
      cb = file
      file = null
    }

    if (!cb) {
      return new Promise(executor)
    }

    executor(null, cb)

    function executor(resolve, reject) {
      transformers.run(node, vfile(file), done)

      function done(err, tree, file) {
        tree = tree || node
        if (err) {
          reject(err)
        } else if (resolve) {
          resolve(tree)
        } else {
          cb(null, tree, file)
        }
      }
    }
  }

  // Run transforms on a unist node representation of a file (in string or
  // vfile representation), sync.
  function runSync(node, file) {
    var complete = false
    var result

    run(node, file, done)

    assertDone('runSync', 'run', complete)

    return result

    function done(err, tree) {
      complete = true
      bail(err)
      result = tree
    }
  }

  // Stringify a unist node representation of a file (in string or vfile
  // representation) into a string using the `Compiler` on the processor.
  function stringify(node, doc) {
    var file = vfile(doc)
    var Compiler

    freeze()
    Compiler = processor.Compiler
    assertCompiler('stringify', Compiler)
    assertNode(node)

    if (newable(Compiler)) {
      return new Compiler(node, file).compile()
    }

    return Compiler(node, file) // eslint-disable-line new-cap
  }

  // Parse a file (in string or vfile representation) into a unist node using
  // the `Parser` on the processor, then run transforms on that node, and
  // compile the resulting node using the `Compiler` on the processor, and
  // store that result on the vfile.
  function process(doc, cb) {
    freeze()
    assertParser('process', processor.Parser)
    assertCompiler('process', processor.Compiler)

    if (!cb) {
      return new Promise(executor)
    }

    executor(null, cb)

    function executor(resolve, reject) {
      var file = vfile(doc)

      pipeline.run(processor, {file: file}, done)

      function done(err) {
        if (err) {
          reject(err)
        } else if (resolve) {
          resolve(file)
        } else {
          cb(null, file)
        }
      }
    }
  }

  // Process the given document (in string or vfile representation), sync.
  function processSync(doc) {
    var complete = false
    var file

    freeze()
    assertParser('processSync', processor.Parser)
    assertCompiler('processSync', processor.Compiler)
    file = vfile(doc)

    process(file, done)

    assertDone('processSync', 'process', complete)

    return file

    function done(err) {
      complete = true
      bail(err)
    }
  }
}

// Check if `func` is a constructor.
function newable(value) {
  return typeof value === 'function' && keys(value.prototype)
}

// Check if `value` is an object with keys.
function keys(value) {
  var key
  for (key in value) {
    return true
  }
  return false
}

// Assert a parser is available.
function assertParser(name, Parser) {
  if (typeof Parser !== 'function') {
    throw new Error('Cannot `' + name + '` without `Parser`')
  }
}

// Assert a compiler is available.
function assertCompiler(name, Compiler) {
  if (typeof Compiler !== 'function') {
    throw new Error('Cannot `' + name + '` without `Compiler`')
  }
}

// Assert the processor is not frozen.
function assertUnfrozen(name, frozen) {
  if (frozen) {
    throw new Error(
      'Cannot invoke `' +
        name +
        '` on a frozen processor.\nCreate a new processor first, by invoking it: use `processor()` instead of `processor`.'
    )
  }
}

// Assert `node` is a unist node.
function assertNode(node) {
  if (!node || !string(node.type)) {
    throw new Error('Expected node, got `' + node + '`')
  }
}

// Assert that `complete` is `true`.
function assertDone(name, asyncName, complete) {
  if (!complete) {
    throw new Error(
      '`' + name + '` finished async. Use `' + asyncName + '` instead'
    )
  }
}

}).call(this,require('_process'))
},{"_process":110,"bail":3,"extend":64,"is-plain-obj":75,"trough":119,"vfile":159,"x-is-string":187}],124:[function(require,module,exports){
'use strict'

module.exports = convert

function convert(test) {
  if (typeof test === 'string') {
    return typeFactory(test)
  }

  if (test === null || test === undefined) {
    return ok
  }

  if (typeof test === 'object') {
    return ('length' in test ? anyFactory : matchesFactory)(test)
  }

  if (typeof test === 'function') {
    return test
  }

  throw new Error('Expected function, string, or object as test')
}

function convertAll(tests) {
  var results = []
  var length = tests.length
  var index = -1

  while (++index < length) {
    results[index] = convert(tests[index])
  }

  return results
}

// Utility assert each property in `test` is represented in `node`, and each
// values are strictly equal.
function matchesFactory(test) {
  return matches

  function matches(node) {
    var key

    for (key in test) {
      if (node[key] !== test[key]) {
        return false
      }
    }

    return true
  }
}

function anyFactory(tests) {
  var checks = convertAll(tests)
  var length = checks.length

  return matches

  function matches() {
    var index = -1

    while (++index < length) {
      if (checks[index].apply(this, arguments)) {
        return true
      }
    }

    return false
  }
}

// Utility to convert a string into a function which checks a given node’s type
// for said string.
function typeFactory(test) {
  return type

  function type(node) {
    return Boolean(node && node.type === test)
  }
}

// Utility to return true.
function ok() {
  return true
}

},{}],125:[function(require,module,exports){
'use strict'

var iterate = require('array-iterate')

module.exports = modifierFactory

// Turn `callback` into a child-modifier accepting a parent.  See
// `array-iterate` for more info.
function modifierFactory(callback) {
  return iteratorFactory(wrapperFactory(callback))
}

// Turn `callback` into a `iterator' accepting a parent.
function iteratorFactory(callback) {
  return iterator

  function iterator(parent) {
    var children = parent && parent.children

    if (!children) {
      throw new Error('Missing children in `parent` for `modifier`')
    }

    return iterate(children, callback, parent)
  }
}

// Pass the context as the third argument to `callback`.
function wrapperFactory(callback) {
  return wrapper

  function wrapper(value, index) {
    return callback(value, index, this)
  }
}

},{"array-iterate":1}],126:[function(require,module,exports){
'use strict'

var own = {}.hasOwnProperty

module.exports = stringify

function stringify(value) {
  /* Nothing. */
  if (!value || typeof value !== 'object') {
    return null
  }

  /* Node. */
  if (own.call(value, 'position') || own.call(value, 'type')) {
    return position(value.position)
  }

  /* Position. */
  if (own.call(value, 'start') || own.call(value, 'end')) {
    return position(value)
  }

  /* Point. */
  if (own.call(value, 'line') || own.call(value, 'column')) {
    return point(value)
  }

  /* ? */
  return null
}

function point(point) {
  if (!point || typeof point !== 'object') {
    point = {}
  }

  return index(point.line) + ':' + index(point.column)
}

function position(pos) {
  if (!pos || typeof pos !== 'object') {
    pos = {}
  }

  return point(pos.start) + '-' + point(pos.end)
}

function index(value) {
  return value && typeof value === 'number' ? value : 1
}

},{}],127:[function(require,module,exports){
'use strict'

module.exports = visitChildren

function visitChildren(callback) {
  return visitor

  // Visit `parent`, invoking `callback` for each child.
  function visitor(parent) {
    var index = -1
    var children = parent && parent.children

    if (!children) {
      throw new Error('Missing children in `parent` for `visitor`')
    }

    while (++index in children) {
      callback(children[index], index, parent)
    }
  }
}

},{}],128:[function(require,module,exports){
'use strict'

module.exports = visitParents

var convert = require('unist-util-is/convert')

var CONTINUE = true
var SKIP = 'skip'
var EXIT = false

visitParents.CONTINUE = CONTINUE
visitParents.SKIP = SKIP
visitParents.EXIT = EXIT

function visitParents(tree, test, visitor, reverse) {
  var is

  if (typeof test === 'function' && typeof visitor !== 'function') {
    reverse = visitor
    visitor = test
    test = null
  }

  is = convert(test)

  one(tree, null, [])

  // Visit a single node.
  function one(node, index, parents) {
    var result = []
    var subresult

    if (!test || is(node, index, parents[parents.length - 1] || null)) {
      result = toResult(visitor(node, parents))

      if (result[0] === EXIT) {
        return result
      }
    }

    if (node.children && result[0] !== SKIP) {
      subresult = toResult(all(node.children, parents.concat(node)))
      return subresult[0] === EXIT ? subresult : result
    }

    return result
  }

  // Visit children in `parent`.
  function all(children, parents) {
    var min = -1
    var step = reverse ? -1 : 1
    var index = (reverse ? children.length : min) + step
    var result

    while (index > min && index < children.length) {
      result = one(children[index], index, parents)

      if (result[0] === EXIT) {
        return result
      }

      index = typeof result[1] === 'number' ? result[1] : index + step
    }
  }
}

function toResult(value) {
  if (value !== null && typeof value === 'object' && 'length' in value) {
    return value
  }

  if (typeof value === 'number') {
    return [CONTINUE, value]
  }

  return [value]
}

},{"unist-util-is/convert":124}],129:[function(require,module,exports){
'use strict'

module.exports = visit

var visitParents = require('unist-util-visit-parents')

var CONTINUE = visitParents.CONTINUE
var SKIP = visitParents.SKIP
var EXIT = visitParents.EXIT

visit.CONTINUE = CONTINUE
visit.SKIP = SKIP
visit.EXIT = EXIT

function visit(tree, test, visitor, reverse) {
  if (typeof test === 'function' && typeof visitor !== 'function') {
    reverse = visitor
    visitor = test
    test = null
  }

  visitParents(tree, test, overload, reverse)

  function overload(node, parents) {
    var parent = parents[parents.length - 1]
    var index = parent ? parent.children.indexOf(node) : null
    return visitor(node, index, parent)
  }
}

},{"unist-util-visit-parents":128}],130:[function(require,module,exports){
module.exports = function range(min, max, value) {
  return (value - min) / (max - min)
}
},{}],131:[function(require,module,exports){
'use strict';

// MODULES //

var deepCopy = require( 'utils-copy' );
var getKeys = require( 'object-keys' ).shim();


// COPY ERROR //

/**
* FUNCTION: copy( error )
*	Copies an error.
*
* @param {Error|TypeError|SyntaxError|URIError|ReferenceError|RangeError|RangeError|EvalError} error - error to copy
* @returns {Error|TypeError|SyntaxError|URIError|ReferenceError|RangeError|RangeError|EvalError} error copy
*/
function copy( error ) {
	/* jshint newcap:false */
	var keys;
	var desc;
	var key;
	var err;
	var i;
	if ( !( error instanceof Error ) ) {
		throw new TypeError( 'invalid input argument. Must provide an error object. Value: `' + error + '`.' );
	}
	// Create a new error...
	err = new error.constructor( error.message );

	// If a `stack` property is present, copy it over...
	if ( error.stack ) {
		err.stack = error.stack;
	}
	// Node.js specific (system errors)...
	if ( error.code ) {
		err.code = error.code;
	}
	if ( error.errno ) {
		err.errno = error.errno;
	}
	if ( error.syscall ) {
		err.syscall = error.syscall;
	}
	// Any enumerable properties...
	keys = getKeys( error );
	for ( i = 0; i < keys.length; i++ ) {
		key = keys[ i ];
		desc = Object.getOwnPropertyDescriptor( error, key );
		if ( desc.hasOwnProperty( 'value' ) ) {
			desc.value = deepCopy( error[ key ] );
		}
		Object.defineProperty( err, key, desc );
	}
	return err;
} // end FUNCTION copy()


// EXPORTS //

module.exports = copy;

},{"object-keys":82,"utils-copy":134}],132:[function(require,module,exports){
'use strict';

// EXPORTS //

module.exports = require( './copy.js' );

},{"./copy.js":131}],133:[function(require,module,exports){
(function (Buffer){
'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );
var isBuffer = require( 'validate.io-buffer' );
var typeName = require( 'type-name' );
var regex = require( 'utils-regex-from-string' );
var copyError = require( 'utils-copy-error' );
var indexOf = require( 'utils-indexof' );
var objectKeys = require( 'object-keys' );
var typedArrays = require( './typedarrays.js' );


// FUNCTIONS //

/**
* FUNCTION: cloneInstance( val )
*	Clones a class instance.
*
*	WARNING: this should only be used for simple cases. Any instances with privileged access to variables (e.g., within closures) cannot be cloned. This approach should be considered fragile.
*
*	NOTE: the function is greedy, disregarding the notion of a 'level'. Instead, the function deep copies all properties, as we assume the concept of 'level' applies only to the class instance reference but not to its internal state. This prevents, in theory, two instances from sharing state.
*
* @private
* @param {Object} val - class instance
* @returns {Object} new instance
*/
function cloneInstance( val ) {
	var cache = [];
	var refs = [];
	var names;
	var name;
	var desc;
	var tmp;
	var ref;
	var i;

	ref = Object.create( Object.getPrototypeOf( val ) );
	cache.push( val );
	refs.push( ref );

	names = Object.getOwnPropertyNames( val );
	for ( i = 0; i < names.length; i++ ) {
		name = names[ i ];
		desc = Object.getOwnPropertyDescriptor( val, name );
		if ( desc.hasOwnProperty( 'value' ) ) {
			tmp = ( isArray( val[name] ) ) ? [] : {};
			desc.value = deepCopy( val[name], tmp, cache, refs, -1 );
		}
		Object.defineProperty( ref, name, desc );
	}
	if ( !Object.isExtensible( val ) ) {
		Object.preventExtensions( ref );
	}
	if ( Object.isSealed( val ) ) {
		Object.seal( ref );
	}
	if ( Object.isFrozen( val ) ) {
		Object.freeze( ref );
	}
	return ref;
} // end FUNCTION cloneInstance()


// DEEP COPY //

/**
* FUNCTION: deepCopy( val, copy, cache, refs, level )
*	Recursively performs a deep copy of an input object.
*
* @private
* @param {Array|Object} val - value to copy
* @param {Array|Object} copy - copy
* @param {Array} cache - an array of visited objects
* @param {Array} refs - an array of object references
* @param {Number} level - copy depth
* @returns {*} deep copy
*/
function deepCopy( val, copy, cache, refs, level ) {
	var parent;
	var keys;
	var name;
	var desc;
	var ctor;
	var key;
	var ref;
	var x;
	var i;
	var j;

	level = level - 1;

	// Primitives and functions...
	if (
		typeof val !== 'object' ||
		val === null
	) {
		return val;
	}
	if ( isBuffer( val ) ) {
		return new Buffer( val );
	}
	if ( val instanceof Error ) {
		return copyError( val );
	}
	// Objects...
	name = typeName( val );

	if ( name === 'Date' ) {
		return new Date( +val );
	}
	if ( name === 'RegExp' ) {
		return regex( val.toString() );
	}
	if ( name === 'Set' ) {
		return new Set( val );
	}
	if ( name === 'Map' ) {
		return new Map( val );
	}
	if (
		name === 'String' ||
		name === 'Boolean' ||
		name === 'Number'
	) {
		// Return an equivalent primitive!
		return val.valueOf();
	}
	ctor = typedArrays[ name ];
	if ( ctor ) {
		return ctor( val );
	}
	// Class instances...
	if (
		name !== 'Array' &&
		name !== 'Object'
	) {
		// Cloning requires ES5 or higher...
		if ( typeof Object.freeze === 'function' ) {
			return cloneInstance( val );
		}
		return {};
	}
	// Arrays and plain objects...
	keys = objectKeys( val );
	if ( level > 0 ) {
		parent = name;
		for ( j = 0; j < keys.length; j++ ) {
			key = keys[ j ];
			x = val[ key ];

			// Primitive, Buffer, special class instance...
			name = typeName( x );
			if (
				typeof x !== 'object' ||
				x === null ||
				(
					name !== 'Array' &&
					name !== 'Object'
				) ||
				isBuffer( x )
			) {
				if ( parent === 'Object' ) {
					desc = Object.getOwnPropertyDescriptor( val, key );
					if ( desc.hasOwnProperty( 'value' ) ) {
						desc.value = deepCopy( x );
					}
					Object.defineProperty( copy, key, desc );
				} else {
					copy[ key ] = deepCopy( x );
				}
				continue;
			}
			// Circular reference...
			i = indexOf( cache, x );
			if ( i !== -1 ) {
				copy[ key ] = refs[ i ];
				continue;
			}
			// Plain array or object...
			ref = ( isArray(x) ) ? [] : {};
			cache.push( x );
			refs.push( ref );
			if ( parent === 'Array' ) {
				copy[ key ] = deepCopy( x, ref, cache, refs, level );
			} else {
				desc = Object.getOwnPropertyDescriptor( val, key );
				if ( desc.hasOwnProperty( 'value' ) ) {
					desc.value = deepCopy( x, ref, cache, refs, level );
				}
				Object.defineProperty( copy, key, desc );
			}
		}
	} else {
		if ( name === 'Array' ) {
			for ( j = 0; j < keys.length; j++ ) {
				key = keys[ j ];
				copy[ key ] = val[ key ];
			}
		} else {
			for ( j = 0; j < keys.length; j++ ) {
				key = keys[ j ];
				desc = Object.getOwnPropertyDescriptor( val, key );
				Object.defineProperty( copy, key, desc );
			}
		}
	}
	if ( !Object.isExtensible( val ) ) {
		Object.preventExtensions( copy );
	}
	if ( Object.isSealed( val ) ) {
		Object.seal( copy );
	}
	if ( Object.isFrozen( val ) ) {
		Object.freeze( copy );
	}
	return copy;
} // end FUNCTION deepCopy()


// EXPORTS //

module.exports = deepCopy;

}).call(this,require("buffer").Buffer)
},{"./typedarrays.js":135,"buffer":7,"object-keys":82,"type-name":136,"utils-copy-error":132,"utils-indexof":137,"utils-regex-from-string":138,"validate.io-array":140,"validate.io-buffer":142}],134:[function(require,module,exports){
'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );
var isNonNegativeInteger = require( 'validate.io-nonnegative-integer' );
var PINF = require( 'const-pinf-float64' );
var deepCopy = require( './deepcopy.js' );


// COPY //

/**
* FUNCTION: createCopy( value[, level] )
*	Copy or deep clone a value to an arbitrary depth.
*
* @param {*} value - value to be copied
* @param {Number} [level=+infinity] - option to control copy depth. For example, set to `0` for a shallow copy. Default behavior returns a full deep copy.
* @returns {*} copy
*/
function createCopy( val, level ) {
	var copy;
	if ( arguments.length > 1 ) {
		if ( !isNonNegativeInteger( level ) ) {
			throw new TypeError( 'invalid input argument. Level must be a nonnegative integer. Value: `' + level + '`.' );
		}
		if ( level === 0 ) {
			return val;
		}
	} else {
		level = PINF;
	}
	copy = ( isArray(val) ) ? [] : {};
	return deepCopy( val, copy, [val], [copy], level );
} // end FUNCTION createCopy()


// EXPORTS //

module.exports = createCopy;

},{"./deepcopy.js":133,"const-pinf-float64":23,"validate.io-array":140,"validate.io-nonnegative-integer":151}],135:[function(require,module,exports){
'use strict';

// MODULES //

var objectKeys = require( 'object-keys' );


// TYPED ARRAY FUNCTIONS //

/**
* Create functions for copying typed arrays.
*/
var typedArrays = {
	'Int8Array': null,
	'Uint8Array': null,
	'Uint8ClampedArray': null,
	'Int16Array': null,
	'Uint16Array': null,
	'Int32Array': null,
	'Uint32Array': null,
	'Float32Array': null,
	'Float64Array': null
};

(function createTypedArrayFcns() {
	/* jshint evil:true */
	var keys = objectKeys( typedArrays );
	var len = keys.length;
	var key;
	var i;
	for ( i = 0; i < len; i++ ) {
		key = keys[ i ];
		typedArrays[ key ] = new Function( 'arr', 'return new '+key+'( arr );' );
	}
})();


// EXPORTS //

module.exports = typedArrays;

},{"object-keys":82}],136:[function(require,module,exports){
/**
 * type-name - Just a reasonable typeof
 *
 * https://github.com/twada/type-name
 *
 * Copyright (c) 2014-2016 Takuto Wada
 * Licensed under the MIT license.
 *   https://github.com/twada/type-name/blob/master/LICENSE
 */
'use strict';

var toStr = Object.prototype.toString;

function funcName (f) {
    if (f.name) {
        return f.name;
    }
    var match = /^\s*function\s*([^\(]*)/im.exec(f.toString());
    return match ? match[1] : '';
}

function ctorName (obj) {
    var strName = toStr.call(obj).slice(8, -1);
    if ((strName === 'Object' || strName === 'Error') && obj.constructor) {
        return funcName(obj.constructor);
    }
    return strName;
}

function typeName (val) {
    var type;
    if (val === null) {
        return 'null';
    }
    type = typeof val;
    if (type === 'object') {
        return ctorName(val);
    }
    return type;
}

module.exports = typeName;

},{}],137:[function(require,module,exports){
'use strict';

// MODULES //

var isArrayLike = require( 'validate.io-array-like' );
var isInteger = require( 'validate.io-integer-primitive' );


// INDEXOF //

/**
* FUNCTION: indexOf( arr, searchElement[, fromIndex] )
*	Returns the first index at which a given element can be found.
*
* @param {Array|String|Object} arr - array-like object
* @param {*} searchElement - element to find
* @param {Number} [fromIndex] - starting index (if negative, the start index is determined relative to last element)
* @returns {Number} index or -1
*/
function indexOf( arr, searchElement, fromIndex ) {
	var len;
	var i;
	if ( !isArrayLike( arr ) ) {
		throw new TypeError( 'invalid input argument. First argument must be an array-like object. Value: `' + arr + '`.' );
	}
	len = arr.length;
	if ( len === 0 ) {
		return -1;
	}
	if ( arguments.length === 3 ) {
		if ( !isInteger( fromIndex ) ) {
			throw new TypeError( 'invalid input argument. `fromIndex` must be an integer. Value: `' + fromIndex + '`.' );
		}
		if ( fromIndex >= 0 ) {
			if ( fromIndex >= len ) {
				return -1;
			}
			i = fromIndex;
		} else {
			i = len + fromIndex;
			if ( i < 0 ) {
				i = 0;
			}
		}
	} else {
		i = 0;
	}
	if ( searchElement !== searchElement ) { // check for NaN
		for ( ; i < len; i++ ) {
			if ( arr[ i ] !== arr[ i ] ) {
				return i;
			}
		}
	} else {
		for ( ; i < len; i++ ) {
			if ( arr[ i ] === searchElement ) {
				return i;
			}
		}
	}
	return -1;
} // end FUNCTION indexOf()


// EXPORTS //

module.exports = indexOf;

},{"validate.io-array-like":139,"validate.io-integer-primitive":145}],138:[function(require,module,exports){
'use strict';

// MODULES //

var isString = require( 'validate.io-string-primitive' ),
	RE = require( 'regex-regex' );


// REGEX //

/**
* FUNCTION: regex( str )
*	Parses a regular expression string and returns a new regular expression.
*
* @param {String} str - regular expression string
* @returns {RegExp|Null} regular expression or null
*/
function regex( str ) {
	if ( !isString( str ) ) {
		throw new TypeError( 'invalid input argument. Must provide a regular expression string. Value: `' + str + '`.' );
	}
	// Capture the regular expression pattern and any flags:
	str = RE.exec( str );

	// Create a new regular expression:
	return ( str ) ? new RegExp( str[1], str[2] ) : null;
} // end FUNCTION regex()


// EXPORTS //

module.exports = regex;

},{"regex-regex":111,"validate.io-string-primitive":156}],139:[function(require,module,exports){
'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer-primitive' );


// CONSTANTS //

var MAX = require( 'const-max-uint32' );


// IS ARRAY-LIKE //

/**
* FUNCTION: isArrayLike( value )
*	Validates if a value is array-like.
*
* @param {*} value - value to validate
* @param {Boolean} boolean indicating if a value is array-like
*/
function isArrayLike( value ) {
	return (
		value !== void 0 &&
		value !== null &&
		typeof value !== 'function' &&
		isInteger( value.length ) &&
		value.length >= 0 &&
		value.length <= MAX
	);
} // end FUNCTION isArrayLike()


// EXPORTS //

module.exports = isArrayLike;

},{"const-max-uint32":22,"validate.io-integer-primitive":145}],140:[function(require,module,exports){
'use strict';

/**
* FUNCTION: isArray( value )
*	Validates if a value is an array.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is an array
*/
function isArray( value ) {
	return Object.prototype.toString.call( value ) === '[object Array]';
} // end FUNCTION isArray()

// EXPORTS //

module.exports = Array.isArray || isArray;

},{}],141:[function(require,module,exports){
/**
*
*	VALIDATE: boolean
*
*
*	DESCRIPTION:
*		- Validates if a value is a boolean.
*
*
*	NOTES:
*		[1] 
*
*
*	TODO:
*		[1] 
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isBoolean( value )
*	Validates if a value is a boolean.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a boolean
*/
function isBoolean( value ) {
	return ( typeof value === 'boolean' || Object.prototype.toString.call( value ) === '[object Boolean]' );
} // end FUNCTION isBoolean()


// EXPORTS //

module.exports = isBoolean;
},{}],142:[function(require,module,exports){
'use strict';

/**
* FUNCTION: isBuffer( value )
*	Validates if a value is a Buffer object.
*
* @param {*} value - value to validate
* @returns {Boolean} boolean indicating if a value is a Buffer object
*/
function isBuffer( val ) {
	return typeof val === 'object' &&
		val !== null &&
		(
			val._isBuffer || // for envs missing Object.prototype.constructor (e.g., Safari 5-7)
			(
				val.constructor &&
				typeof val.constructor.isBuffer === 'function' &&
				val.constructor.isBuffer( val )
			)
		);
} // end FUNCTION isBuffer()


// EXPORTS //

module.exports = isBuffer;

},{}],143:[function(require,module,exports){
/**
*
*	VALIDATE: contains
*
*
*	DESCRIPTION:
*		- Validates if an array contains an input value.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isnan = require( 'validate.io-nan-primitive' );


// CONTAINS //

/**
* FUNCTION: contains( arr, value )
*	Validates if an array contains an input value.
*
* @param {Array} arr - search array
* @param {*} value - search value
* @returns {Boolean} boolean indicating if an array contains an input value
*/
function contains( arr, value ) {
	var len, i;
	if ( !isArray( arr ) ) {
		throw new TypeError( 'contains()::invalid input argument. First argument must be an array. Value: `' + arr + '`.' );
	}
	len = arr.length;
	if ( isnan( value ) ) {
		for ( i = 0; i < len; i++ ) {
			if ( isnan( arr[ i ] ) ) {
				return true;
			}
		}
		return false;
	}
	for ( i = 0; i < len; i++ ) {
		if ( arr[ i ] === value ) {
			return true;
		}
	}
	return false;
} // end FUNCTION contains()


// EXPORTS //

module.exports = contains;

},{"validate.io-array":140,"validate.io-nan-primitive":148}],144:[function(require,module,exports){
/**
*
*	VALIDATE: function
*
*
*	DESCRIPTION:
*		- Validates if a value is a function.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isFunction( value )
*	Validates if a value is a function.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a function
*/
function isFunction( value ) {
	return ( typeof value === 'function' );
} // end FUNCTION isFunction()


// EXPORTS //

module.exports = isFunction;

},{}],145:[function(require,module,exports){
'use strict';

// MODULES //

var isNumber = require( 'validate.io-number-primitive' );


// IS INTEGER //

/**
* FUNCTION: isInteger( value )
*	Validates if a value is a number primitive, excluding `NaN`, and an integer.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a integer primitive
*/
function isInteger( value ) {
	return isNumber( value ) && value%1 === 0;
} // end FUNCTION isInteger()


// EXPORTS //

module.exports = isInteger;

},{"validate.io-number-primitive":152}],146:[function(require,module,exports){
/**
*
*	VALIDATE: integer
*
*
*	DESCRIPTION:
*		- Validates if a value is an integer.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

// MODULES //

var isNumber = require( 'validate.io-number' );


// ISINTEGER //

/**
* FUNCTION: isInteger( value )
*	Validates if a value is an integer.
*
* @param {Number} value - value to be validated
* @returns {Boolean} boolean indicating whether value is an integer
*/
function isInteger( value ) {
	return isNumber( value ) && value%1 === 0;
} // end FUNCTION isInteger()


// EXPORTS //

module.exports = isInteger;

},{"validate.io-number":153}],147:[function(require,module,exports){
'use strict';

/**
* FUNCTION: matrixLike( value )
*	Validates if a value is matrix-like.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is matrix-like
*/
function matrixLike( v ) {
	return v !== null &&
		typeof v === 'object' &&
		typeof v.data === 'object' &&
		typeof v.shape === 'object' &&
		typeof v.offset === 'number' &&
		typeof v.strides === 'object' &&
		typeof v.dtype === 'string' &&
		typeof v.length === 'number';
} // end FUNCTION matrixLike()


// EXPORTS //

module.exports = matrixLike;

},{}],148:[function(require,module,exports){
/**
*
*	VALIDATE: nan-primitive
*
*
*	DESCRIPTION:
*		- Validates if a value is a NaN primitive.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

/**
* FUNCTION: nan( value )
*	Validates if a value is a NaN primitive.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether the value is a NaN primitive
*/
function nan( value ) {
	return typeof value === 'number' && value !== value;
} // end FUNCTION nan()


// EXPORTS //

module.exports = nan;

},{}],149:[function(require,module,exports){
/**
*
*	VALIDATE: nan
*
*
*	DESCRIPTION:
*		- Validates if a value is NaN.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: nan( value )
*	Validates if a value is not-a-number.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether the value is a NaN
*/
function nan( value ) {
	return ( typeof value === 'number' || Object.prototype.toString.call( value ) === '[object Number]' ) && value.valueOf() !== value.valueOf();
} // end FUNCTION nan()


// EXPORTS //

module.exports = nan;

},{}],150:[function(require,module,exports){
/**
*
*	VALIDATE: nonnegative-integer-array
*
*
*	DESCRIPTION:
*		- Validates if a value is a nonnegative integer array.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isArray = require( 'validate.io-array' ),
	isNonNegativeInteger = require( 'validate.io-nonnegative-integer' );


// IS NONNEGATIVE INTEGER ARRAY //

/**
* FUNCTION: isNonNegativeIntegerArray( value )
*	Validates if a value is a nonnegative integer array.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a nonnegative integer array
*/
function isNonNegativeIntegerArray( value ) {
	var len;
	if ( !isArray( value ) ) {
		return false;
	}
	len = value.length;
	if ( !len ) {
		return false;
	}
	for ( var i = 0; i < len; i++ ) {
		if ( !isNonNegativeInteger( value[i] ) ) {
			return false;
		}
	}
	return true;
} // end FUNCTION isNonNegativeIntegerArray()


// EXPORTS //

module.exports = isNonNegativeIntegerArray;

},{"validate.io-array":140,"validate.io-nonnegative-integer":151}],151:[function(require,module,exports){
/**
*
*	VALIDATE: nonnegative-integer
*
*
*	DESCRIPTION:
*		- Validates if a value is a nonnegative integer.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// IS NONNEGATIVE INTEGER //

/**
* FUNCTION: isNonNegativeInteger( value )
*	Validates if a value is a nonnegative integer.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a nonnegative integer
*/
function isNonNegativeInteger( value ) {
	return isInteger( value ) && value >= 0;
} // end FUNCTION isNonNegativeInteger()


// EXPORTS //

module.exports = isNonNegativeInteger;

},{"validate.io-integer":146}],152:[function(require,module,exports){
/**
*
*	VALIDATE: number-primitive
*
*
*	DESCRIPTION:
*		- Validates if a value is a number primitive.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

/**
* FUNCTION: isNumber( value )
*	Validates if a value is a number primitive, excluding `NaN`.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a number primitive
*/
function isNumber( value ) {
	return (typeof value === 'number') && (value === value);
} // end FUNCTION isNumber()


// EXPORTS //

module.exports = isNumber;

},{}],153:[function(require,module,exports){
/**
*
*	VALIDATE: number
*
*
*	DESCRIPTION:
*		- Validates if a value is a number.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2014. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2014.
*
*/

'use strict';

/**
* FUNCTION: isNumber( value )
*	Validates if a value is a number.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a number
*/
function isNumber( value ) {
	return ( typeof value === 'number' || Object.prototype.toString.call( value ) === '[object Number]' ) && value.valueOf() === value.valueOf();
} // end FUNCTION isNumber()


// EXPORTS //

module.exports = isNumber;

},{}],154:[function(require,module,exports){
'use strict';

// MODULES //

var isArray = require( 'validate.io-array' );


// ISOBJECT //

/**
* FUNCTION: isObject( value )
*	Validates if a value is a object; e.g., {}.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating whether value is a object
*/
function isObject( value ) {
	return ( typeof value === 'object' && value !== null && !isArray( value ) );
} // end FUNCTION isObject()


// EXPORTS //

module.exports = isObject;

},{"validate.io-array":140}],155:[function(require,module,exports){
/**
*
*	VALIDATE: positive-integer
*
*
*	DESCRIPTION:
*		- Validates if a value is a positive integer.
*
*
*	NOTES:
*		[1]
*
*
*	TODO:
*		[1]
*
*
*	LICENSE:
*		MIT
*
*	Copyright (c) 2015. Athan Reines.
*
*
*	AUTHOR:
*		Athan Reines. kgryte@gmail.com. 2015.
*
*/

'use strict';

// MODULES //

var isInteger = require( 'validate.io-integer' );


// IS POSITIVE INTEGER //

/**
* FUNCTION: isPositiveInteger( value )
*	Validates if a value is a positive integer.
*
* @param {*} value - value to be validated
* @returns {Boolean} boolean indicating if a value is a positive integer
*/
function isPositiveInteger( value ) {
	return isInteger( value ) && value > 0;
} // end FUNCTION isPositiveInteger()


// EXPORTS //

module.exports = isPositiveInteger;

},{"validate.io-integer":146}],156:[function(require,module,exports){
'use strict';

/**
* Tests if a value is a string primitive.
*
* @param {*} value - value to test
* @returns {Boolean} boolean indicating if a value is a string primitive
*/
function isString( value ) {
	return typeof value === 'string';
} // end FUNCTION isString()


// EXPORTS //

module.exports = isString;

},{}],157:[function(require,module,exports){
'use strict'

var stringify = require('unist-util-stringify-position')

module.exports = VMessage

// Inherit from `Error#`.
function VMessagePrototype() {}
VMessagePrototype.prototype = Error.prototype
VMessage.prototype = new VMessagePrototype()

// Message properties.
var proto = VMessage.prototype

proto.file = ''
proto.name = ''
proto.reason = ''
proto.message = ''
proto.stack = ''
proto.fatal = null
proto.column = null
proto.line = null

// Construct a new VMessage.
//
// Note: We cannot invoke `Error` on the created context, as that adds readonly
// `line` and `column` attributes on Safari 9, thus throwing and failing the
// data.
function VMessage(reason, position, origin) {
  var parts
  var range
  var location

  if (typeof position === 'string') {
    origin = position
    position = null
  }

  parts = parseOrigin(origin)
  range = stringify(position) || '1:1'

  location = {
    start: {line: null, column: null},
    end: {line: null, column: null}
  }

  // Node.
  if (position && position.position) {
    position = position.position
  }

  if (position) {
    // Position.
    if (position.start) {
      location = position
      position = position.start
    } else {
      // Point.
      location.start = position
    }
  }

  if (reason.stack) {
    this.stack = reason.stack
    reason = reason.message
  }

  this.message = reason
  this.name = range
  this.reason = reason
  this.line = position ? position.line : null
  this.column = position ? position.column : null
  this.location = location
  this.source = parts[0]
  this.ruleId = parts[1]
}

function parseOrigin(origin) {
  var result = [null, null]
  var index

  if (typeof origin === 'string') {
    index = origin.indexOf(':')

    if (index === -1) {
      result[1] = origin
    } else {
      result[0] = origin.slice(0, index)
      result[1] = origin.slice(index + 1)
    }
  }

  return result
}

},{"unist-util-stringify-position":126}],158:[function(require,module,exports){
(function (process){
'use strict'

var path = require('path')
var replace = require('replace-ext')
var buffer = require('is-buffer')

module.exports = VFile

var own = {}.hasOwnProperty
var proto = VFile.prototype

proto.toString = toString

// Order of setting (least specific to most), we need this because otherwise
// `{stem: 'a', path: '~/b.js'}` would throw, as a path is needed before a
// stem can be set.
var order = ['history', 'path', 'basename', 'stem', 'extname', 'dirname']

// Construct a new file.
function VFile(options) {
  var prop
  var index
  var length

  if (!options) {
    options = {}
  } else if (typeof options === 'string' || buffer(options)) {
    options = {contents: options}
  } else if ('message' in options && 'messages' in options) {
    return options
  }

  if (!(this instanceof VFile)) {
    return new VFile(options)
  }

  this.data = {}
  this.messages = []
  this.history = []
  this.cwd = process.cwd()

  // Set path related properties in the correct order.
  index = -1
  length = order.length

  while (++index < length) {
    prop = order[index]

    if (own.call(options, prop)) {
      this[prop] = options[prop]
    }
  }

  // Set non-path related properties.
  for (prop in options) {
    if (order.indexOf(prop) === -1) {
      this[prop] = options[prop]
    }
  }
}

// Access full path (`~/index.min.js`).
Object.defineProperty(proto, 'path', {
  get: function() {
    return this.history[this.history.length - 1]
  },
  set: function(path) {
    assertNonEmpty(path, 'path')

    if (path !== this.path) {
      this.history.push(path)
    }
  }
})

// Access parent path (`~`).
Object.defineProperty(proto, 'dirname', {
  get: function() {
    return typeof this.path === 'string' ? path.dirname(this.path) : undefined
  },
  set: function(dirname) {
    assertPath(this.path, 'dirname')
    this.path = path.join(dirname || '', this.basename)
  }
})

// Access basename (`index.min.js`).
Object.defineProperty(proto, 'basename', {
  get: function() {
    return typeof this.path === 'string' ? path.basename(this.path) : undefined
  },
  set: function(basename) {
    assertNonEmpty(basename, 'basename')
    assertPart(basename, 'basename')
    this.path = path.join(this.dirname || '', basename)
  }
})

// Access extname (`.js`).
Object.defineProperty(proto, 'extname', {
  get: function() {
    return typeof this.path === 'string' ? path.extname(this.path) : undefined
  },
  set: function(extname) {
    var ext = extname || ''

    assertPart(ext, 'extname')
    assertPath(this.path, 'extname')

    if (ext) {
      if (ext.charAt(0) !== '.') {
        throw new Error('`extname` must start with `.`')
      }

      if (ext.indexOf('.', 1) !== -1) {
        throw new Error('`extname` cannot contain multiple dots')
      }
    }

    this.path = replace(this.path, ext)
  }
})

// Access stem (`index.min`).
Object.defineProperty(proto, 'stem', {
  get: function() {
    return typeof this.path === 'string'
      ? path.basename(this.path, this.extname)
      : undefined
  },
  set: function(stem) {
    assertNonEmpty(stem, 'stem')
    assertPart(stem, 'stem')
    this.path = path.join(this.dirname || '', stem + (this.extname || ''))
  }
})

// Get the value of the file.
function toString(encoding) {
  var value = this.contents || ''
  return buffer(value) ? value.toString(encoding) : String(value)
}

// Assert that `part` is not a path (i.e., does not contain `path.sep`).
function assertPart(part, name) {
  if (part.indexOf(path.sep) !== -1) {
    throw new Error(
      '`' + name + '` cannot be a path: did not expect `' + path.sep + '`'
    )
  }
}

// Assert that `part` is not empty.
function assertNonEmpty(part, name) {
  if (!part) {
    throw new Error('`' + name + '` cannot be empty')
  }
}

// Assert `path` exists.
function assertPath(path, name) {
  if (!path) {
    throw new Error('Setting `' + name + '` requires `path` to be set too')
  }
}

}).call(this,require('_process'))
},{"_process":110,"is-buffer":73,"path":108,"replace-ext":112}],159:[function(require,module,exports){
'use strict'

var VMessage = require('vfile-message')
var VFile = require('./core.js')

module.exports = VFile

var proto = VFile.prototype

proto.message = message
proto.info = info
proto.fail = fail

// Slight backwards compatibility.  Remove in the future.
proto.warn = message

// Create a message with `reason` at `position`.  When an error is passed in as
// `reason`, copies the stack.
function message(reason, position, origin) {
  var filePath = this.path
  var message = new VMessage(reason, position, origin)

  if (filePath) {
    message.name = filePath + ':' + message.name
    message.file = filePath
  }

  message.fatal = false

  this.messages.push(message)

  return message
}

// Fail.  Creates a vmessage, associates it with the file, and throws it.
function fail() {
  var message = this.message.apply(this, arguments)

  message.fatal = true

  throw message
}

// Info.  Creates a vmessage, associates it with the file, and marks the
// fatality as null.
function info() {
  var message = this.message.apply(this, arguments)

  message.fatal = null

  return message
}

},{"./core.js":158,"vfile-message":157}],160:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":165}],161:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":185}],162:[function(require,module,exports){
var h = require("./virtual-hyperscript/index.js")

module.exports = h

},{"./virtual-hyperscript/index.js":172}],163:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":168}],164:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":176,"is-object":74}],165:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":174,"../vnode/is-vnode.js":177,"../vnode/is-vtext.js":178,"../vnode/is-widget.js":179,"./apply-properties":164,"global/document":66}],166:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],167:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = renderOptions.render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = renderOptions.render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = renderOptions.render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":179,"../vnode/vpatch.js":182,"./apply-properties":164,"./update-widget":169}],168:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var render = require("./create-element")
var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches, renderOptions) {
    renderOptions = renderOptions || {}
    renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch
        ? renderOptions.patch
        : patchRecursive
    renderOptions.render = renderOptions.render || render

    return renderOptions.patch(rootNode, patches, renderOptions)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions.document && ownerDocument !== document) {
        renderOptions.document = ownerDocument
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./create-element":165,"./dom-index":166,"./patch-op":167,"global/document":66,"x-is-array":186}],169:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":179}],170:[function(require,module,exports){
'use strict';

var EvStore = require('ev-store');

module.exports = EvHook;

function EvHook(value) {
    if (!(this instanceof EvHook)) {
        return new EvHook(value);
    }

    this.value = value;
}

EvHook.prototype.hook = function (node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = this.value;
};

EvHook.prototype.unhook = function(node, propertyName) {
    var es = EvStore(node);
    var propName = propertyName.substr(3);

    es[propName] = undefined;
};

},{"ev-store":63}],171:[function(require,module,exports){
'use strict';

module.exports = SoftSetHook;

function SoftSetHook(value) {
    if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value);
    }

    this.value = value;
}

SoftSetHook.prototype.hook = function (node, propertyName) {
    if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
    }
};

},{}],172:[function(require,module,exports){
'use strict';

var isArray = require('x-is-array');

var VNode = require('../vnode/vnode.js');
var VText = require('../vnode/vtext.js');
var isVNode = require('../vnode/is-vnode');
var isVText = require('../vnode/is-vtext');
var isWidget = require('../vnode/is-widget');
var isHook = require('../vnode/is-vhook');
var isVThunk = require('../vnode/is-thunk');

var parseTag = require('./parse-tag.js');
var softSetHook = require('./hooks/soft-set-hook.js');
var evHook = require('./hooks/ev-hook.js');

module.exports = h;

function h(tagName, properties, children) {
    var childNodes = [];
    var tag, props, key, namespace;

    if (!children && isChildren(properties)) {
        children = properties;
        props = {};
    }

    props = props || properties || {};
    tag = parseTag(tagName, props);

    // support keys
    if (props.hasOwnProperty('key')) {
        key = props.key;
        props.key = undefined;
    }

    // support namespace
    if (props.hasOwnProperty('namespace')) {
        namespace = props.namespace;
        props.namespace = undefined;
    }

    // fix cursor bug
    if (tag === 'INPUT' &&
        !namespace &&
        props.hasOwnProperty('value') &&
        props.value !== undefined &&
        !isHook(props.value)
    ) {
        props.value = softSetHook(props.value);
    }

    transformProperties(props);

    if (children !== undefined && children !== null) {
        addChild(children, childNodes, tag, props);
    }


    return new VNode(tag, props, childNodes, key, namespace);
}

function addChild(c, childNodes, tag, props) {
    if (typeof c === 'string') {
        childNodes.push(new VText(c));
    } else if (typeof c === 'number') {
        childNodes.push(new VText(String(c)));
    } else if (isChild(c)) {
        childNodes.push(c);
    } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
            addChild(c[i], childNodes, tag, props);
        }
    } else if (c === null || c === undefined) {
        return;
    } else {
        throw UnexpectedVirtualElement({
            foreignObject: c,
            parentVnode: {
                tagName: tag,
                properties: props
            }
        });
    }
}

function transformProperties(props) {
    for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
            var value = props[propName];

            if (isHook(value)) {
                continue;
            }

            if (propName.substr(0, 3) === 'ev-') {
                // add ev-foo support
                props[propName] = evHook(value);
            }
        }
    }
}

function isChild(x) {
    return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
}

function isChildren(x) {
    return typeof x === 'string' || isArray(x) || isChild(x);
}

function UnexpectedVirtualElement(data) {
    var err = new Error();

    err.type = 'virtual-hyperscript.unexpected.virtual-element';
    err.message = 'Unexpected virtual child passed to h().\n' +
        'Expected a VNode / Vthunk / VWidget / string but:\n' +
        'got:\n' +
        errorString(data.foreignObject) +
        '.\n' +
        'The parent vnode is:\n' +
        errorString(data.parentVnode)
        '\n' +
        'Suggested fix: change your `h(..., [ ... ])` callsite.';
    err.foreignObject = data.foreignObject;
    err.parentVnode = data.parentVnode;

    return err;
}

function errorString(obj) {
    try {
        return JSON.stringify(obj, null, '    ');
    } catch (e) {
        return String(obj);
    }
}

},{"../vnode/is-thunk":175,"../vnode/is-vhook":176,"../vnode/is-vnode":177,"../vnode/is-vtext":178,"../vnode/is-widget":179,"../vnode/vnode.js":181,"../vnode/vtext.js":183,"./hooks/ev-hook.js":170,"./hooks/soft-set-hook.js":171,"./parse-tag.js":173,"x-is-array":186}],173:[function(require,module,exports){
'use strict';

var split = require('browser-split');

var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
var notClassId = /^\.|#/;

module.exports = parseTag;

function parseTag(tag, props) {
    if (!tag) {
        return 'DIV';
    }

    var noId = !(props.hasOwnProperty('id'));

    var tagParts = split(tag, classIdSplit);
    var tagName = null;

    if (notClassId.test(tagParts[1])) {
        tagName = 'DIV';
    }

    var classes, part, type, i;

    for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];

        if (!part) {
            continue;
        }

        type = part.charAt(0);

        if (!tagName) {
            tagName = part;
        } else if (type === '.') {
            classes = classes || [];
            classes.push(part.substring(1, part.length));
        } else if (type === '#' && noId) {
            props.id = part.substring(1, part.length);
        }
    }

    if (classes) {
        if (props.className) {
            classes.push(props.className);
        }

        props.className = classes.join(' ');
    }

    return props.namespace ? tagName : tagName.toUpperCase();
}

},{"browser-split":6}],174:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":175,"./is-vnode":177,"./is-vtext":178,"./is-widget":179}],175:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],176:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],177:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":180}],178:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":180}],179:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],180:[function(require,module,exports){
module.exports = "2"

},{}],181:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":175,"./is-vhook":176,"./is-vnode":177,"./is-widget":179,"./version":180}],182:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":180}],183:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":180}],184:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":176,"is-object":74}],185:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free      // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":174,"../vnode/is-thunk":175,"../vnode/is-vnode":177,"../vnode/is-vtext":178,"../vnode/is-widget":179,"../vnode/vpatch":182,"./diff-props":184,"x-is-array":186}],186:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],187:[function(require,module,exports){
var toString = Object.prototype.toString

module.exports = isString

function isString(obj) {
    return toString.call(obj) === "[object String]"
}

},{}],188:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],189:[function(require,module,exports){
var doc = require('global/document')
var win = require('global/window')
var createElement = require('virtual-dom/create-element')
var diff = require('virtual-dom/diff')
var patch = require('virtual-dom/patch')
var h = require('virtual-dom/h')
var debounce = require('debounce')
var xtend = require('xtend')
var mean = require('compute-mean')
var median = require('compute-median')
var mode = require('compute-mode')
var unlerp = require('unlerp')
var lerp = require('lerp')
var unified = require('unified')
var english = require('retext-english')
var visit = require('unist-util-visit')
var toString = require('nlcst-to-string')
var normalize = require('nlcst-normalize')
var syllable = require('syllable')
var spache = require('spache')
var daleChall = require('dale-chall')
var daleChallFormula = require('dale-chall-formula')
var ari = require('automated-readability')
var colemanLiau = require('coleman-liau')
var flesch = require('flesch')
var smog = require('smog-formula')
var gunningFog = require('gunning-fog')
var spacheFormula = require('spache-formula')

var averages = {
  mean: mean,
  median: median,
  mode: modeMean
}

var types = {
  sentence: 'SentenceNode',
  paragraph: 'ParagraphNode'
}

var minAge = 5
var maxAge = 22
var defaultAge = 12
var scale = 6

var max = Math.max
var min = Math.min
var floor = Math.floor
var round = Math.round
var ceil = Math.ceil
var sqrt = Math.sqrt

var processor = unified().use(english)
var main = doc.querySelectorAll('main')[0]
var templates = [].slice.call(doc.querySelectorAll('template'))

var state = {
  type: 'SentenceNode',
  average: 'median',
  template: optionForTemplate(templates[0]),
  value: valueForTemplate(templates[0]),
  age: defaultAge
}

var tree = render(state)
var dom = main.appendChild(createElement(tree))

function onchangevalue(ev) {
  var prev = state.value
  var next = ev.target.value

  if (prev !== next) {
    state.value = next
    state.template = null
    onchange()
  }
}

function onchangeaverage(ev) {
  state.average = ev.target.value.toLowerCase()
  onchange()
}

function onchangetype(ev) {
  state.type = types[ev.target.value.toLowerCase()]
  onchange()
}

function onchangetemplate(ev) {
  var target = ev.target.selectedOptions[0]
  var node = doc.querySelector('[data-label="' + target.textContent + '"]')
  state.template = optionForTemplate(node)
  state.value = valueForTemplate(node)
  onchange()
}

function onchangeage(ev) {
  state.age = Number(ev.target.value)
  onchange()
}

function onchange() {
  var next = render(state)
  dom = patch(dom, diff(tree, next))
  tree = next
}

function render(state) {
  var tree = processor.runSync(processor.parse(state.value))
  var change = debounce(onchangevalue, 4)
  var changeage = debounce(onchangeage, 4)
  var key = 0
  var unselected = true
  var options = templates.map(function(template, index) {
    var selected = optionForTemplate(template) === state.template

    if (selected) {
      unselected = false
    }

    return h(
      'option',
      {key: index, selected: selected},
      optionForTemplate(template)
    )
  })

  setTimeout(resize, 4)

  return h('div', [
    h('section.highlight', [h('h1', {key: 'title'}, 'Readability')]),
    h('div', {key: 'editor', className: 'editor'}, [
      h('div', {key: 'draw', className: 'draw'}, pad(all(tree, []))),
      h('textarea', {
        key: 'area',
        value: state.value,
        oninput: change,
        onpaste: change,
        onkeyup: change,
        onmouseup: change
      })
    ]),
    h('section.highlight', [
      h('p', {key: 'byline'}, [
        'This project measures readability in text with several formulas: ',
        h(
          'a',
          {
            href: 'https://en.wikipedia.org/wiki/Dale–Chall_readability_formula'
          },
          'Dale–Chall'
        ),
        ', ',
        h(
          'a',
          {href: 'https://en.wikipedia.org/wiki/Automated_readability_index'},
          'Automated Readability'
        ),
        ', ',
        h(
          'a',
          {href: 'https://en.wikipedia.org/wiki/Coleman–Liau_index'},
          'Coleman–Liau'
        ),
        ', ',
        h(
          'a',
          {
            href:
              'https://en.wikipedia.org/wiki/Flesch–Kincaid_readability_tests#Flesch_reading_ease'
          },
          'Flesch'
        ),
        ', ',
        h(
          'a',
          {href: 'https://en.wikipedia.org/wiki/Gunning_fog_index'},
          'Gunning fog'
        ),
        ', ',
        h('a', {href: 'https://en.wikipedia.org/wiki/SMOG'}, 'SMOG'),
        ', and ',
        h(
          'a',
          {href: 'https://en.wikipedia.org/wiki/Spache_readability_formula'},
          'Spache'
        ),
        '.'
      ]),
      h('p', {key: 'ps'}, [
        'You can edit the text above, or pick a template: ',
        h(
          'select',
          {key: 'template', onchange: onchangetemplate},
          [
            unselected
              ? h('option', {key: '-1', selected: unselected}, '--')
              : null
          ].concat(options)
        ),
        '.'
      ]),
      h('p', {key: 2}, [
        'You can choose which target age you want to reach (now at ',
        h('input', {
          type: 'number',
          min: minAge,
          max: maxAge,
          oninput: changeage,
          onpaste: changeage,
          onkeyup: changeage,
          onmouseup: changeage,
          attributes: {
            value: defaultAge
          }
        }),
        '), and text will be highlighted in green if the text matches that (albeit if ',
        'they’re still in school). Red means it would take 6 years longer in school ',
        '(so an age of ',
        h(
          'span',
          {
            title: 'Using the previous input updates the value reflected here'
          },
          String(state.age + 6)
        ),
        '), and the years between them mix gradually between green and red.'
      ]),
      h('p', {key: 3}, [
        'You can pick which average to use (currently ',
        h('select', {key: 'average', onchange: onchangeaverage}, [
          h('option', {key: 0}, 'mean'),
          h('option', {key: 1, selected: true}, 'median'),
          h('option', {key: 2}, 'mode')
        ]),
        ').'
      ]),
      h('p', {key: 4}, [
        'It’s now highlighting per ',
        h('select', {key: 'type', onchange: onchangetype}, [
          h('option', {key: 0}, 'paragraph'),
          h('option', {key: 1, selected: true}, 'sentence')
        ]),
        ', but you can change that.'
      ])
    ]),
    h('section.credits', {key: 'credits'}, [
      h('p', [
        h(
          'a',
          {href: 'https://github.com/wooorm/readability'},
          'Fork this website'
        ),
        ' • ',
        h(
          'a',
          {href: 'https://github.com/wooorm/readability/blob/src/license'},
          'MIT'
        ),
        ' • ',
        h('a', {href: 'https://wooorm.com'}, '@wooorm')
      ])
    ])
  ])

  function all(node, parentIds) {
    var children = node.children
    var length = children.length
    var index = -1
    var results = []

    while (++index < length) {
      results = results.concat(one(children[index], parentIds.concat(index)))
    }

    return results
  }

  function one(node, parentIds) {
    var result = 'value' in node ? node.value : all(node, parentIds)
    var id = parentIds.join('-') + '-' + key
    var attrs = node.type === state.type ? highlight(node) : null

    if (attrs) {
      result = h('span', xtend({key: id, id: id}, attrs), result)
      key++
    }

    return result
  }

  // Trailing white-space in a `textarea` is shown, but not in a `div` with
  // `white-space: pre-wrap`.
  // Add a `br` to make the last newline explicit.
  function pad(nodes) {
    var tail = nodes[nodes.length - 1]

    if (typeof tail === 'string' && tail.charAt(tail.length - 1) === '\n') {
      nodes.push(h('br', {key: 'break'}))
    }

    return nodes
  }
}

// Highlight a section.
function highlight(node) {
  var familiarWords = {}
  var easyWord = {}
  var complexPolysillabicWord = 0
  var familiarWordCount = 0
  var polysillabicWord = 0
  var syllableCount = 0
  var easyWordCount = 0
  var wordCount = 0
  var letters = 0
  var sentenceCount = 0
  var counts
  var average
  var weight
  var hue

  visit(node, 'SentenceNode', sentence)
  visit(node, 'WordNode', word)

  counts = {
    complexPolysillabicWord: complexPolysillabicWord,
    polysillabicWord: polysillabicWord,
    unfamiliarWord: wordCount - familiarWordCount,
    difficultWord: wordCount - easyWordCount,
    syllable: syllableCount,
    sentence: sentenceCount,
    word: wordCount,
    character: letters,
    letter: letters
  }

  average = averages[state.average]([
    gradeToAge(daleChallFormula.gradeLevel(daleChallFormula(counts))[1]),
    gradeToAge(ari(counts)),
    gradeToAge(colemanLiau(counts)),
    fleschToAge(flesch(counts)),
    smogToAge(smog(counts)),
    gradeToAge(gunningFog(counts)),
    gradeToAge(spacheFormula(counts))
  ])

  weight = unlerp(state.age, state.age + scale, average)
  hue = lerp(120, 0, min(1, max(0, weight)))

  return {
    style: {
      backgroundColor: 'hsl(' + [hue, '93%', '85%'].join(', ') + ')'
    }
  }

  function sentence() {
    sentenceCount++
  }

  function word(node) {
    var value = toString(node)
    var syllables = syllable(value)
    var normalized = normalize(node, {allowApostrophes: true})
    var head

    wordCount++
    syllableCount += syllables
    letters += value.length

    // Count complex words for gunning-fog based on whether they have three or
    // more syllables and whether they aren’t proper nouns.
    // The last is checked a little simple, so this index might be over-eager.
    if (syllables >= 3) {
      polysillabicWord++
      head = value.charAt(0)

      if (head === head.toLowerCase()) {
        complexPolysillabicWord++
      }
    }

    // Find unique unfamiliar words for spache.
    if (
      spache.indexOf(normalized) !== -1 &&
      familiarWords[normalized] !== true
    ) {
      familiarWords[normalized] = true
      familiarWordCount++
    }

    // Find unique difficult words for dale-chall.
    if (daleChall.indexOf(normalized) !== -1 && easyWord[normalized] !== true) {
      easyWord[normalized] = true
      easyWordCount++
    }
  }
}

// Calculate the typical starting age (on the higher-end) when someone joins
// `grade` grade, in the US.
// See <https://en.wikipedia.org/wiki/Educational_stage#United_States>.
function gradeToAge(grade) {
  return round(grade + 5)
}

// Calculate the age relating to a Flesch result.
function fleschToAge(value) {
  return 20 - floor(value / 10)
}

// Calculate the age relating to a SMOG result.
// See <http://www.readabilityformulas.com/smog-readability-formula.php>.
function smogToAge(value) {
  return ceil(sqrt(value) + 2.5)
}

function rows(node) {
  if (!node) {
    return
  }

  return (
    ceil(
      node.getBoundingClientRect().height /
        parseInt(win.getComputedStyle(node).lineHeight, 10)
    ) + 1
  )
}

function optionForTemplate(template) {
  return template.dataset.label
}

function valueForTemplate(template) {
  return template.innerHTML + '\n\n— ' + optionForTemplate(template)
}

function resize() {
  dom.querySelector('textarea').rows = rows(dom.querySelector('.draw'))
}

function modeMean(value) {
  return mean(mode(value))
}

},{"automated-readability":2,"coleman-liau":8,"compute-mean":17,"compute-median":20,"compute-mode":21,"dale-chall":25,"dale-chall-formula":24,"debounce":26,"flesch":65,"global/document":66,"global/window":67,"gunning-fog":68,"lerp":76,"nlcst-normalize":77,"nlcst-to-string":78,"retext-english":113,"smog-formula":114,"spache":116,"spache-formula":115,"syllable":117,"unified":123,"unist-util-visit":129,"unlerp":130,"virtual-dom/create-element":160,"virtual-dom/diff":161,"virtual-dom/h":162,"virtual-dom/patch":163,"xtend":188}]},{},[189]);
