
const library = require("./index-library");
const fs = require("fs-extra");
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

const configuration = fs.readJsonSync('./configuration.json', 'utf8');

library.setupCronTabSchedule();

setInterval(function() {
    library.readConfiguredProbesSync().then(result => {
        console.log(JSON.stringify(result, null, 2));
        library.writeSplunkData(result);
        //library.checkValuesAndRunDosingPumps(result);
    });
}, configuration.loop_time_in_milis);

const arduinoPort = new SerialPort('/dev/inor', {
    baudRate: 9600
});

const serialParser = arduinoPort.pipe(new Readline({delimiter: '\r\n'}));

serialParser.on('data', function (data) {
    try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
    } catch (exception) {
        console.log("Json Parse Error:");
        console.log(exception);
    }
});