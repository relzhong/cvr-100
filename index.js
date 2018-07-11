const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const Struct = require('ref-struct');
const wchar_t = require('ref-wchar');
const Iconv = require('iconv').Iconv;
const iconv = new Iconv('GBK', 'UTF-8');
const wchar_string = wchar_t.string;
const hardware = {};


const PersonInfoW = Struct({
  name: wchar_string,
  sex: wchar_string,
  nation: wchar_string,
  birthday: wchar_string,
  address: wchar_string,
  cardId: wchar_string,
  police: wchar_string,
  validStart: wchar_string,
  validEnd: wchar_string,
  sexCode: wchar_string,
  nationCode: wchar_string,
  appendMsg: wchar_string,
});

const PersonInfoA = Struct({
  name: 'string',
  sex: 'string',
  nation: 'string',
  birthday: 'string',
  address: 'string',
  cardId: 'string',
  police: 'string',
  validStart: 'string',
  validEnd: 'string',
  sexCode: 'string',
  nationCode: 'string',
  appendMsg: 'string',
});

const libcvr = ffi.Library(path.join(__dirname, './lib/cardapi3'), {
  OpenCardReader: [ 'int', [ 'int', 'int', 'int' ]],
  GetPersonMsgW: [ 'int', [ ref.refType(PersonInfoW), ref.refType(wchar_t) ]],
  GetPersonMsgA: [ 'int', [ ref.refType(PersonInfoA), ref.refType('char') ]],
  ResetCardReader: [ 'int', [ ]],
  CloseCardReader: [ 'int', [ ]],
  GetCardReaderStatus: [ 'int', [ 'int', 'int' ]],
  GetErrorTextW: [ 'int', [ 'pointer', 'int' ]],
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
    const image = ref.alloc(ref.types.char);
    const res = libcvr.GetPersonMsgA(personInfo.ref(), image);
    if (res === 0) {
      return { error: 0, data: {
        name: iconv.convert(personInfo.name),
        sex: iconv.convert(personInfo.sex),
        nation: iconv.convert(personInfo.nation),
        birthday: iconv.convert(personInfo.birthday),
        address: iconv.convert(personInfo.address),
        cardId: iconv.convert(personInfo.cardId),
        police: iconv.convert(personInfo.police),
        validStart: iconv.convert(personInfo.validStart),
        validEnd: iconv.convert(personInfo.validEnd),
        sexCode: iconv.convert(personInfo.sexCode),
        nationCode: iconv.convert(personInfo.nationCode),
        appendMsg: iconv.convert(personInfo.appendMsg),
        image: iconv.convert(image.deref()),
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
    const res = libcvr.GetErrorTextA(data, len);
    const outData = ref.reinterpret(data, len.deref());
    if (res === 0) {
      return { error: 0, data: { errorText: iconv.convert(outData) } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};


module.exports = hardware;
