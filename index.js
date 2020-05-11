
'use strict';

const Fs = require('fs');
const Async = require('async');
const Xray = require('x-ray')();

const Constants = require('./constants.json');

const protocol = "https";
const host = 'mykbostats.com';

const log = function () {

    console.log.apply(console, arguments);
};

const convertStats = (categories, addOns, stats) => {

    if (!stats) {
        stats = addOns;
        addOns = () => {};
    }

    const results = [];
    let i = 0;
    while (i < stats.length) {
        const result = {};
        for (let k = 0; k < categories.length; ++k) {
            const category = categories[k];
            if (category === 'CG(SHO)') {
                const parts = stats[i].match(/(\d+) \((\d+)\)/);
                result['CG'] = +parts[1];
                result['SHO'] = +parts[2];
            }
            else {
                result[categories[k]] = stats[i] && stats[i].trim().replace(' ⅓','.1').replace(' ⅔', '.2');
                if (!isNaN(result[categories[k]])) {
                    result[categories[k]] = +result[categories[k]];
                }
            }
            ++i;
        }
        addOns(result);
        results.push(result);
    }
    return results;
};

const convertHittingStats = (stats) => {

    const categories = [
        'Year',
        'Team',
        'BA',
        'OBP',
        'SLG',
        'OPS',
        'G',
        'PA',
        'AB',
        'R',
        'H',
        '2B',
        '3B',
        'HR',
        'RBI',
        'SB',
        'CS',
        'BB',
        'SO',
        'TB',
        'GDP',
        'HBP',
        'SH',
        'SF',
        'IBB',
        'RISP',
        'PHBA'
    ];

    const addOns = (result) => {

        result['K%'] = result.SO/result.PA;
        result['BB%'] = result.BB/result.PA;
        result.ISO = result.SLG - result.BA;

        const constants = Constants[result.Year];
        result.wOBA = constants && (
            constants.wBB * (result.BB - result.IBB) +
            constants.wHBP * result.HBP +
            constants.w1B * (result.H - result['2B'] - result['3B'] - result.HR) +
            constants.w2B * result['2B'] +
            constants.w3B * result['3B'] +
            constants.wHR * result['HR']
        ) / (
            result.AB + result.BB - result.IBB + result.SF + result.HBP
        );
    };

    return convertStats(categories, addOns, stats.slice(0,stats.length - (categories.length + 1)));
};

const convertPitchingStats = (stats) => {
    const categories = [
        'Year',
        'Team',
        'ERA',
        'WHIP',
        'W',
        'L',
        'SV',
        'H',
        'BSV',
        'G',
        'GS',
        'CG(SHO)',
        'QS',
        'TBF',
        'NP',
        'IP',
        'R',
        'ER',
        'H',
        '2B',
        '3B',
        'HR',
        'SO',
        'BB',
        'IBB',
        'HB',
        'WP',
        'BK'
    ];

    const addOns = (result) => {
        result['K%'] = result.SO/result.TBF;
        result['BB%'] = result.BB/result.TBF;
        result.BABIP = result.H/(result.TBF - result.SO - result.BB - result.BB - result.IBB - result.HB);
    };

    return convertStats(categories, addOns, stats.slice(0,stats.length - (categories.length + 1)));
};

const convertHittingLastTen = (stats) => {
    const categories = [
        'Date',
        'Opp',
        'AB',
        'R',
        'H',
        '2B',
        '3B',
        'HR',
        'RBI',
        'SB',
        'CS',
        'BB',
        'BA',
        'OBP',
        'SLG',
        'OPS',
        'TB',
        'GDP',
        'HBP'
    ];

    return convertStats(categories, stats.slice(0, stats.length - (categories.length - 1)));
};

const convertPitchingLastTen = (stats) => {
    const categories = [
        'Date',
        'Opp',
        'Role',
        'Dec',
        'ERA',
        'WHIP',
        'IP',
        'NP',
        'R',
        'ER',
        'H',
        'HR',
        'SO',
        'BB',
        'HB',
        'GS'
    ];

    return convertStats(categories, stats.slice(0, stats.length - (categories.length - 2)));
};

const getPlayerPage = (playerUrl, callback) => {

    Xray(playerUrl, {
        header: 'div#content h1',
        details: ['div#content div div div'],
        stats: ['div.stats-container td'],
        lastTen: ['div#recent-games td']
    })((err, rawPlayer) => {

        if (err) {
            return callback(err);
        }

        const header = rawPlayer.header.match(/^\n([A-z \-\.éá]+) \((.+)\)\n([A-z ]+) \#(\d+) \| ([A-z0-9]+)\n$/);
        const player = {
            names: {
                english: header[1],
                korean: header[2].trim()
            },
            team: header[3],
            number: header[4],
            position: header[5]
        };

        const batsthrows = rawPlayer.details[1].match('Bats/Throws: (.)/(.)');
        player.bats = batsthrows[1];
        player.throws = batsthrows[2];

        const isPitcher = ['RHP', 'LHP'].indexOf(player.position) > -1;

        player.stats = isPitcher ? convertPitchingStats(rawPlayer.stats) : convertHittingStats(rawPlayer.stats);
        player.lastTen = isPitcher ? convertPitchingLastTen(rawPlayer.lastTen) : convertHittingLastTen(rawPlayer.lastTen);

        return callback(null, player);
    });
};

const getPlayerUrls = (teamUrl, callback) => {

    Xray(teamUrl, ['a.profile-link@href'])((err, players) => {

        if (err) {
            throw err;
        }

        Async.mapLimit(players, 5, (player, done) => {

            log('getting', player);
            getPlayerPage(player, done);
        }, callback);
    });
};

const getTeamUrls = (callback) => {

    const rootUrl = `${protocol}://${host}/standings_partial`;
    log('getting', rootUrl);
    Xray(rootUrl, ['.visible-no-logos a@href'])((err, teams) => {

        if (err) {
            throw err;
        }

        Async.mapLimit(teams, 3, (team, done) => {

            const url = `${team}/roster`;
            log('getting', url);
            getPlayerUrls(url, done);
        }, callback);
    });
};

const start = () => {

    log('starting', new Date())
    const playerData = [];
    getTeamUrls((err, teamData) => {

        if (err) {
            throw err;
        }

        teamData.forEach((players) => {

            players.forEach((player) => playerData.push(player));
        });

        Fs.writeFileSync('players.json', JSON.stringify(playerData, null, 2));
        log('fin', new Date())
    });
};

start();


