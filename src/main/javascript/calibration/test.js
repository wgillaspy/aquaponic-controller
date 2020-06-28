const library = require("./index-library");

const pHValue = 6.108;
const newPHValue = library.test("pH", pHValue);
console.log(`pH: Sent ${pHValue} got ${newPHValue}`)


const ecValue = 1139;
const newEcValue = library.test("conductivity", ecValue);
console.log(`conductivity: Sent ${ecValue} got ${newEcValue}`)