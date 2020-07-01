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

    "readConfiguredProbesSync" : async () => {
        return await functions.readConfiguredProbes();
    },
    "readConfiguredProbes": async () => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');
        const objectToReturn = {};

        const i2c1 = i2c.openSync(1);
        for (const probe of configuration.probes) {

            i2c1.sendByteSync(probe.address, 0x52);

            await functions.wait(1000);

            const outputBuffer = new Buffer(BUFFER_LENGTH);
            i2c1.i2cReadSync(probe.address, BUFFER_LENGTH, outputBuffer);

            // Console.log will print the strings pretty, but you'll need to fix the string since it wont' be pretty.
            const resultString = outputBuffer.toString("ascii").replace(/[^\x20-\x7E]/g, '');

            objectToReturn[probe.name] = resultString;
        }
        i2c1.closeSync();
        return objectToReturn;
    }
};

module.exports = functions;