/*jslint node:true, nomen:true, unparam: true */
'use strict';

var express = require('express'),
    enrouten = require('express-enrouten'),
    swaggerDocs = require('../lib'),
    app = express(),
    routerFolder = './controllers',
    server;

app.use(swaggerDocs({
    path: '/docs',
    directory: routerFolder,
    templateFiles: '',
    requestHandler: function (req, res, next) {
        var self = this,
            data = self.data;

        res.json(data);
    }
}));

app.use(enrouten({
    directory: routerFolder
}));

server = app.listen('8000', function onServerStarted(err) {
    if (err) {
        throw err;
    }
});

module.exports = server;