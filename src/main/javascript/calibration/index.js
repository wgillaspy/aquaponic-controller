const library = require("./index-library");
const Hapi = require('@hapi/hapi');

const init = async () => {

    const server = Hapi.server({
        port: 9090
    });

    server.route({
        method: 'POST',
        path:'/calibration/translate',
        handler: library.handleTranslate
    });

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

init();