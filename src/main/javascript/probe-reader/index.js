const i2c = require('i2c-bus');

const phAddress = 0x99;
const conductivityAddress = 0x100;

const ICT_SLAVE = 0x703;

const i2c1 = i2c.openSync(1);


const wbuf = Buffer.from([0x52]);
i2c1.writeWordSync(phAddress, wbuf);


const rawData = i2c1.readWordSync(phAddress, ICT_SLAVE);
console.log(rawData);
i2c1.closeSync();
