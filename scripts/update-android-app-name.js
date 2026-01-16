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
        if (newName) {
            console.log('MABS 12: Identified Target Name from Plugin Variables (Your JSON APP_NAME): ' + newName);
         }

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
            if (newName) {
                console.log('MABS 12: Identified AppName from preference or the global name: ' + newName);
            }
        }

        // Clean up quotes if present (sometimes happens with CLI variables)
        if (newName) {
            newName = newName.replace(/^["']|["']$/g, '');
        }

        console.log('MABS 12: Identified Target Name: ' + newName);

        // 3. Define the possible MABS 12 path's
        const platformAndroid = path.join(projectRoot, 'platforms', 'android');
        
        // Define all possible locations MABS 12 might use
        const possiblePaths = [
            path.join(platformAndroid, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), // Modern/MABS 12
            path.join(platformAndroid, 'res', 'values', 'strings.xml'),                     // Older structure
            path.join(projectRoot, 'res', 'values', 'strings.xml')                          // Project root fallback
        ];
        let stringsPath = possiblePaths.find(p => fs.existsSync(p));
        
        if (!stringsPath) {
            console.warn('MABS 12: strings.xml not found. Checked: ' + JSON.stringify(possiblePaths));
            
            // --- NEW: LAST RESORT DEEP SEARCH ---
            console.log('MABS 12: Standard paths failed. Searching all subdirectories for strings.xml...');
            function findFileRecursively(dir, fileName) {
                const list = fs.readdirSync(dir);
                for (let file of list) {
                    file = path.join(dir, file);
                    const stat = fs.statSync(file);
                    if (stat && stat.isDirectory()) {
                        const res = findFileRecursively(file, fileName);
                        if (res) return res;
                    } else if (file.endsWith(fileName)) {
                        return file;
                    }
                }
                return null;
            }
            stringsPath = findFileRecursively(platformAndroid, 'strings.xml');
            // --- END OF DEEP SEARCH ---
        }

        if (!stringsPath) {
            console.warn('MABS 12: strings.xml could not be found anywhere in ' + platformAndroid);
            return; 
        }
        
        console.log('MABS 12: Found strings.xml at: ' + stringsPath);

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
