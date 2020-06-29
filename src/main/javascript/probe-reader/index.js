const i2c = require('i2c-bus');

const phAddress = 0x99;
const conductivityAddress = 0x100;

const ICT_SLAVE = 0x703;

const i2c1 = i2c.openSync(1);
const rawData = i2c1.readWordSync(MCP9808_ADDR, TEMP_REG);
console.log(rawData);
i2c1.closeSync();
