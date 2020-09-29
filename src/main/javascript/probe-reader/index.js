
const library = require("./index-library");
const fs = require("fs-extra");


const configuration = fs.readJsonSync('./configuration.json', 'utf8');

library.setupCronTabSchedule();

setInterval(function() {
    library.readConfiguredProbesSync().then(result => {
        console.log(JSON.stringify(result, null, 2));
        library.writeSplunkData(result);
        //library.checkValuesAndRunDosingPumps(result);
    });
}, configuration.loop_time_in_milis);

library.serialRead();

