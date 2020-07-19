require('dotenv').config();
const library = require("./index-library");
const fs = require("fs-extra");



const reading = {
   // "pH": "5.838",
    "conductivity": "1086"
};

setInterval(() => {library.checkValuesAndRunDosingPumps(reading)}, 2000);



