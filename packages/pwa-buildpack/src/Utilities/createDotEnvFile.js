const wordwrap = require('word-wrap');
const loadEnvironment = require('./loadEnvironment');
const prettyLogger = require('../util/pretty-logger');

const buildpackVersion = require('../../package.json').version;
const LINE_PREFIX = '#   ';
const MAX_WIDTH = 80;

// All environment variables Buildpack and PWA Studio use should be defined in
// envVarDefinitions.json, along with recent changes to those vars for logging.
const { sections } = require('../../envVarDefinitions.json');

const blankline = '#\n';
const hashes = length => Array.from({ length }, () => '#').join('');
const endSection = hashes(MAX_WIDTH) + '\n';
const startSection = (label, offset) => {
    const start = `${hashes(offset)} ${label} `;
    return start + hashes(MAX_WIDTH - start.length) + '\n';
};

const graf = txt =>
    wordwrap(txt, {
        indent: LINE_PREFIX,
        width: MAX_WIDTH - LINE_PREFIX.length - 1
    }) + '\n';
const paragraphs = (...grafs) => grafs.map(graf).join(blankline);

module.exports = function printEnvFile(
    useEnv = process.env,
    log = prettyLogger
) {
    const { env, error } = loadEnvironment(useEnv, log);
    if (error) {
        log.warn(
            `The current environment is not yet valid; please edit the .env file and provide any missing variables to build the project.`
        );
    }
    let contents = startSection('PWA Studio Environment Variables', 8);
    contents += blankline;
    contents += paragraphs(
        'This file contains environment variables for a Magento PWA Studio project. PWA Studio uses environment variables for all variable cross-project values, so that a developer or a build system can override any variable with standard tools.',
        'This file belongs at the root of the PWA, and must be named `.env`. Uncomment and modify variable declarations in this file and they will take effect throughout the Buildpack tool chain.',
        `Generated by @magento/pwa-buildpack v${buildpackVersion} on ${new Date().toISOString()}.`
    );
    contents += blankline + endSection;
    for (const section of sections) {
        contents += '\n' + startSection(section.name, 4) + blankline;
        for (const variable of section.variables) {
            const isSet = env.hasOwnProperty(variable.name);
            const currentValue = isSet ? env[variable.name] : '';
            const hasDefault = variable.hasOwnProperty('default');
            const isSetCustom = isSet && currentValue !== variable.default;
            const isUnsetButRequired = !isSet && !hasDefault;
            const shouldSetInEnv = isSetCustom || isUnsetButRequired;

            contents += graf(variable.desc);

            if (variable.example) {
                contents += graf(`- Example: ${variable.example}`);
            }
            if (hasDefault) {
                contents += graf(`- Default when not set: ${variable.default}`);
            }
            if (shouldSetInEnv) {
                contents += `${variable.name}=${currentValue}\n`;
            } else {
                // Print this line as an example of how to set the variable, but
                // comment it out so that future versions can inherit changed
                // default settings.
                contents += `#${variable.name}=${variable.default || ''}\n`;
            }
            contents += blankline;
        }
        contents += endSection;
    }

    return contents;
};
