const fs = require('fs');
const os = require('os');
const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const Struct = require('ref-struct');
const ArrayType = require('ref-array');
const iconv = require('iconv-lite');
const hardware = {};
const find = '\u0000';
const re = new RegExp(find, 'g');
const stack = require('callsite');

function hazardous(location) {
  const electronRegex = /[\\/]electron\.asar[\\/]/;
  const asarRegex = /^(?:^\\\\\?\\)?(.*\.asar)[\\/](.*)/;
  /* convert path when use electron asar unpack
   */
  if (!path.isAbsolute(location)) {
    return location;
  }

  if (electronRegex.test(location)) {
    return location;
  }

  const matches = asarRegex.exec(location);
  if (!matches || matches.length !== 3) {
    return location;
  }

  /* Skip monkey patching when an electron method is in the callstack. */
  const skip = stack().some(site => {
    const siteFile = site.getFileName();
    return /^ELECTRON_ASAR/.test(siteFile) || electronRegex.test(siteFile);
  });

  return skip ? location : location.replace(/\.asar([\\/])/, '.asar.unpacked$1');
}


const PersonInfoA = Struct({
  name: ArrayType('char', 32),
  sex: ArrayType('char', 4),
  nation: ArrayType('char', 20),
  birthday: ArrayType('char', 12),
  address: ArrayType('char', 72),
  cardId: ArrayType('char', 20),
  police: ArrayType('char', 32),
  validStart: ArrayType('char', 12),
  validEnd: ArrayType('char', 12),
  sexCode: ArrayType('char', 4),
  nationCode: ArrayType('char', 4),
  appendMsg: ArrayType('char', 72),
});

const libcvr = ffi.Library(hazardous(path.join(__dirname, './lib/cardapi3')), {
  OpenCardReader: [ 'int', [ 'int', 'int', 'int' ]],
  GetPersonMsgA: [ 'int', [ ref.refType(PersonInfoA), 'string' ]],
  ResetCardReader: [ 'int', [ ]],
  CloseCardReader: [ 'int', [ ]],
  GetCardReaderStatus: [ 'int', [ 'int', 'int' ]],
  GetErrorTextA: [ 'int', [ 'pointer', 'int' ]],
});

hardware.OpenCardReader = port => {
  try {
    const handle = libcvr.OpenCardReader(port, 2, 115200);
    if (handle) {
      return { error: -1 };
    }
    return { error: 0, data: { handle } };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CloseCardReader = () => {
  try {
    const res = libcvr.CloseCardReader();
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.ResetCardReader = () => {
  try {
    const res = libcvr.ResetCardReader();
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.GetCardReaderStatus = port => {
  try {
    const res = libcvr.GetCardReaderStatus(port, 115200);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.GetPersonMsg = () => {
  try {
    const personInfo = new PersonInfoA();
    const folder = fs.mkdtempSync(`${os.tmpdir()}${path.sep}`);
    const image = path.join(folder, 'image.bmp');
    const res = libcvr.GetPersonMsgA(personInfo.ref(), image);
    if (res === 0) {
      return { error: 0, data: {
        name: iconv.decode(Buffer.from(personInfo.name), 'gbk').replace(re, '').trim(),
        sex: iconv.decode(Buffer.from(personInfo.sex), 'gbk').replace(re, '').trim(),
        nation: iconv.decode(Buffer.from(personInfo.nation), 'gbk').replace(re, '').trim(),
        birthday: iconv.decode(Buffer.from(personInfo.birthday), 'gbk').replace(re, '').trim(),
        address: iconv.decode(Buffer.from(personInfo.address), 'gbk').replace(re, '').trim(),
        cardId: iconv.decode(Buffer.from(personInfo.cardId), 'gbk').replace(re, '').trim(),
        police: iconv.decode(Buffer.from(personInfo.police), 'gbk').replace(re, '').trim(),
        validStart: iconv.decode(Buffer.from(personInfo.validStart), 'gbk').replace(re, '').trim(),
        validEnd: iconv.decode(Buffer.from(personInfo.validEnd), 'gbk').replace(re, '').trim(),
        sexCode: iconv.decode(Buffer.from(personInfo.sexCode), 'gbk').replace(re, '').trim(),
        nationCode: iconv.decode(Buffer.from(personInfo.nationCode), 'gbk').replace(re, '').trim(),
        appendMsg: iconv.decode(Buffer.from(personInfo.appendMsg), 'gbk').replace(re, '').trim(),
        image,
      } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.GetErrorText = () => {
  try {
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    libcvr.GetErrorTextA(data, len);
    const outData = ref.reinterpret(data, len.deref());
    return { error: 0, data: { errorText: iconv.convert(outData).toString() } };
  } catch (e) {
    return { error: -1 };
  }
};


module.exports = hardware;
