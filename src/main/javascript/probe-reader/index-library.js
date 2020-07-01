const i2c = require('i2c-bus');
const fs = require("fs-extra");

const BUFFER_LENGTH = 32;
const INFO_CMD = 0x49;
const READ_CMD = 0x52;

const functions = {

    "wait": async (amount) => {
        await new Promise(function (resolve, reject) {
            setTimeout(resolve, amount);
        });
    },

    "readConfiguredProbes": async () => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        const objectToReturn = {};

        const i2c1 = i2c.openSync(1);
        for (const probe of configuration.probes) {

            await previous_promise;

            console.log("Probe: " + probe.address);

            i2c1.sendByteSync(probe.address, 0x52);

            await functions.wait(1000);

            const outputBuffer = new Buffer(BUFFER_LENGTH);
            i2c1.i2cReadSync(probe.address, BUFFER_LENGTH, outputBuffer);
            objectToReturn[probe.name] = outputBuffer.toString("ascii");
        }
        i2c1.closeSync();
        return objectToReturn;
    }
};

module.exports = functions;