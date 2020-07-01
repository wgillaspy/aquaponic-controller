const library = require("./index-library");

library.readConfiguredProbesSync().then(result => {

    console.log(result);
});




//setTimeout(readProbesInConfiguration(), configuration.loop_time_in_milis);

