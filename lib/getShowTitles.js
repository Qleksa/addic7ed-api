const fetch   = require('node-fetch');
const helpers = require('./helpers');

function getShowTitles () {
    return fetch(helpers.addic7edURL)
    .then(res => res.text())
    .then(body => {
        // Find all show titles
        // -------------------------------------------------
        const regexp = /<option value="\d+" >([^<]*)<\/option>/gm;            
        let match; 
        const showTitles = [];
        while ((match = regexp.exec(body)) !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (match.index === regexp.lastIndex) {
                regexp.lastIndex++;
            }
            showTitles.push(match[1].replace('&amp;', '&'));
        }

        return showTitles;
    }).catch(getShowTitlesError);
}

function getShowTitlesError (err) {
    return console.log('[GetShowTitlesError] Addic7ed.com error', err.statusCode, err.options && err.options.qs.search);
}

module.exports = getShowTitles;
