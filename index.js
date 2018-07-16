const fs = require('fs');
const os = require('os');
const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const Struct = require('ref-struct');
const ArrayType = require('ref-array');
const Iconv = require('iconv').Iconv;
const iconv = new Iconv('GBK', 'UTF-8');
const hardware = {};
const find = '\u0000';
const re = new RegExp(find, 'g');

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

const libcvr = ffi.Library(path.join(__dirname, './lib/cardapi3'), {
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
        name: iconv.convert(Buffer.from(personInfo.name)).toString().replace(re, '').trim(),
        sex: iconv.convert(Buffer.from(personInfo.sex)).toString().replace(re, '').trim(),
        nation: iconv.convert(Buffer.from(personInfo.nation)).toString().replace(re, '').trim(),
        birthday: iconv.convert(Buffer.from(personInfo.birthday)).toString().replace(re, '').trim(),
        address: iconv.convert(Buffer.from(personInfo.address)).toString().replace(re, '').trim(),
        cardId: iconv.convert(Buffer.from(personInfo.cardId)).toString().replace(re, '').trim(),
        police: iconv.convert(Buffer.from(personInfo.police)).toString().replace(re, '').trim(),
        validStart: iconv.convert(Buffer.from(personInfo.validStart)).toString().replace(re, '').trim(),
        validEnd: iconv.convert(Buffer.from(personInfo.validEnd)).toString().replace(re, '').trim(),
        sexCode: iconv.convert(Buffer.from(personInfo.sexCode)).toString().replace(re, '').trim(),
        nationCode: iconv.convert(Buffer.from(personInfo.nationCode)).toString().replace(re, '').trim(),
        appendMsg: iconv.convert(Buffer.from(personInfo.appendMsg)).toString().replace(re, '').trim(),
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
