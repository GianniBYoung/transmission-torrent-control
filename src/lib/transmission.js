import {base64Encode} from '../util.js';

const SESSION_HEADER = 'X-Transmission-Session-Id';

export default class TransmissionApi {

    constructor({hostname, username = '', password = ''}) {
        this.hostname = hostname;
        this.username = username;
        this.password = password;
        this.session = null;
    }

    get rpcUrl() {
        if (this.hostname.endsWith('/rpc') || this.hostname.endsWith('/rpc/'))
            return this.hostname;

        return this.hostname + 'transmission/rpc';
    }

    get authHeader() {
        if (!this.username && !this.password)
            return null;

        // btoa only accepts latin1, so encode credentials as UTF-8 bytes first
        const bytes = new TextEncoder().encode(this.username + ':' + this.password);

        return 'Basic ' + btoa(String.fromCharCode(...bytes));
    }

    /**
     * Sends an RPC request, retrying once with a fresh session id on 409.
     */
    async rpc(method, args = {}, retry = true) {
        const headers = new Headers({'Content-Type': 'application/json'});

        if (this.session)
            headers.append(SESSION_HEADER, this.session);

        if (this.authHeader)
            headers.append('Authorization', this.authHeader);

        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({method: method, arguments: args}),
        });

        if (response.status === 409 && retry && response.headers.has(SESSION_HEADER)) {
            this.session = response.headers.get(SESSION_HEADER);

            return this.rpc(method, args, false);
        }

        if (response.status === 401)
            throw new Error(chrome.i18n.getMessage('loginError'));

        if (!response.ok)
            throw new Error(chrome.i18n.getMessage('apiError', response.status.toString() + ': ' + response.statusText));

        const json = await response.json();

        if (json.result !== 'success')
            throw new Error(chrome.i18n.getMessage('torrentAddError', json.result || ''));

        return json.arguments;
    }

    async addTorrent(torrent, options = {}) {
        return this.rpc('torrent-add', {
            metainfo: await base64Encode(torrent),
            ...this.buildArguments(options),
        });
    }

    addTorrentUrl(url, options = {}) {
        return this.rpc('torrent-add', {
            filename: url,
            ...this.buildArguments(options),
        });
    }

    buildArguments({paused, path, labels}) {
        const args = {};

        if (paused)
            args.paused = true;

        if (path)
            args['download-dir'] = path;

        if (labels && labels.length)
            args.labels = labels;

        return args;
    }
}
