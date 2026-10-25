import {
    defaultOptions,
    loadOptions,
    saveOptions,
    serializeOptions,
    parseOptions,
} from '../src/util.js';

const customOptions = {
    hostname: 'https://127.0.0.1:9091/',
    username: 'user',
    password: 'pass',
    labels: ['movies', 'tv'],
    directories: ['/data/movies'],
    presets: ['movies, tv'],
    selectedLabels: ['tv'],
    directory: '/data/movies',
    addPaused: true,
    notifications: false,
};

describe('Options', () => {
    it('Load default options', async () => {
        chrome.storage.local.get.yields({});

        expect(await loadOptions()).to.deep.equal(defaultOptions());
        expect(chrome.storage.local.set.notCalled).to.be.true;
    });

    it('Save and load custom options', async () => {
        saveOptions(customOptions);
        expect(chrome.storage.local.set.calledOnceWith(customOptions)).to.be.true;

        chrome.storage.local.get.yields(customOptions);

        expect(await loadOptions()).to.deep.equal(customOptions);
    });

    it('Populate missing options and drop invalid ones', async () => {
        chrome.storage.local.get.yields({
            hostname: 'https://127.0.0.1/',
            labels: 'not an array',
            unknownKey: true,
        });

        expect(await loadOptions()).to.deep.equal({
            ...defaultOptions(),
            hostname: 'https://127.0.0.1/',
        });
    });

    it('Migrate legacy options', async () => {
        chrome.storage.local.get.yields({
            globals: {
                addPaused: true,
                addAdvanced: false,
                contextMenu: 1,
                enableNotifications: false,
                labels: ['movies', 'tv'],
            },
            servers: [{
                name: 'Default',
                application: 'transmission',
                hostname: 'https://127.0.0.1:9091/',
                username: 'user',
                password: 'pass',
                directories: ['/data/movies'],
                clientOptions: {},
                httpAuth: null,
                defaultLabel: 'tv',
                defaultDirectory: '/data/movies',
            }],
        });

        const migrated = {...customOptions, presets: []};

        expect(await loadOptions()).to.deep.equal(migrated);
        expect(chrome.storage.local.remove.calledOnceWith(['globals', 'servers'])).to.be.true;
        expect(chrome.storage.local.set.calledOnceWith(migrated)).to.be.true;
    });

    it('Export and import round trip', () => {
        expect(parseOptions(serializeOptions(customOptions))).to.deep.equal(customOptions);
    });

    it('Import ignores unknown keys', () => {
        expect(parseOptions(JSON.stringify({hostname: 'https://x/', foo: 1}))).to.deep.equal({
            ...defaultOptions(),
            hostname: 'https://x/',
        });
    });

    it('Import rejects invalid files', () => {
        expect(() => parseOptions('not json')).to.throw();
        expect(() => parseOptions('[]')).to.throw('Not a settings object');
        expect(() => parseOptions('null')).to.throw('Not a settings object');
        expect(() => parseOptions('{"foo": 1}')).to.throw('No known settings found');
    });
});
