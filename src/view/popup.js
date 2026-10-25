import {
    loadOptions,
    saveOptions,
    getActiveSelection,
} from '../util.js';

let options;

const createOption = (type, name, value, checked, text, onChange) => {
    const label = document.createElement('label');
    const input = document.createElement('input');
    const span = document.createElement('span');

    input.type = type;
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.addEventListener('change', onChange);
    span.textContent = text;

    label.append(input, span);

    return label;
}

const render = () => {
    const configured = !!options.hostname;

    document.querySelector('#configured').hidden = !configured;
    document.querySelector('#unconfigured').hidden = configured;
    document.querySelector('#open-webui').disabled = !configured;

    if (!configured)
        return;

    const {labels, path} = getActiveSelection(options);

    const labelList = document.querySelector('#labels');
    labelList.replaceChildren(...options.labels.map((label) => createOption(
        'checkbox', 'label', label, labels.includes(label), label,
        (e) => {
            const selected = getActiveSelection(options).labels.filter((l) => l !== label);

            if (e.target.checked)
                selected.push(label);

            options.selectedLabels = selected;
            saveOptions({selectedLabels: selected});
        },
    )));

    if (!options.labels.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = chrome.i18n.getMessage('noLabelsText');
        labelList.append(empty);
    }

    document.querySelector('#clear-labels').hidden = !options.labels.length;

    document.querySelector('#directories-section').hidden = !options.directories.length;
    document.querySelector('#directories').replaceChildren(
        ...[null, ...options.directories].map((directory) => createOption(
            'radio', 'directory', directory || '', directory === path,
            directory || chrome.i18n.getMessage('defaultOption'),
            () => {
                options.directory = directory;
                saveOptions({directory: directory});
            },
        )),
    );

    document.querySelector('#add-paused').checked = options.addPaused;
}

document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = chrome.i18n.getMessage(element.getAttribute('data-i18n'));
});

document.querySelector('#clear-labels').addEventListener('click', () => {
    options.selectedLabels = [];
    saveOptions({selectedLabels: []});
    render();
});

document.querySelector('#add-paused').addEventListener('change', (e) => {
    options.addPaused = e.target.checked;
    saveOptions({addPaused: e.target.checked});
});

document.querySelector('#open-webui').addEventListener('click', () => {
    chrome.runtime.sendMessage({type: 'openWebUi'});
    window.close();
});

document.querySelector('#open-settings').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
    window.close();
});

loadOptions().then((loadedOptions) => {
    options = loadedOptions;
    render();
});
