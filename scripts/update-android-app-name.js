#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    if (context.opts.platforms.indexOf('android') === -1) return;

    console.log('MABS 12: Starting App Name update hook...');

    try {
        const projectRoot = context.opts.projectRoot;
        
        // 1. Get ConfigParser
        let ConfigParser;
        try {
            ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
        } catch (e) {
            ConfigParser = require('cordova-common').ConfigParser;
        }
        const cfg = new ConfigParser(path.join(projectRoot, 'config.xml'));

        // 2. Identify the Name
        // Check Preference first
        let newName = cfg.getPreference('AppName');
        if (newName) {
            console.log('MABS 12: Identified Target Name from Preferences Variables (Your JSON APP_NAME): ' + newName);
         }

        // Check if we got the raw variable placeholder instead of the value
        if (!newName || newName.indexOf('$') !== -1) {
            console.log('MABS 12: Preference AppName is empty or unresolved. Checking CLI variables...');
            newName = (context.opts.cli_variables && context.opts.cli_variables.APP_NAME);
            if (newName) {
                console.log('MABS 12: Identified AppName from CLI variables: ' + newName);
            }
        }

        // Clean up quotes if present
        if (newName) {
            newName = newName.replace(/^["']|["']$/g, '');
        }

        // CRITICAL CHECK: Prevent "Sapphire Care" fallback
        if (!newName || newName === "Sapphire Care") {
            // As a last resort, we check the global name, but if it's the wrong one, we stop.
            const globalName = cfg.name();
            if (globalName !== "Sapphire Care") {
                newName = globalName;
                if (newName) {
                    console.log('MABS 12: Identified AppName from global name: ' + newName);
                }
            } else {
                console.warn('MABS 12: Could not find other APP_NAME than "Sapphire Care". Current found name is "' + newName + '". Aborting to avoid wrong name.');
            }
        }

        console.log('MABS 12: Target Display Name identified as: ' + newName);

        // 3. Identify the Path (Your suggested verification logic)
        const platformAndroid = path.join(projectRoot, 'platforms', 'android');
        const usesNewStructure = fs.existsSync(path.join(platformAndroid, 'app'));
        
        const basePath = usesNewStructure 
            ? path.join(platformAndroid, 'app', 'src', 'main') 
            : platformAndroid;
        
        const stringsPath = path.join(basePath, 'res', 'values', 'strings.xml');

        if (!fs.existsSync(stringsPath)) {
            console.warn('MABS 12: strings.xml not found at: ' + stringsPath);
            return;
        }
         console.log('MABS 12: Found strings.xml at: ' + stringsPath);

        // 4. Update the name using Regex
        let content = fs.readFileSync(stringsPath, 'utf8');
        const regex = /(<string name="app_name">)(.*?)(<\/string>)/;
        
        if (regex.test(content)) {
            const updatedContent = content.replace(regex, '$1' + newName + '$3');
            fs.writeFileSync(stringsPath, updatedContent, 'utf8');
            console.log('MABS 12: Successfully updated strings.xml to: ' + newName);
        } else {
            console.warn('MABS 12: The tag <string name="app_name"> was not found in the file.');
        }

    } catch (err) {
        console.error('MABS 12: Hook failed with error: ' + err.message);
    }
};
