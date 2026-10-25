import TransmissionApi from './lib/transmission.js';
import {
    loadOptions,
    saveOptions,
    isMagnetUrl,
    getHostFilter,
    getTorrentName,
    getMagnetUrlName,
    parsePreset,
    getActiveSelection,
} from './util.js';

let options;

const isConfigured = () => !!(options && options.hostname);

export const buildMenuItems = (options) => {
    const {labels, path} = getActiveSelection(options);
    const summary = [...labels];

    if (path)
        summary.push(path);

    const items = [{
        id: 'add-torrent',
        title: chrome.i18n.getMessage('addTorrentAction') + (summary.length ? ' (' + summary.join(', ') + ')' : ''),
        contexts: ['link'],
    }];

    options.presets.forEach((preset, i) => items.push({
        id: 'preset-' + i,
        title: chrome.i18n.getMessage('addTorrentPresetAction', parsePreset(preset).join(' + ')),
        contexts: ['link'],
    }));

    items.push({
        id: 'separator',
        type: 'separator',
        contexts: ['link'],
    });

    if (options.labels.length) {
        items.push({
            id: 'labels',
            title: chrome.i18n.getMessage('labelsMenu'),
            contexts: ['link'],
        });

        options.labels.forEach((label, i) => items.push({
            id: 'label-' + i,
            parentId: 'labels',
            type: 'checkbox',
            checked: labels.includes(label),
            title: label,
            contexts: ['link'],
        }));
    }

    if (options.directories.length) {
        items.push({
            id: 'directories',
            title: chrome.i18n.getMessage('directoryMenu'),
            contexts: ['link'],
        }, {
            id: 'directory-default',
            parentId: 'directories',
            type: 'radio',
            checked: path === null,
            title: chrome.i18n.getMessage('defaultOption'),
            contexts: ['link'],
        });

        options.directories.forEach((directory, i) => items.push({
            id: 'directory-' + i,
            parentId: 'directories',
            type: 'radio',
            checked: directory === path,
            title: directory,
            contexts: ['link'],
        }));
    }

    items.push({
        id: 'add-paused',
        type: 'checkbox',
        checked: options.addPaused,
        title: chrome.i18n.getMessage('addPausedOption'),
        contexts: ['link'],
    });

    return items;
}

// Serialize rebuilds so removeAll can't race with a previous create
let menuQueue = Promise.resolve();

const refreshMenu = () => {
    menuQueue = menuQueue
        .then(() => new Promise((resolve) => chrome.contextMenus.removeAll(resolve)))
        .then(() => {
            if (isConfigured())
                buildMenuItems(options).forEach((item) => chrome.contextMenus.create(item));
        });
}

const handleMenuClick = (info, tab) => {
    const id = String(info.menuItemId);
    const labelId = id.match(/^label-(\d+)$/);
    const directoryId = id.match(/^directory-(\d+)$/);
    const presetId = id.match(/^preset-(\d+)$/);

    if (id === 'add-torrent') {
        addTorrent(info.linkUrl, tab ? tab.id : null);
    } else if (presetId) {
        addTorrent(info.linkUrl, tab ? tab.id : null, parsePreset(options.presets[~~presetId[1]]));
    } else if (labelId) {
        const label = options.labels[~~labelId[1]];
        const selected = options.selectedLabels.filter((l) => l !== label);

        if (info.checked)
            selected.push(label);

        saveOptions({selectedLabels: selected});
    } else if (id === 'directory-default') {
        saveOptions({directory: null});
    } else if (directoryId) {
        saveOptions({directory: options.directories[~~directoryId[1]]});
    } else if (id === 'add-paused') {
        saveOptions({addPaused: info.checked});
    }
}

/**
 * @param labels {string[]|null} overrides the selected labels when given
 */
const addTorrent = async (url, tabId, labels = null) => {
    const connection = new TransmissionApi(options);
    const torrentOptions = getActiveSelection(options);

    if (labels)
        torrentOptions.labels = labels;

    try {
        let torrentName;

        if (isMagnetUrl(url)) {
            torrentName = getMagnetUrlName(url);
            await connection.addTorrentUrl(url, torrentOptions);
        } else {
            const result = await fetchTorrent(url, tabId);
            torrentName = result.torrentName;
            await connection.addTorrent(result.torrent, torrentOptions);
        }

        notification(chrome.i18n.getMessage('torrentAddedNotification') + (torrentName ? ' ' + torrentName : ''));
    } catch (error) {
        if (error.message === 'NetworkError when attempting to fetch resource.')
            notification('❌ ' + chrome.i18n.getMessage('torrentAddError', 'Network error'));
        else
            notification('❌ ' + error.message);
    }
}

