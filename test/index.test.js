import {
    fetchTorrent,
    buildMenuItems,
} from '../src/index.js';
import {
    defaultOptions,
    getActiveSelection,
} from '../src/util.js';

import {
    getTestTorrent,
    getTestHtml,
} from './helpers.js';

const expectRejection = async (promise, message) => {
    try {
        await promise;
        expect.fail('should reject');
    } catch (e) {
        expect(e.message).to.equal(message);
    }
}

describe('fetchTorrent', () => {
    it('Fetches torrent', async () => {
        const testTorrent = await getTestTorrent();

        chrome.tabs.get.withArgs(2).yields({});
        chrome.tabs.sendMessage.yields({
            ok: true,
            status: 200,
            statusText: 'OK',
            content: testTorrent,
        });

        expect(await fetchTorrent('https://example.com/test.torrent', 2)).to.deep.equal({
            torrent: testTorrent,
            torrentName: 'ubuntu-20.04-desktop-amd64.iso',
        });
    });

    it('Network error', async () => {
        chrome.tabs.get.withArgs(3).yields({});
        chrome.tabs.sendMessage.yields({error: 'NetworkError when attempting to fetch resource.'});

        await expectRejection(fetchTorrent('https://example.com/test.torrent', 3), 'NetworkError when attempting to fetch resource.');
    });

    it('No response from page', async () => {
        chrome.tabs.get.withArgs(3).yields({});
        chrome.tabs.sendMessage.yields(undefined);
        chrome.i18n.getMessage.withArgs('torrentFetchError', 'No response from page').returns('no response');

        await expectRejection(fetchTorrent('https://example.com/test.torrent', 3), 'no response');
    });

    it('Not found', async () => {
        chrome.tabs.get.withArgs(3).yields({});
        chrome.tabs.sendMessage.yields({
            ok: false,
            status: 404,
            statusText: 'Not found',
            content: await getTestHtml(),
        });
        chrome.i18n.getMessage.withArgs('torrentFetchError', '404: Not found').returns('Failed to fetch torrent. (404: Not found)');

        await expectRejection(fetchTorrent('https://example.com/test.torrent', 3), 'Failed to fetch torrent. (404: Not found)');
    });

    it('Invalid mime type', async () => {
        chrome.tabs.get.withArgs(3).yields({});
        chrome.tabs.sendMessage.yields({
            ok: true,
            status: 200,
            statusText: 'OK',
            content: await getTestHtml(),
        });
        chrome.i18n.getMessage.withArgs('torrentParseError', 'Unknown type: text/html').returns('Failed to read torrent. (Unknown type: text/html)');

        await expectRejection(fetchTorrent('https://example.com/test.torrent', 3), 'Failed to read torrent. (Unknown type: text/html)');
    });

    it('Missing tab', async () => {
        chrome.tabs.get.withArgs(4).yields(undefined);
        chrome.i18n.getMessage.withArgs('sourceTabDestroyedError').returns('gone');

        await expectRejection(fetchTorrent('https://example.com/test.torrent', 4), 'gone');
    });
});

describe('Context menu', () => {
    const options = {
        ...defaultOptions(),
        hostname: 'https://127.0.0.1:9091/',
        labels: ['movies', 'tv', '4k'],
        directories: ['/data/movies', '/data/tv'],
        selectedLabels: ['tv', '4k', 'deleted-label'],
        directory: '/data/tv',
        addPaused: true,
        presets: ['movies, 4k', 'tv'],
    };

    beforeEach(() => {
        chrome.i18n.getMessage.callsFake((key, sub) => sub ? key + ':' + sub : key);
    });

    it('Active selection ignores stale values', () => {
        expect(getActiveSelection(options)).to.deep.equal({
            labels: ['tv', '4k'],
            path: '/data/tv',
            paused: true,
        });

        expect(getActiveSelection({...options, directory: '/removed'}).path).to.equal(null);
    });

    it('Builds checkbox labels and radio directories', () => {
        const items = buildMenuItems(options);
        const byId = Object.fromEntries(items.map((item) => [item.id, item]));

        expect(byId['add-torrent'].title).to.equal('addTorrentAction (tv, 4k, /data/tv)');

        expect(byId['label-0']).to.include({type: 'checkbox', checked: false, title: 'movies', parentId: 'labels'});
        expect(byId['label-1']).to.include({type: 'checkbox', checked: true, title: 'tv'});
        expect(byId['label-2']).to.include({type: 'checkbox', checked: true, title: '4k'});

        expect(byId['directory-default']).to.include({type: 'radio', checked: false});
        expect(byId['directory-1']).to.include({type: 'radio', checked: true, title: '/data/tv'});

        expect(byId['add-paused']).to.include({type: 'checkbox', checked: true});
    });

    it('Adds a menu item per preset', () => {
        const presets = buildMenuItems(options).filter((item) => item.id.startsWith('preset-'));

        expect(presets.map((item) => item.title)).to.deep.equal([
            'addTorrentPresetAction:movies + 4k',
            'addTorrentPresetAction:tv',
        ]);
    });

    it('Omits empty submenus', () => {
        const ids = buildMenuItems({...options, labels: [], directories: [], presets: []}).map((item) => item.id);

        expect(ids).to.deep.equal(['add-torrent', 'separator', 'add-paused']);
    });
});
