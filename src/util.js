export const defaultOptions = () => ({
    hostname: '',
    username: '',
    password: '',
    labels: [],
    directories: [],
    // Label combinations, one comma-separated string each
    presets: [],
    // Sticky context menu selections
    selectedLabels: [],
    directory: null,
    addPaused: false,
    notifications: true,
});

const optionKeys = Object.keys(defaultOptions());

// Converts the old {globals, servers: [...]} layout to the flat one
const migrateLegacyOptions = (stored) => {
    const globals = stored.globals || {};
    const server = (stored.servers && stored.servers[0]) || {};
    const defaultLabel = server.defaultLabel;

    return {
        hostname: server.hostname,
        username: server.username,
        password: server.password,
        labels: globals.labels,
        directories: server.directories,
        selectedLabels: Array.isArray(defaultLabel) ? defaultLabel : (defaultLabel ? [defaultLabel] : undefined),
        directory: server.defaultDirectory,
        addPaused: globals.addPaused,
        notifications: globals.enableNotifications,
    };
}

const isValidValue = (value, defaultValue) => {
    if (Array.isArray(defaultValue))
        return Array.isArray(value) && value.every((item) => typeof item === 'string');

    // Only `directory` defaults to null, and it holds a string
    if (defaultValue === null)
        return typeof value === 'string';

    return typeof value === typeof defaultValue;
}

/**
 * Fills in defaults and drops unknown or wrongly typed keys. Accepts the legacy layout too.
 */
export const normalizeOptions = (source) => {
    const options = defaultOptions();
    const flat = source.servers ? migrateLegacyOptions(source) : source;

    optionKeys.forEach((key) => {
        if (isValidValue(flat[key], options[key]))
            options[key] = flat[key];
    });

    return options;
}

export const serializeOptions = (options) => {
    return JSON.stringify(normalizeOptions(options), null, 2);
}

export const parseOptions = (text) => {
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Not a settings object');

    if (!parsed.servers && !optionKeys.some((key) => key in parsed))
        throw new Error('No known settings found');

    return normalizeOptions(parsed);
}

export const loadOptions = () => {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (stored) => {
            const options = normalizeOptions(stored || {});

            if (stored && stored.servers) {
                chrome.storage.local.remove(['globals', 'servers']);
                chrome.storage.local.set(options);
            }

            resolve(options);
        });
    });
}

export const saveOptions = (options) => {
    return chrome.storage.local.set(options);
}

/**
 * Selections are stored by value, so drop any that no longer exist in the options.
 */
export const getActiveSelection = (options) => ({
    labels: options.selectedLabels.filter((label) => options.labels.includes(label)),
    path: options.directories.includes(options.directory) ? options.directory : null,
    paused: options.addPaused,
});

export const parsePreset = (preset) => {
    return preset.split(',')
        .map((label) => label.trim())
        .filter((label) => label.length);
}

export const isMagnetUrl = (url) => {
    return url.startsWith('magnet:');
}

export const getMagnetUrlName = (url) => {
    const match = url.match(/^magnet:(.+)$/);
    const params = new URLSearchParams(match ? match[1] : '');

    return (params.has('dn') ? params.get('dn') : false);
}

export const getTorrentName = (data) => {
    return new Promise((resolve) => {
        let reader = new FileReader();
        reader.onerror = () => resolve(false);
        reader.onload = () => {
            const offset = reader.result.match(/name(\d+):/) || false;
            let text = false;

            if (offset) {
                const index = offset.index + offset[0].length;
                let bytes = 0;
                text = '';

                while (bytes < offset[1]) {
                    let char = reader.result.charAt(index + text.length);

                    text += char;
                    bytes += unescape(encodeURI(char)).length;
                }
            }

            resolve(text);
        };
        reader.readAsText(data);
    });
}

export const base64Encode = (data) => {
    return new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onerror = (error) => reject(error);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(data);
    });
}

export const getHostFilter = (hostname) => {
    const url = new URL(hostname);

    return `${url.protocol}//${url.hostname}/*`;
}
