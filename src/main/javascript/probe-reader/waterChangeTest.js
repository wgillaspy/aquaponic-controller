require('dotenv').config();
const library = require("./index-library");
const fs = require("fs-extra");


library.valveStatusObject  = {"fsl":0,"fsu":0,"fvs":1,"fws":0,"wws":0};
library.lastProbeValues = {
    "pH": "5.781",
    "conductivity": "1306",
    "temperature": "27.306",
    "DO": "7.84"
};

const _this = this;

library.waterChange(1300);

setInterval(function() {
    library.lastProbeValues.conductivity--;
}, 1000);




