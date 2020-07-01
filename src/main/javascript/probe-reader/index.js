const library = require("./index-library");
const fs = require("fs-extra");

const configuration = fs.readJsonSync('./configuration.json', 'utf8');

setTimeout(function() {
    library.readConfiguredProbesSync().then(result => {
        console.log(JSON.stringify(result, null, 2));
    });
}, configuration.loop_time_in_milis);

