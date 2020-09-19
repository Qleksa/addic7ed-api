const fs      = require('fs');
const iconv   = require('iconv-lite');
const fetch   = require('node-fetch');
const helpers = require('./helpers');

function download (subInfo, filename) {
    return new Promise(function (resolve, reject) {
        fetch(helpers.addic7edURL + subInfo.link, {
            headers:  {
                'Referer': helpers.addic7edURL + (subInfo.referer || '/show/1')
            },
            follow: 0
        }).then(res => res.buffer())
          .then(fileContentBuffer => {
            let fileContent = iconv.decode(fileContentBuffer, 'utf8');

            if (~fileContent.indexOf('�')) {
                // File content seems bad encoded, try to decode again
                // ---------------------------------------------------
                fileContent = iconv.decode(fileContentBuffer, 'binary');
            }

            fs.writeFile(filename, fileContent, 'utf8', resolve);
        }).catch(reject);
    });
}

module.exports = download;
