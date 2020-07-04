const i2c = require('i2c-bus');
const fs = require("fs-extra");
const axios = require("axios");

const BUFFER_LENGTH = 32;
const INFO_CMD = 0x49;
const READ_CMD = 0x52;

const functions = {

    "wait": async (amount) => {
        await new Promise(function (resolve, reject) {
            setTimeout(resolve, amount);
        });
    },

    "readConfiguredProbesSync": async () => {
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
    },
    "checkValuesAndRunDosingPumps" : (reading) => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(reading).forEach(function (key, index) {

            if (configuration.dosing[key]) {
                console.log(reading[key]);

                const readingValue = reading[key];

                const dosingConfig = configuration.dosing[key];

                if (dosingConfig.on_when) {
                    if (functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value)) {
                        functions.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "on");
                    }
                }
                if (dosingConfig.of_when) {
                    if (functions.doComparison(dosingConfig.off_when.comparator, readingValue, dosingConfig.off_when.value)) {
                        functions.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "off");
                    }
                }
            }
        });
    },
    "controlDosingPumpsWithHomeAssist": (deviceName, desiredState) => {

        const axiosConfig = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.HUE_API_TOKEN
            }
        };
        const jsonToWrite = {
            "entity_id": deviceName
        };

        axios.get(`http://${process.env.HOME_ASSISTANT_API}/api/states/` + deviceName, axiosConfig).then(statusResult => {

            const currentState = statusResult.data.state;

            if (currentState !== desiredState) {

                let endpoint = "";

                if (desiredState === "off") {

                    endpoint = "/api/services/light/turn_off"

                } else if (desiredState === "on") {

                    endpoint = "/api/services/light/turn_on"
                }

                if (endpoint) {
                    axios.post("http://" +  process.env.HOME_ASSISTANT_API + endpoint, jsonToWrite, axiosConfig).then(offResult => {
                        console.log(JSON.stringify(offResult.data, null, 2));
                    }).catch(offExecption => {
                        console.log(offExecption);
                    });
                }
            }
        });
    },
    "writeSplunkData": (json) => {
        try {
            const eventObject = {"event": json};

            const axiosConfig = {
                headers: {
                    "Authorization": "Splunk " + process.env.SPLUNK_TOKEN
                }
            };

            axios.post(process.env.SPLUNK_URL, eventObject, axiosConfig).then(response => {
                console.log(`Splunk result: ${response.data.text}`);
            }).catch(error => {
                console.log(error);
            });

        } catch (splunkWriteDataError) {
            console.log("splunkWriteDataError:");
            console.log(splunkWriteDataError)
        }
    },
    "doComparison": (comparator, left, right) => {

        if (comparator === ">") {
            return left > right;
        } else if (comparator === "<") {
            return left < right;
        } else if (comparator === "==") {
            return left == right;
        }
        return false;
    }

};

module.exports = functions;