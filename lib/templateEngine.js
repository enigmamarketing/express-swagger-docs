/*jslint node:true */
'use strict';

var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    dust = require('dustjs-helpers');

dust.helpers.iter = function (chunk, context, bodies, params) {
    var obj = params['for'] || context.current(),
        k;

    for (k in obj) {
        if (obj.hasOwnProperty(k)) {
            chunk = chunk.render(bodies.block, context.push({
                key: k,
                value: obj[k]
            }));
        }
    }
    return chunk;
};

module.exports = function (templatePath) {
    function render(data, cb) {
        var tpl = 'express-swagger-docs/main.dust';
        dust.render(tpl, data, cb);
    }

    dust.onLoad = function (templateName, callback) {
        var tplPath = path.join(templatePath, templateName.replace('express-swagger-docs/', ''));

        fs.readFile(tplPath, {
            encoding: 'utf8'
        }, function (err, data) {
            assert.ifError(err);

            callback(null, data);
        });
    };

    return render;
};