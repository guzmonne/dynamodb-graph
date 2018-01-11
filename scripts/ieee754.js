exports.buf2hex = function(buffer) {
  return `0x${Array.prototype.map
    .call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2))
    .join('')}`;
};

exports.read = function(buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & ((1 << -nBits) - 1);
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << -nBits) - 1);
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function(buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (
    ;
    mLen >= 8;
    buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8
  ) {}

  e = (e << mLen) | m;
  eLen += mLen;
  for (
    ;
    eLen > 0;
    buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8
  ) {}

  buffer[offset + i - d] |= s * 128;
};

console.reset = function() {
  return process.stdout.write('\033c');
};

function hex2buf(hex) {
  return new Buffer(hex.replace(/^0x/, ''), 'hex');
}

var now = Date.now();
var buffer = Buffer.alloc(8);
exports.write(buffer, now, 0, false, 52, 8);
var timestamp = exports.buf2hex(buffer);

console.reset();

console.log(now, timestamp, exports.read(hex2buf(timestamp), 0, false, 52, 8));

for (var i = 0; i < 10; i++) {
  let n1 = Math.floor(Math.random() * 1e13);
  let n2 = Math.floor(Math.random() * 1e13);
  let b1 = Buffer.alloc(8);
  let b2 = Buffer.alloc(8);
  exports.write(b1, n1, 0, false, 52, 8);
  exports.write(b2, n2, 0, false, 52, 8);
  let s1 = exports.buf2hex(b1);
  let s2 = exports.buf2hex(b2);
  if (n1 > n2 && s1 <= s2) console.log(n1, n2, '>');
  else if (n1 < n2 && s1 >= s2) console.log(n1, n2, '<');
  else if (n1 === n2 && s1 !== s2) console.log(n1, n2, s1, s2, '=');
  else {
    //process.stdout.write(`  ${i}\r`);
    console.log(
      [
        now,
        Math.abs(now - n1),
        n1,
        s1,
        exports.read(hex2buf(s1), 0, false, 52, 8)
      ].join('\t')
    );
    if (s1 === timestamp)
      console.log(
        [`s1: `, n1 - now, s1, exports.read(hex2buf(s1), 0, false, 52, 8)].join(
          '\t'
        )
      );
    if (s2 === timestamp)
      console.log(
        [`s2: `, n2, s2, exports.read(hex2buf(s2), 0, false, 52, 8)].join('\t')
      );
  }
}
