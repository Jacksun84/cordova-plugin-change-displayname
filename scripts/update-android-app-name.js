#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    // 1. Only run for Android
    if (context.opts.platforms.indexOf('android') === -1) return;

    console.log('MABS 12: Starting App Name update hook...');

    try {
        const projectRoot = context.opts.projectRoot;
        
        // 2. Get ConfigParser safely from Cordova
        let ConfigParser;
        try {
            ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
        } catch (e) {
            ConfigParser = require('cordova-common').ConfigParser;
        }

        const cfg = new ConfigParser(path.join(projectRoot, 'config.xml'));
        const newName = cfg.getPreference('AppName');

        if (!newName) {
            console.log('MABS 12: No "AppName" preference found in config.xml. Skipping.');
            return;
        }

        // 3. Define the precise MABS 12 path for strings.xml
        // This is the standard location for Cordova-Android 10, 11, 12, and 13
        const stringsPath = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

        if (!fs.existsSync(stringsPath)) {
            console.warn('MABS 12: strings.xml not found at expected path: ' + stringsPath);
            // We return instead of throwing to prevent the "TypeError" build crash
            return;
        }

        // 4. Update the name using a safe String replacement
        let content = fs.readFileSync(stringsPath, 'utf8');
        
        // This regex finds <string name="app_name">VALUE</string>
        const regex = /(<string name="app_name">)(.*?)(<\/string>)/;
        
        if (regex.test(content)) {
            console.log('MABS 12: Found app_name. Changing to: ' + newName);
            const updatedContent = content.replace(regex, '$1' + newName + '$3');
            fs.writeFileSync(stringsPath, updatedContent, 'utf8');
            console.log('MABS 12: Successfully updated strings.xml');
        } else {
            console.warn('MABS 12: The tag <string name="app_name"> was not found in the file.');
        }

    } catch (err) {
        // This block catches any error and logs it without crashing the MABS build process
        console.error('MABS 12: An error occurred during the hook execution:');
        console.error(err);
    }
};
