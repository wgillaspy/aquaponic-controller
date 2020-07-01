const i2c = require('i2c-bus');

const i2c1 = i2c.openSync(1);

const ATLAS_DEVICE_ADDR = 100 
console.log("ATLAS_DEVICE_ADDR: " + ATLAS_DEVICE_ADDR);

const BUFFER_LENGTH = 32;

i2c1.sendByteSync(ATLAS_DEVICE_ADDR,0x52); //SEND ATLAS INFO REQUEST

setTimeout(function () {

   let PH_OUTPUT_INFO = new Buffer(BUFFER_LENGTH);
   i2c1.i2cReadSync(ATLAS_DEVICE_ADDR, BUFFER_LENGTH, PH_OUTPUT_INFO);
   console.log(PH_OUTPUT_INFO.toString("ascii"));
   i2c1.closeSync();

}, 1000);
