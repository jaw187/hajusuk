
'use strict';

const Fs = require('fs');
const Xray = require('x-ray')();

const protocol = "http";
const host = 'www.statiz.co.kr';


const log = function () {

    console.log.apply(console, arguments);
};


const getConstants = (callback) => {

    const rootUrl = `${protocol}://${host}/constant.php`;
    log('getting', rootUrl);
    Xray(rootUrl, {
        headers: ['table.table-striped th'],
        data: ['table.table-striped td']
    })((err, results) => {

        if (err) {
            return callback(err);
        }

        const { headers, data } = results;
        const constants = {};

        let i = 0;
        while (i < data.length) {
            const year = data[i];
            ++i;

            constants[year] = {};
            for (let j = 1; j < headers.length; ++j) {
                constants[year][headers[j]] = +data[i];
                ++i;
            }
        }

        return callback(null, constants);
    });
};

const start = () => {

    log('starting', new Date())
    getConstants((err, constants) => {

        if (err) {
            throw err;
        }

        Fs.writeFileSync('constants.json', JSON.stringify(constants, null, 2));
        log('fin', new Date())
    });
};

start();


