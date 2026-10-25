import {
    isMagnetUrl,
    getHostFilter,
    getTorrentName,
    getMagnetUrlName,
    parsePreset,
} from '../src/util.js';

import {getTestTorrent} from './helpers.js';

describe('Test helpers', () => {
    it('isMagnetUrl', () => {
        expect(isMagnetUrl('magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a&dn=Test Torrent')).to.equal(true);
        expect(isMagnetUrl('https://example.com/file.torrent')).to.equal(false);
    });

    it('getMagnetUrlName', () => {
        expect(getMagnetUrlName('magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a&dn=Test Torrent')).to.equal('Test Torrent');
        expect(getMagnetUrlName('magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a&dn=Test Torrent&tr=http://tracker.example.com/announce')).to.equal('Test Torrent');

        expect(getMagnetUrlName('magnet:?xt=urn:btih:c12fe1c06bba254a9dc9f519b335aa7c1367a88a')).to.equal(false);
        expect(getMagnetUrlName('https://example.com/file.torrent')).to.equal(false);
    });

    it('parsePreset', () => {
        expect(parsePreset(' movies ,4k, ,')).to.deep.equal(['movies', '4k']);
        expect(parsePreset('')).to.deep.equal([]);
    });

    it('getTorrentName', async () => {
        const torrentFile = await getTestTorrent();

        expect(await getTorrentName(torrentFile)).to.equal('ubuntu-20.04-desktop-amd64.iso');
    });

    it('getHostFilter', () => {
        const testCases = [
            ['http://example.com/', 'http://example.com/*'],
            ['https://example.com/', 'https://example.com/*'],
            ['https://example.com:8080/webui', 'https://example.com/*'],
            ['https://long.sub.domain.example.com/', 'https://long.sub.domain.example.com/*'],
            ['https://user:pass@example.com:9000', 'https://example.com/*'],
            ['https://127.0.0.1:8080/', 'https://127.0.0.1/*'],
            ['https://[2001:0db8:0000:0000:0000:0000:1420:57ab]:8080/webui', 'https://[2001:db8::1420:57ab]/*'],
        ];

        testCases.forEach(([hostname, result]) => expect(getHostFilter(hostname)).to.equal(result));
    });
});
