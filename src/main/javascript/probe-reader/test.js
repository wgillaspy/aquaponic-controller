const library = require("./index-library");
const fs = require("fs-extra");

const configuration = fs.readJsonSync('./configuration.json', 'utf8');

const reading = {
    "pH": "5.838",
    "conductivity": "1298"
};


Object.keys(reading).forEach(function (key, index) {
    if (configuration.dosing[key]) {
        console.log(reading[key]);

        const readingValue = reading[key];

        const dosingConfig = configuration.dosing[key];

        if (dosingConfig.on_when) {
            if (library.doComparison(dosingConfig.on_when.comparator, readingValue, dosingConfig.on_when.value)) {
                 library.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "on");
            }
        }
        if (dosingConfig.of_when) {
            if (library.doComparison(dosingConfig.off_when.comparator, readingValue, dosingConfig.off_when.value)) {
                library.controlDosingPumpsWithHomeAssist(dosingConfig.entity_id, "off");
            }
        }

    }
});

