#!/usr/bin/env node

const fs = require('fs');
const path = require("path");
const xml2js = require('xml2js');

module.exports = function (context) {
    // Only run for Android
    if (context.opts.platforms.indexOf('android') === -1) return;

    console.log('MABS 12: Starting App Name Update Hook');

    const projectRoot = context.opts.projectRoot;
    const parser = new xml2js.Parser();
    const builder = new xml2js.Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8' }
    });

    // 1. Get ConfigParser safely
    let ConfigParser;
    try {
        // Modern Cordova/MABS way
        ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
    } catch (e) {
        try {
            ConfigParser = require('cordova-common').ConfigParser;
        } catch (e2) {
            console.error('MABS 12: Could not load ConfigParser');
            return;
        }
    }

    // 2. Locate the global config.xml to get the 'AppName' preference
    const globalConfigPath = path.join(projectRoot, 'config.xml');
    if (!fs.existsSync(globalConfigPath)) {
        console.error('MABS 12: global config.xml not found at ' + globalConfigPath);
        return;
    }

    const cfg = new ConfigParser(globalConfigPath);
    const newDisplayName = cfg.getPreference('AppName');

    if (!newDisplayName) {
        console.log('MABS 12: No "AppName" preference found in config.xml. Skipping.');
        return;
    }

    // 3. Locate strings.xml (Path is different in MABS 12/Android 12+)
    const platformAndroid = path.join(projectRoot, 'platforms', 'android');
    const stringsPaths = [
        path.join(platformAndroid, 'app', 'src', 'main', 'res', 'values', 'strings.xml'),
        path.join(platformAndroid, 'res', 'values', 'strings.xml') // Fallback
    ];

    let stringsXmlPath = null;
    for (const p of stringsPaths) {
        if (fs.existsSync(p)) {
            stringsXmlPath = p;
            break;
        }
    }

    if (!stringsXmlPath) {
        console.error('MABS 12: Could not find strings.xml in expected locations.');
        return;
    }

    // 4. Update the XML
    try {
        const rawXml = fs.readFileSync(stringsXmlPath, 'utf-8');
        parser.parseString(rawXml, (err, result) => {
            if (err) {
                console.error('MABS 12: Error parsing strings.xml: ' + err);
                return;
            }

            let modified = false;
            if (result && result.resources && result.resources.string) {
                result.resources.string.forEach((s) => {
                    if (s.$.name === 'app_name') {
                        console.log(`MABS 12: Changing app_name from "${s._}" to "${newDisplayName}"`);
                        s._ = newDisplayName;
                        modified = true;
                    }
                });
            }

            if (modified) {
                const outputXml = builder.buildObject(result);
                fs.writeFileSync(stringsXmlPath, outputXml);
                console.log('MABS 12: strings.xml updated successfully.');
            } else {
                console.warn('MABS 12: "app_name" key not found in strings.xml');
            }
        });
    } catch (err) {
        console.error('MABS 12: Critical error during file processing: ' + err.message);
    }
};
