'use strict';

const Fs = require('fs');
const Players = require('./players.json');

const pitchers = [];
const hitters = [];

Players.forEach((player) => {

    if (['RHP', 'LHP'].includes(player.position)) {
        return pitchers.push(player);
    }

    hitters.push(player);
});

const getStatsHeaders = (players) => {

    let header = '';
    let first = true;

    const properties = Object.keys(players[0].stats[0]);
    properties.forEach((stat) => {
        if (!first) {
            header += ',';
        }

        header += stat;

        first = false;
    });

    return { value: header, properties };
};

const outputPlayerCsv = (player, properties) => {

    let output = '';
    player.stats.forEach((season) => {

        output += `${player.names.english},${player.team},${player.number},${player.position},${player.bats},${player.throws},`;
        properties.forEach((property) => {
            output += `${season[property]},`;
        });
        output = `${output.substring(0, output.length - 1)}\n`;
    });

    return output;
};

const createHitterCSV = () => {
    const statsHeader = getStatsHeaders(hitters);
    let csv = `Name,Team,Number,Position,Bats,Throws,${statsHeader.value}\n`;

    hitters.forEach((hitter) => {

        csv += outputPlayerCsv(hitter, statsHeader.properties);
    });

    return csv;
};

const createPitcherCSV = () => {
    const statsHeader = getStatsHeaders(pitchers);
    let csv = `Name,Team,Number,Position,Bats,Throws,${statsHeader.value}\n`;

    pitchers.forEach((pitcher) => {

        csv += outputPlayerCsv(pitcher, statsHeader.properties);
    });

    return csv;
};

const hitterCSV = createHitterCSV();
const pitcherCSV = createPitcherCSV();

Fs.writeFileSync('./hitters.csv', hitterCSV);
Fs.writeFileSync('./pitchers.csv', pitcherCSV);


