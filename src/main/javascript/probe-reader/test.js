require('dotenv').config();
const library = require("./index-library");
const fs = require("fs-extra");



const reading = {
    "pH": "6.5",
    "conductivity": "1300"
};

setInterval(() => {
    library.checkValuesAndRunDosingPumps(reading)
    if (reading.pH > 4) {
        reading.pH = reading.pH - .1
    }
}, 2000);

//library.setupCronTabSchedule();



