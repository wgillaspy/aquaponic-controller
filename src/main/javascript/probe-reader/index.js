const i2c = require('i2c-bus');
const fs = require("fs-extra");

const BUFFER_LENGTH = 32;
const INFO_CMD = 0x49;
const READ_CMD = 0x52;

const configuration = fs.readJsonSync('./configuration.json', 'utf8');

setTimeout(readProbesInConfiguration(), configuration.loop_time_in_milis);

function readProbesInConfiguration() {

    const i2c1 = i2c.openSync(1);

    for (const probe of configuration.probes) {

        console.log("Probe: " + probe.address);

        i2c1.sendByteSync(probe.address, 0x52);

        setTimeout(function () {

            let outputBuffer = new Buffer(BUFFER_LENGTH);
            i2c1.i2cReadSync(probe.address, BUFFER_LENGTH, outputBuffer);
            console.log(outputBuffer.toString("ascii"));

        }, 1000);

    }

    i2c1.closeSync();

}
