const fetch   = require('node-fetch');
const langs   = require('langs');
const helpers = require('./helpers');
const qs      = require('querystring');

function search (show, season, episode, languages) {
    const  searchTitle = `${show.trim()} ${season ? helpers.formatShowNumber(season) : ''} ${episode ? helpers.formatShowNumber(episode) : ''}`.trim();

    const querystring = qs.encode({search: searchTitle, Submit: 'Search'})

    return fetch(`${helpers.addic7edURL}/search.php?${querystring}`, {
        method: 'GET',
        compress: true
    }).then(res => res.text())
      .then(function(body) {
        if (/<b>\d+ results found<\/b>/.test(body)) {
            if (~body.indexOf('<b>0 results found<\/b>')) {
                // No result
                // =========
                console.log('[Search] Addic7ed.com error: No result.');
                return [];
            }

            // Multiple results
            // ================

            // Find result with proper season and episode in url
            // -------------------------------------------------
            let regexp
            if (season) {
                regexp = new RegExp('href="(serie/[^/]+/' + parseInt(season) + '/' + parseInt(episode) + '/.+?)"');
            } else {
                regexp = new RegExp('href="(movie\/[0-9]+?)"');
            }
            const urlMatch = body.match(regexp);
            const url      = urlMatch && urlMatch[1];

            if (!url) {
                console.log('[Search] Addic7ed.com error: subtitles not found in a multiple result set.');
                return [];
            }

            return fetch(`${helpers.addic7edURL}/${url}`)
                .then(res => res.text())
                .then(function (body) {
                    return findSubtitles(season ? 'tv' : 'movie', body, languages);
                })
                .catch(err => console.log(err));
        }

        return findSubtitles(body, languages);
    }).catch(err => console.log(err));
}

function findSubtitles (type, body, languages) {
    var regexList
    if (type === 'tv') {
        regexList = {
            titleMatch: /(.+?) - \d\dx\d\d - (.+?) <small/
        }
    } else {
        regexList = {
            titleMatch: /(.*?) \([0-9]{4}\) <small/
        }
    }

    let subs = [];
    let refererMatch = body.match(/\/show\/\d+/);
    let referer = refererMatch ? refererMatch[0] : '/show/1';
    let titleMatch = body.match(regexList.titleMatch);
    let episodeTitle = titleMatch ? titleMatch[2] : '';
    let showTitle = titleMatch ? titleMatch[1].trim() : '';
    let versionRegExp = /Version (.+?),([^]+?)<\/table/g;
    let versionMatch;
    let version;
    let hearingImpaired;
    const subInfoRegExp = /class="language">([^]+?)<a[^]+?(% )?Completed[^]+?href="([^"]+?)"><strong>(?:most updated|Download)[^]+?(\d+) Downloads/g;
    let subInfoMatch;
    let lang;
    let langId;
    let notCompleted;
    let link;
    let downloads;
    let distributionMatch;
    let distribution;
    let team;

    // Find subtitles HTML block parts
    // ===============================
    while ((versionMatch = versionRegExp.exec(body)) !== null) {
        version = versionMatch[1].toUpperCase();
        hearingImpaired = versionMatch[2].indexOf('Hearing Impaired') !== -1;

        while ((subInfoMatch = subInfoRegExp.exec(versionMatch[2])) !== null) {
            notCompleted = subInfoMatch[2];
            if (notCompleted) {
                continue;
            }

            lang = subInfoMatch[1];
            // Find lang iso code 2B
            // ---------------------
            langId = langs.where('name', lang.replace(/\(.+\)/g, '').trim());
            langId = langId && langId['2B'] || lang.substr(0, 3).toLowerCase();

            if (languages && !~languages.indexOf(langId)) {
                continue;
            }

            link = subInfoMatch[3];
            downloads = parseInt(subInfoMatch[4], 10);

            distributionMatch = version.match(/HDTV|WEB(.DL|.?RIP)?|WR|BRRIP|BDRIP|BLURAY/i);

            distribution = distributionMatch
                ? distributionMatch[0].toUpperCase()
                .replace(/WEB(.DL|.?RIP)?|WR/, 'WEB-DL')
                .replace(/BRRIP|BDRIP|BLURAY/, 'BLURAY')
                : 'UNKNOWN';

            team = version.replace(/.?(REPACK|PROPER|[XH].?264|HDTV|480P|720P|1080P|2160P|AMZN|WEB(.DL|.?RIP)?|WR|BRRIP|BDRIP|BLURAY)+.?/g, '')
                    .trim().toUpperCase() || 'UNKNOWN';
            
            subs.push({
                episodeTitle:    episodeTitle,
                showTitle:       showTitle,
                downloads:       downloads,
                lang:            lang,
                langId:          langId,
                distribution:    distribution,
                team:            team,
                version:         version,
                link:            link,
                referer:         referer,
                hearingImpaired: hearingImpaired
            });
        }
    }

    return subs;
}

function searchError (err) {
    return console.log('[Search] Addic7ed.com error', err.statusCode, err.options && err.options.qs.search);
}

module.exports = search;
