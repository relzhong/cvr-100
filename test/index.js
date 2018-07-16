const assert = require('assert');

const cvr = require('../index');

describe('test com port connect', () => {
  it('should open USB successfully', () => {
    const { error } = cvr.OpenCardReader(1001);
    assert(error === 0);
  });
  it('should read idcard successfully', () => {
    const res = cvr.GetPersonMsg();
    console.log(res);
    assert(res.error === 0);
  });
  after(() => {
    cvr.CloseCardReader();
  });
});

