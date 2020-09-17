require('dotenv').config();
const library = require("./index-library");
const fs = require("fs-extra");



const reading = {
    "pH": "6.88",
    "conductivity": "300"
};

setInterval(() => {library.checkValuesAndRunDosingPumps(reading)}, 2000);

//library.setupCronTabSchedule();



