/*jslint node:true, nomen:true, unparam: true */
'use strict';

var express = require('express'),
    enrouten = require('express-enrouten'),
    swaggerDocs = require('../lib'),
    app = express(),
    routerFolder = './controllers',
    server;

app.use(swaggerDocs({
    directory: routerFolder,
    corsOrigin: true
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