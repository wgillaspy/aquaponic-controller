let i2c = {};
if (!process.env.TESTING) {
    i2c = require('i2c-bus');
}
const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment");

const CronJob = require('cron').CronJob;

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

            i2c1.sendByteSync(probe.address, READ_CMD);

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
    "setupCronTabSchedule": () => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(configuration.dosing_scheduled).forEach(function (key, index) {
            console.log("Setting up crontab: " + key);

            const dosingConfig = configuration.dosing_scheduled[key];

            const job = new CronJob(dosingConfig.cron_pattern, function() {
                functions.scheduledRunDosingPumps(key);
            }, null, true);
            job.start();
        });
    },
    "scheduledRunDosingPumps": (label) => {
        const configuration = fs.readJsonSync('./configuration.json', 'utf8');
        const dosingConfig = configuration.dosing_scheduled[label];
        console.log(dosingConfig);

        if (dosingConfig.control_type === "home-assist") {
            console.log("Not implemented.");
        } else if (dosingConfig.control_type === "ezo-pmp") {
            functions.ezoRunDose(dosingConfig, dosingConfig.amount);
        }

    },
    "checkValuesAndRunDosingPumps": (reading) => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(reading).forEach(function (key, index) {

            if (configuration.dosing[key]) {

                const readingValue = reading[key];

                const dosingConfig = configuration.dosing[key];

                if (dosingConfig.on_when) {
                    console.log(`${dosingConfig.on_when.comparator}, ${readingValue}, ${dosingConfig.on_when.value}`);
                    console.log(functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value));
                    if (functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value)) {

                        if (dosingConfig.control_type === "home-assist") {
                            functions.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "on");
                        } else if (dosingConfig.control_type === "ezo-pmp") {
                            functions.controlDosingPumpsWithEzo(dosingConfig,  readingValue,"on");
                        }
                    }
                }
                if (dosingConfig.off_when) {
                    console.log(`${dosingConfig.off_when.comparator}, ${readingValue}, ${dosingConfig.off_when.value}`);
                    console.log(functions.doComparison(dosingConfig.off_when.comparator, readingValue, dosingConfig.off_when.value));
                    if (functions.doComparison(dosingConfig.off_when.comparator, readingValue, dosingConfig.off_when.value)) {
                        if (dosingConfig.control_type === "home-assist") {
                            functions.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "off");
                        } else if (dosingConfig.control_type === "ezo-pmp") {
                            functions.controlDosingPumpsWithEzo(dosingConfig, readingValue,"off");
                        }
                    }
                }
            }
        });
    },
    "controlDosingPumpsWithEzo": (configuration, reading, desiredState) => {

        if (process.env.timeToDoseAgain) {
            const canDoseAgain = moment(process.env.timeToDoseAgain, "YYYY-MM-DD HH:mm:ss");
            const now = moment();
            //
            if (now.isBefore(canDoseAgain)) {
                 console.log(now.format("YYYY-MM-DD HH:mm:ss") + " Waiting to dose. " + process.env.timeToDoseAgain);
                 return;
            }
        }

        if (desiredState === "on") {
            const desiredPoints = configuration[desiredState + "_when"].value;
            const difference = desiredPoints - reading;
            let doseAmount = difference * configuration.amount_per_point;
            doseAmount = doseAmount.toFixed(1);

            // Make sure the amount request is possible by the pump.
            if (doseAmount > configuration.minimum_amount) {
                if (doseAmount > configuration.max_amount) {
                    doseAmount = configuration.max_amount;
                    console.log("Dose amount is greater than minimum.");
                }

                console.log("Dosing: " + doseAmount);

                const waitValue = configuration.wait_before_next_dose.replace(/\D/g,'');
                const waitUnit  = configuration.wait_before_next_dose.replace(/[0-9]/g, '');
                process.env.timeToDoseAgain = moment().add(waitValue, waitUnit).format("YYYY-MM-DD HH:mm:ss");

                functions.ezoRunDose(configuration, doseAmount);

            } else {
                console.log("Dose amount is less than minimum.");
            }
        } // Desired state == on.
    },
    "ezoRunDose" : (configuration, doseAmount) => {
        let command = "";

        if (configuration.dose_over_time_when_greater_than) {
            if (doseAmount > configuration.dose_over_time_when_greater_than) {
                command = `D,${doseAmount},${configuration.dose_over_time}`;
            } else {
                command = `D,${doseAmount}`;
            }
        } else {
            if (configuration.dose_over_time) {
                command = `D,${doseAmount},${configuration.dose_over_time}`;
            } else {
                command = `D,${doseAmount}`;
            }
        }

        const splunkJson = {};
        splunkJson[configuration.splunk_label] = doseAmount;
        functions.writeSplunkData(splunkJson);

        const DOSE_SEND = Buffer.from(command);
        console.log(command);
        console.log("Buffer Length: " + DOSE_SEND.length);

        if (!process.env.TESTING) {
            const i2c1 = i2c.openSync(1);
            i2c1.i2cWriteSync(configuration.address, DOSE_SEND.length, DOSE_SEND);
            i2c1.closeSync();
        }
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

        console.log(`http://${process.env.HOME_ASSISTANT_API}/api/states/` + deviceName);

        axios.get(`http://${process.env.HOME_ASSISTANT_API}/api/states/` + deviceName, axiosConfig).then(statusResult => {

            console.log("Device State: " + statusResult.data.state);

            const currentState = statusResult.data.state;

            if (currentState !== desiredState) {

                let endpoint = "";
                let data = 0;

                if (desiredState === "off") {

                    endpoint = "/api/services/light/turn_off"

                } else if (desiredState === "on") {

                    endpoint = "/api/services/light/turn_on";
                    data = 1;
                }

                const url = `http://${process.env.HOME_ASSISTANT_API}${endpoint}`;
                if (!process.env.TESTING) {
                    if (endpoint) {
                        axios.post(url, jsonToWrite, axiosConfig).then(stateResult => {
                            console.log(JSON.stringify(stateResult.data, null, 2));
                            functions.writeSplunkData({
                                "deviceName": deviceName,
                                "state": desiredState
                            });
                        }).catch(offExecption => {
                            console.log(offExecption);
                        });
                    }
                } else {
                    console.log("Testing, Did not call home assist state change.");
                }
            }
        }).catch(getError => {
            console.log(getError.response);
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

            if (!process.env.TESTING) {
                axios.post(process.env.SPLUNK_URL, eventObject, axiosConfig).then(response => {
                    //console.log(`Splunk result: ${response.data.text}`);
                }).catch(error => {
                    console.log(error);
                });
            }

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