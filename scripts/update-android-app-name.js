#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

module.exports = function (context) {
    if (context.opts.platforms.indexOf('android') === -1) return;

    console.log('MABS 12: Starting App Name update hook...');

    try {
        const projectRoot = context.opts.projectRoot;
        
        // 1. Get the name from Plugin Variables (Your JSON APP_NAME)
        // In Cordova hooks, variables are passed in the context.opts.cli_variables
        let newName = (context.opts.cli_variables && context.opts.cli_variables.APP_NAME);

        // 2. If not in CLI variables, try to parse it from config.xml
        if (!newName) {
            let ConfigParser;
            try {
                ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
            } catch (e) {
                ConfigParser = require('cordova-common').ConfigParser;
            }
            const cfg = new ConfigParser(path.join(projectRoot, 'config.xml'));
            
            // Try AppName preference or the global name
            newName = cfg.getPreference('AppName') || cfg.name();
        }

        // Clean up quotes if present (sometimes happens with CLI variables)
        if (newName) {
            newName = newName.replace(/^["']|["']$/g, '');
        }

        console.log('MABS 12: Identified Target Name: ' + newName);

        // 3. Define the precise MABS 12 path
        const stringsPath = path.join(projectRoot, 'platforms', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');

        if (!fs.existsSync(stringsPath)) {
            console.warn('MABS 12: strings.xml not found at: ' + stringsPath);
            return;
        }

        // 4. Update the name using Regex (Bulletproof for Node 22)
        let content = fs.readFileSync(stringsPath, 'utf8');
        const regex = /(<string name="app_name">)(.*?)(<\/string>)/;
        
        if (regex.test(content)) {
            const updatedContent = content.replace(regex, '$1' + newName + '$3');
            fs.writeFileSync(stringsPath, updatedContent, 'utf8');
            console.log('MABS 12: Successfully updated strings.xml to: ' + newName);
        } else {
            console.warn('MABS 12: Tag <string name="app_name"> not found in strings.xml');
        }

    } catch (err) {
        console.error('MABS 12: Hook failed with error: ' + err.message);
    }
};
