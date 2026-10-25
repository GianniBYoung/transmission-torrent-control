import {
    loadOptions,
    saveOptions,
    serializeOptions,
    parseOptions,
    parsePreset,
} from '../util.js';

const saveButton = document.querySelector('#save-options');
const importFile = document.querySelector('#import-file');

const splitLines = (value) => value.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length);

const normalizeHostname = (value) => value.replace(/\s+/g, '').replace(/\/?$/, '/');

const isValidUrl = (str) => {
    try {
        new URL(str);
    } catch (e) {
        return false;
    }
    return true;
}

const fillForm = (options) => {
    document.querySelector('#hostname').value = options.hostname;
    document.querySelector('#username').value = options.username;
    document.querySelector('#password').value = options.password;
    document.querySelector('#directories').value = options.directories.join('\n');
    document.querySelector('#labels').value = options.labels.join('\n');
    document.querySelector('#presets').value = options.presets.join('\n');
    document.querySelector('#notifications').checked = options.notifications;

    saveButton.setAttribute('disabled', 'true');
}

const readForm = () => ({
    hostname: normalizeHostname(document.querySelector('#hostname').value),
    username: document.querySelector('#username').value,
    password: document.querySelector('#password').value,
    directories: splitLines(document.querySelector('#directories').value),
    labels: splitLines(document.querySelector('#labels').value),
    presets: splitLines(document.querySelector('#presets').value)
        .map((preset) => parsePreset(preset).join(', '))
        .filter((preset) => preset.length),
    notifications: document.querySelector('#notifications').checked,
});

const exportOptions = async () => {
    const blob = new Blob([serializeOptions(await loadOptions())], {type: 'application/json'});
    const link = document.createElement('a');

    link.href = URL.createObjectURL(blob);
    link.download = 'transmission-torrent-control-settings.json';
    link.click();

    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

const importOptions = async (file) => {
    try {
        const options = parseOptions(await file.text());

        await saveOptions(options);
        fillForm(await loadOptions());
    } catch (e) {
        alert(chrome.i18n.getMessage('importError', e.message));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
    });

    document.querySelectorAll('textarea, input').forEach((element) => {
        element.addEventListener('input', () => saveButton.removeAttribute('disabled'), {passive: true});
    });

    loadOptions().then(fillForm);
});

document.querySelector('#hostname').addEventListener('input', (e) => {
    e.target.style.borderColor = isValidUrl(normalizeHostname(e.target.value)) ? '' : 'red';
});

saveButton.addEventListener('click', (e) => {
    e.preventDefault();

    const options = readForm();

    if (!isValidUrl(options.hostname)) {
        alert(chrome.i18n.getMessage('invalidAddressError'));

        return;
    }

    saveOptions(options);
    saveButton.setAttribute('disabled', 'true');
});

document.querySelector('#export-options').addEventListener('click', (e) => {
    e.preventDefault();
    exportOptions();
});

document.querySelector('#import-options').addEventListener('click', (e) => {
    e.preventDefault();
    importFile.click();
});

importFile.addEventListener('change', () => {
    if (importFile.files.length)
        importOptions(importFile.files[0]);

    importFile.value = '';
});
