
const library = require("./index-library");
const fs = require("fs-extra");


const configuration = fs.readJsonSync('./configuration.json', 'utf8');

library.setupCronTabSchedule();

setInterval(function() {
    library.readConfiguredProbesSync().then(result => {
        console.log(JSON.stringify(result, null, 2));
        library.writeSplunkData(result);
        library.checkValuesAndRunDosingPumps(result);
    });
}, configuration.loop_time_in_milis);

library.serialStartRead();

console.log("Will request water change in 20 seconds.");
setTimeout(function() {
    console.log("Water change starting");
    library.waterChange(1290);
}, 20000);

