
'use strict';

const Xray = require('x-ray')();

const protocol = "https";
const host = 'mykbostats.com';

const getTeamUrls = () => {


    const rootUrl = `${protocol}://${host}/standings_partial`;
    Xray(rootUrl, ['.visible-no-logos a@href'])((err, teams) => {

        console.log(err, teams);
    });
};

getTeamUrls();
