const library = require("./index-library");

const result = library.readConfiguredProbesSync();

console.log(result);


//setTimeout(readProbesInConfiguration(), configuration.loop_time_in_milis);

