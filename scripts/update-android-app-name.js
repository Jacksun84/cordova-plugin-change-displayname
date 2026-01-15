#!/usr/bin/env node

var fs = require('fs');
var path = require("path");
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var builder = new xml2js.Builder({
    xmldec: {
        version: '1.0',
        encoding: 'UTF-8'
    }
});

module.exports = function (context) {
    // Only run for Android
    if (context.opts.platforms.indexOf('android') === -1) return;

    console.log('MABS 12: Attempting to set app name for android');

    var projectRoot = context.opts.projectRoot;
    
    // Modern Cordova uses 'cordova-common' which should be required normally
    var ConfigParser;
    try {
        ConfigParser = require('cordova-common').ConfigParser;
    } catch (e) {
        // Fallback for older environments if necessary
        ConfigParser = context.requireCordovaModule('cordova-common/src/ConfigParser/ConfigParser');
    }

    // Identify paths
    const platformRoot = path.join(projectRoot, 'platforms', 'android');
    const usesNewStructure = fs.existsSync(path.join(platformRoot, 'app'));
    
    const basePath = usesNewStructure ? path.join(platformRoot, 'app', 'src', 'main') : platformRoot;
    
    // In MABS/Cordova, the global config.xml is in the project root
    var globalConfigPath = path.join(projectRoot, 'config.xml');
    var stringsPath = path.join(basePath, 'res', 'values', 'strings.xml');

    if (!fs.existsSync(globalConfigPath)) {
        console.error('Could not find global config.xml');
        return;
    }

    var cfg = new ConfigParser(globalConfigPath);
    var name = cfg.getPreference('AppName');

    if (name && fs.existsSync(stringsPath)) {
        var stringsXml = fs.readFileSync(stringsPath, 'UTF-8');
        
        parser.parseString(stringsXml, function (err, data) {
            if (err) {
                console.error('Error parsing strings.xml: ' + err);
                return;
            }

            if (data && data.resources && data.resources.string) {
                var found = false;
                data.resources.string.forEach(function (string) {
                    if (string.$.name === 'app_name') {
                        console.log('Setting Android App Name to: ' + name);
                        string._ = name;
                        found = true;
                    }
                });

                if (found) {
                    var xml = builder.buildObject(data);
                    fs.writeFileSync(stringsPath, xml);
                    console.log('strings.xml updated successfully');
                }
            }
        });
    } else {
        console.log('No AppName preference found or strings.xml missing at ' + stringsPath);
    }
};
