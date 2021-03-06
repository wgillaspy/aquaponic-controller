let i2c = {};
if (!process.env.TESTING) {
    i2c = require('i2c-bus');
}
const fs = require("fs-extra");
const axios = require("axios");
const moment = require("moment");
const twilio = require('twilio');

const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const CronJob = require('cron').CronJob;

const EventEmitter = require('eventemitter3');

const BUFFER_LENGTH = 32;
const INFO_CMD = 0x49;
const READ_CMD = 0x52;


let arduinoPort = {};
let serialParser = {};
if (!process.env.TESTING) {
    arduinoPort = new SerialPort('/dev/ino', {
        baudRate: 9600
    });
    serialParser = arduinoPort.pipe(new Readline({delimiter: '\r\n'}));
} else {
    arduinoPort = {
        "write" : (string, callback) => {
            console.log("Want to write: " + string);
        }
    }
}


const functions = {

    "timeToDoseAgain": {},
    "valveLogCount": 0,
    "valveStatusObject": {},
    "lastProbeValues": {},
    "debounceSMS" : {},
    "allowDosing": true,
    "getAllowedDosing" : ()  => {
        return functions.allowDosing;
    },
    "slowValveLog": (json) => {
        if (functions.valveLogCount > 6) {
            console.log(JSON.stringify(json));
            functions.valveLogCount = 0;
        }
        functions.valveLogCount++;
    },


    "wait": async (amount) => {
        await new Promise(function (resolve, reject) {
            setTimeout(resolve, amount);
        });
    },

    "waterChangeWaitForValue": async (desiredConductivity) => {

        return new Promise(resolve => {

            function loop() {
                if (functions.lastProbeValues.conductivity < desiredConductivity) {
                    resolve();
                } else {
                    console.log(`Water change: ${functions.lastProbeValues.conductivity} < ${desiredConductivity} = false`);
                    setTimeout(loop, 1000);
                }
            }

            loop();

        });
    },

    "waterChange": async (configuration) => {

        const desiredConductivity = configuration.target_conductivity;

        console.log(`Starting water change to conductivity: ${desiredConductivity}. Allowing dosing: ${functions.getAllowedDosing()}`);

        if (functions.lastProbeValues.conductivity) {

            if (functions.lastProbeValues.conductivity > desiredConductivity) {
                try {
                    // Turn off all the dosing so we don't waste nutrient chasing the desired dosing values.
                    functions.allowDosing = false;

                    console.log(`Allowing dosing: ${functions.getAllowedDosing()}`);

                    const turnOnWasteWaterValve = {"fvs": 1, "fws": 0, "wws": 1};
                    const turnOffWaterWaterValve = {"fvs": 1, "fws": 0, "wws": 0};

                    arduinoPort.write(JSON.stringify(turnOnWasteWaterValve), function (error) {
                        if (error) {
                            console.log(error);
                        }
                    });

                    // The idea here is that we simply turn on the waste water valve.
                    // The FPGA will notice when the low water float switch activates
                    // and will automatically turn on the fresh water valve to make up
                    // for the lost water.
                    await functions.waterChangeWaitForValue(desiredConductivity);

                    const waitValue = configuration.wait_before_next_dose.replace(/\D/g, '');
                    const waitUnit = configuration.wait_before_next_dose.replace(/[0-9]/g, '');

                    if (configuration.pause_labels) {

                        for (const pause_label of configuration.pause_labels) {
                            functions.timeToDoseAgain[pause_label] = moment().add(waitValue, waitUnit).format("YYYY-MM-DD HH:mm:ss");
                        }
                    }

                    arduinoPort.write(JSON.stringify(turnOffWaterWaterValve), function (error) {
                        if (error) {
                            console.log(error);
                        }
                    });



                } catch (err) {
                    console.log("Water change error");
                    console.log(err);

                } finally {
                    // Turn back on dosing whether we succeed or not.
                    functions.allowDosing = true;
                }
            } else {
                console.log(`No need for a water change since the desired conductivity is greater than the current conductivity. ${functions.lastProbeValues.conductivity} < ${desiredConductivity} `)
            }

        } else {
            console.log("Warning: Could not find conductivity in lastProbeValues.");
        }

        console.log(`Ending call to water change. Allowing dosing: ${functions.getAllowedDosing()}`);

    },

    "serialStartRead": () => {

        // const exampleJson = {
        //     "fsl": 0,  // Float switch status (lower)
        //     "fsu": 0,  // Float switch status (upper)
        //     "fvs": 1,  // Flow valve on or off
        //     "fws": 0,  // Fresh water valve on or off
        //     "wws": 0   // Waste water valve on or off
        // };

        serialParser.on('data', function (data) {
            try {
                const json = JSON.parse(data);
                functions.slowValveLog(json);
                functions.valveStatusObject = json; // This isn't the best, but Node is single thread, so there shouldn't be any read/write problems.  Right?
            } catch (exception) {
                console.log("Json Parse Error:");
                console.log(exception);
            }
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
        functions.lastProbeValues = objectToReturn;
        return objectToReturn;
    },

    "setupWaterChangeCronTabSchedule": () => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(configuration.water_change_scheduled).forEach(function (key, index) {
            console.log("Setting up waterchange crontab: " + key);

            const waterChangeConfig = configuration.water_change_scheduled[key];

            const job = new CronJob(waterChangeConfig.cron_pattern, function () {
                functions.waterChange(waterChangeConfig);
            }, null, true);

            job.start();
        });
    },

    "setupDosingCronTabSchedule": () => {

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(configuration.dosing_scheduled).forEach(function (key, index) {
            console.log("Setting up dosing crontab: " + key);

            const dosingConfig = configuration.dosing_scheduled[key];

            const job = new CronJob(dosingConfig.cron_pattern, function () {
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

        if (!functions.getAllowedDosing()) {
            console.log("Dosing is currently disabled.");
            return;
        }

        console.log(functions.timeToDoseAgain);

        const configuration = fs.readJsonSync('./configuration.json', 'utf8');

        Object.keys(reading).forEach(function (key, index) {


            if (configuration.dosing[key]) {

                const readingValue = reading[key];

                const dosingConfigCheck = configuration.dosing[key];

                let dosingConfigArray = [];

                if (Array.isArray(dosingConfigCheck)) {
                    dosingConfigArray = configuration.dosing[key];
                } else {
                    dosingConfigArray = [configuration.dosing[key]];
                }


                for (const dosingConfig of dosingConfigArray) {

                    if (dosingConfig.on_when) {
                        console.log(`On when Comparison: ${readingValue} ${dosingConfig.on_when.comparator} ${dosingConfig.on_when.value} = `
                            + functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value));

                        if (functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value)) {

                            if (dosingConfig.control_type === "home-assist") {
                                functions.controlDosingPumpsWithHomeAssist(dosingConfig, "on");
                            } else if (dosingConfig.control_type === "ezo-pmp") {
                                functions.controlDosingPumpsWithEzo(dosingConfig, readingValue, "on");
                            }
                        }
                    }
                    if (dosingConfig.off_when) {
                        console.log(`Off when comparison: ${readingValue} ${dosingConfig.off_when.comparator} ${dosingConfig.off_when.value} = `
                            + functions.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value));
                        if (functions.doComparison(dosingConfig.off_when.comparator, readingValue, dosingConfig.off_when.value)) {
                            if (dosingConfig.control_type === "home-assist") {
                                functions.controlDosingPumpsWithHomeAssist(dosingConfig, "off");
                            } else if (dosingConfig.control_type === "ezo-pmp") {
                                functions.controlDosingPumpsWithEzo(dosingConfig, readingValue, "off");
                            }
                        }
                    }
                }
            }
        });
    },
    "controlDosingPumpsWithEzo": (configuration, reading, desiredState) => {

        if (functions.timeToDoseAgain[configuration.splunk_label]) {

            const canDoseAgain = moment(functions.timeToDoseAgain[configuration.splunk_label], "YYYY-MM-DD HH:mm:ss");
            const now = moment();
            //
            if (now.isBefore(canDoseAgain)) {
                console.log(now.format("YYYY-MM-DD HH:mm:ss") + " " + configuration.splunk_label + " Waiting to dose. " + functions.timeToDoseAgain[configuration.splunk_label]);
                return;
            }
        }

        if (desiredState === "on") {
            const desiredPoints = configuration[desiredState + "_when"].value;
            let difference = desiredPoints - reading;

            if (difference < 0) {
                difference = difference * -1;
            }

            let doseAmount = difference * configuration.amount_per_point;
            doseAmount = doseAmount.toFixed(1);

            // Make sure the amount request is possible by the pump.
            if (doseAmount > configuration.minimum_amount) {
                if (doseAmount > configuration.max_amount) {
                    doseAmount = configuration.max_amount;
                    console.log("Dose amount is greater than minimum.");
                }

                console.log("-> Label " + configuration.splunk_label + ", dosing: " + doseAmount);

                const waitValue = configuration.wait_before_next_dose.replace(/\D/g, '');
                const waitUnit = configuration.wait_before_next_dose.replace(/[0-9]/g, '');

                if (configuration.pause_label) {
                    functions.timeToDoseAgain[configuration.pause_label] = moment().add(waitValue, waitUnit).format("YYYY-MM-DD HH:mm:ss");
                }

                functions.timeToDoseAgain[configuration.splunk_label] = moment().add(waitValue, waitUnit).format("YYYY-MM-DD HH:mm:ss");
                functions.ezoRunDose(configuration, doseAmount);

            } else {
                console.log(`${configuration.splunk_label}: Dose amount is less than minimum. ${doseAmount} < ${configuration.minimum_amount}`);
            }
        } // Desired state == on.
    },
    "ezoRunDose": (configuration, doseAmount) => {
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
        console.log(`Dose ${configuration.splunk_label}: ${command}`);
        //console.log("Buffer Length: " + DOSE_SEND.length);

        if (!process.env.TESTING) {
            const i2c1 = i2c.openSync(1);
            i2c1.i2cWriteSync(configuration.address, DOSE_SEND.length, DOSE_SEND);
            i2c1.closeSync();
        }
    },
    "controlDosingPumpsWithHomeAssist": (configuration, desiredState) => {

        if (desiredState === "on") {

            // You may want to pause turning on a dosing pump.  You don't want to pause during it off.

            if (functions.timeToDoseAgain[configuration.entity_id]) {

                const canDoseAgain = moment(functions.timeToDoseAgain[configuration.entity_id], "YYYY-MM-DD HH:mm:ss");
                const now = moment();
                //
                if (now.isBefore(canDoseAgain)) {
                    console.log(now.format("YYYY-MM-DD HH:mm:ss") + " " + configuration.entity_id + " Waiting to dose. " + functions.timeToDoseAgain[configuration.entity_id]);
                    return;
                }
            }

            // If the device state is on, then you may want to pause another dosing pump.
            if (configuration.pause_label) {
                const waitValue = configuration.wait_before_next_dose.replace(/\D/g, '');
                const waitUnit = configuration.wait_before_next_dose.replace(/[0-9]/g, '');
                functions.timeToDoseAgain[configuration.pause_label] = moment().add(waitValue, waitUnit).format("YYYY-MM-DD HH:mm:ss");
            }
        }

        const axiosConfig = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + process.env.HUE_API_TOKEN
            }
        };

        const jsonToWrite = {
            "entity_id": configuration.entity_id
        };

        const deviceStateUrl = `http://${process.env.HOME_ASSISTANT_API}/api/states/${configuration.entity_id}`;

        console.log(deviceStateUrl);

        axios.get(deviceStateUrl, axiosConfig).then(statusResult => {

            console.log("Device State: " + statusResult.data.state);

            const currentState = statusResult.data.state;

            if (currentState === "unavailable") {
                functions.sendSMS(configuration.entity_id, `Unable to get status of device: ${configuration.entity_id}`)
            }

            if (currentState !== desiredState) {

                let endpoint = "";

                if (desiredState === "off") {
                    endpoint = "/api/services/light/turn_off"
                } else if (desiredState === "on") {

                    endpoint = "/api/services/light/turn_on";
                }

                const url = `http://${process.env.HOME_ASSISTANT_API}${endpoint}`;
                if (!process.env.TESTING) {
                    if (endpoint) {
                        axios.post(url, jsonToWrite, axiosConfig).then(stateResult => {
                            console.log(JSON.stringify(stateResult.data, null, 2));
                            functions.writeSplunkData({
                                "deviceName": configuration.entity_id,
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
    },
    "sendSMS" : async (label, message) => {

        if (functions.allowSms(label)) {
            const client = new twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

            await client.messages.create({
                body: message,
                to:  process.env.TWILIO_TO,
                from:  process.env.TWILIO_FROM
            }).then((result) => {
                console.log(result);
            }).catch((exception) => {
                console.log(exception);
            });
        }
    },
    "allowSms" : (label) => {

        if (functions.debounceSMS[label]) {

            const compareMoment = moment().subtract(30, "m");  // Only allow one message per type every thirty minutes.
            if (compareMoment.isAfter(functions.debounceSMS[label])) {
                functions.debounceSMS[label] = moment();
                return true;
            } else {
                return false;
            }

        } else {
            functions.debounceSMS[label] = moment();
            return true;
        }

    }

};

module.exports = functions;