/**
 * Downloads the torrent from inside the source tab so site cookies are sent along.
 */
export const fetchTorrent = (url, tabId) => {
    return new Promise(async (resolve, reject) => {
        if (tabId === null || await tabExists(tabId) === false) {
            return reject(new Error(chrome.i18n.getMessage('sourceTabDestroyedError')));
        }

        chrome.tabs.sendMessage(tabId, {
            type: 'fetchTorrent',
            url: url,
        }, (response) => {
            if (!response)
                return reject(new Error(chrome.i18n.getMessage('torrentFetchError', 'No response from page')));

            if (response.error)
                return reject(new Error(response.error));

            if (!response.ok)
                return reject(new Error(chrome.i18n.getMessage('torrentFetchError', response.status.toString() + ': ' + response.statusText)));

            if (response.content.type !== '' && !response.content.type.match(/(application\/x-bittorrent|application\/octet-stream)/gi))
                return reject(new Error(chrome.i18n.getMessage('torrentParseError', 'Unknown type: ' + response.content.type)));

            getTorrentName(response.content).then((name) => resolve({
                torrent: response.content,
                torrentName: name,
            }));
        });
    });
}

/**
 * @param tabId {number}
 * @returns {Promise<boolean>}
 */
const tabExists = (tabId) => {
    return new Promise((resolve) => {
        chrome.tabs.get(tabId, (tab) => resolve(tab !== undefined));
    });
}

const notification = (message) => {
    if (options && !options.notifications) {
        return;
    }

    chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon/default-48.png'),
        title: 'Transmission Torrent Control',
        message: message
    }, (id) => setTimeout(() => chrome.notifications.clear(id), 5000));
}

/**
 * Opens the web UI, answering its HTTP auth prompt with the stored credentials.
 */
const openWebUi = async () => {
    if (!isConfigured()) {
        chrome.runtime.openOptionsPage();

        return;
    }

    const {hostname, username, password} = options;

    const tab = await new Promise((resolve) => {
        chrome.tabs.create({
            url: hostname,
        }, (tab) => resolve(tab));
    });

    if (!username && !password) {
        return;
    }

    const filter = {
        urls: [getHostFilter(hostname)],
        tabId: tab.id,
    };
    let pendingRequests = [];

    const onAuthRequiredListener = (details) => {
        // Answer once per request so wrong credentials don't loop forever
        if (pendingRequests.includes(details.requestId)) {
            return;
        }

        pendingRequests.push(details.requestId);

        return {
            authCredentials: {
                username: username,
                password: password,
            },
        };
    };

    const onAuthCompletedListener = (details) => {
        pendingRequests = pendingRequests.filter((id) => id !== details.requestId);
    };

    const onTabRemovedListener = (tabId) => {
        if (tabId !== tab.id) {
            return;
        }

        chrome.webRequest.onAuthRequired.removeListener(onAuthRequiredListener);
        chrome.webRequest.onCompleted.removeListener(onAuthCompletedListener);
        chrome.webRequest.onErrorOccurred.removeListener(onAuthCompletedListener);
        chrome.tabs.onRemoved.removeListener(onTabRemovedListener);
    };

    chrome.webRequest.onAuthRequired.addListener(onAuthRequiredListener, filter, ['blocking']);
    chrome.webRequest.onCompleted.addListener(onAuthCompletedListener, filter);
    chrome.webRequest.onErrorOccurred.addListener(onAuthCompletedListener, filter);
    chrome.tabs.onRemoved.addListener(onTabRemovedListener);
}

chrome.storage.onChanged.addListener((changes) => {
    if (!options)
        return;

    Object.keys(changes)
        .filter((key) => key in options)
        .forEach((key) => options[key] = changes[key].newValue);
    refreshMenu();
});

// Left click opens the popup; Firefox still fires onClicked for middle click
const handleToolbarClick = (tab, clickData) => {
    if (clickData && clickData.button === 1)
        openWebUi();
}

chrome.contextMenus.onClicked.addListener(handleMenuClick);
chrome.browserAction.onClicked.addListener(handleToolbarClick);

chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'openWebUi')
        openWebUi();
});

loadOptions().then((loadedOptions) => {
    options = loadedOptions;
    refreshMenu();
});
