import sinon from 'sinon';
import {getTestTorrent} from '../helpers.js';
import TransmissionApi from '../../src/lib/transmission.js';

const jsonResponse = (body, status = 200, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status: status,
    statusText: '',
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
});

const requestBody = (call) => JSON.parse(call.args[1].body);

describe('TransmissionApi', () => {
    /** @type {TransmissionApi} */
    let instance;

    beforeEach(() => {
        instance = new TransmissionApi({
            username: 'testuser',
            password: 'testpassw0rd',
            hostname: 'https://example.com:1234/',
        });
    });

    it('Add torrent', async () => {
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrent(await getTestTorrent());

        expect(fetchStub.calledOnce).to.be.true;
        expect(fetchStub.firstCall.args[0]).to.equal('https://example.com:1234/transmission/rpc');
        expect(fetchStub.firstCall.args[1].method).to.equal('POST');

        const body = requestBody(fetchStub.firstCall);
        expect(body.method).to.equal('torrent-add');
        expect(Object.keys(body.arguments)).to.deep.equal(['metainfo']);
        expect(body.arguments.metainfo).to.match(/^ZDg6YW5ub3VuY2/);
    });

    it('Add torrent with options', async () => {
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrent(await getTestTorrent(), {
            paused: true,
            path: '/mnt/storage',
            labels: ['label1', 'label2'],
        });

        const {arguments: args} = requestBody(fetchStub.firstCall);
        expect(args.paused).to.equal(true);
        expect(args['download-dir']).to.equal('/mnt/storage');
        expect(args.labels).to.deep.equal(['label1', 'label2']);
    });

    it('Add torrent url', async () => {
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrentUrl('magnet:?xt=urn:btih:abc', {paused: false, path: null, labels: []});

        expect(requestBody(fetchStub.firstCall)).to.deep.equal({
            method: 'torrent-add',
            arguments: {
                filename: 'magnet:?xt=urn:btih:abc',
            },
        });
    });

    it('Sends basic auth', async () => {
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');

        const headers = fetchStub.firstCall.args[1].headers;
        expect(headers.get('Authorization')).to.equal('Basic ' + Buffer.from('testuser:testpassw0rd').toString('base64'));
    });

    it('Omits auth without credentials', async () => {
        instance = new TransmissionApi({hostname: 'https://example.com/'});
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');

        expect(fetchStub.firstCall.args[1].headers.has('Authorization')).to.be.false;
    });

    it('Retries with session id on 409', async () => {
        const fetchStub = sinon.stub(global, 'fetch');
        fetchStub.onFirstCall().resolves(jsonResponse({}, 409, {'X-Transmission-Session-Id': 'abc123'}));
        fetchStub.onSecondCall().resolves(jsonResponse({result: 'success'}));

        await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');

        expect(fetchStub.calledTwice).to.be.true;
        expect(fetchStub.firstCall.args[1].headers.has('X-Transmission-Session-Id')).to.be.false;
        expect(fetchStub.secondCall.args[1].headers.get('X-Transmission-Session-Id')).to.equal('abc123');
    });

    it('Gives up after a second 409', async () => {
        const fetchStub = sinon.stub(global, 'fetch')
            .resolves(jsonResponse({}, 409, {'X-Transmission-Session-Id': 'abc123'}));
        chrome.i18n.getMessage.returns('api error');

        try {
            await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');
            expect.fail('should reject');
        } catch (e) {
            expect(e.message).to.equal('api error');
        }

        expect(fetchStub.calledTwice).to.be.true;
    });

    it('Login failure', async () => {
        sinon.stub(global, 'fetch').resolves(jsonResponse({}, 401));
        chrome.i18n.getMessage.withArgs('loginError').returns('Failed to login');

        try {
            await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');
            expect.fail('should reject');
        } catch (e) {
            expect(e.message).to.equal('Failed to login');
        }
    });

    it('RPC error result', async () => {
        sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'duplicate torrent'}));
        chrome.i18n.getMessage.withArgs('torrentAddError', 'duplicate torrent').returns('Failed to add torrent. duplicate torrent');

        try {
            await instance.addTorrentUrl('https://example.com/test.torrent');
            expect.fail('should reject');
        } catch (e) {
            expect(e.message).to.equal('Failed to add torrent. duplicate torrent');
        }
    });

    it('Custom RPC URL', async () => {
        instance = new TransmissionApi({hostname: 'https://example.com:1234/custom/rpc'});
        const fetchStub = sinon.stub(global, 'fetch').resolves(jsonResponse({result: 'success'}));

        await instance.addTorrentUrl('magnet:?xt=urn:btih:abc');

        expect(fetchStub.firstCall.args[0]).to.equal('https://example.com:1234/custom/rpc');
    });
});
