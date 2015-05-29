/*jslint node:true, nomen:true, unparam:true */
'use strict';

var path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    doctrine = require('doctrine'),
    async = require('async'),
    yaml = require('js-yaml'),
    merge = require('merge'),
    Obj;

Obj = function (opts) {
    var self = this;

    self.directory = opts.directory;
    self.path = opts.path;
    self.requestHandler = (typeof opts.requestHandler === 'function' && opts.requestHandler) || null;
    self.corsOrigin = (opts.corsOrigin === true ? '*' : opts.corsOrigin);

    self.apiDoc = {
        swagger: '2.0',
        info: {
            title: null,
            version: null
        },
        paths: {}
    };

    self.parseControllers();
};

// folder where we can find the controllers
Obj.prototype.directory = null;
Obj.prototype.path = null;
Obj.prototype.requestHandler = null;

Obj.prototype.resources = null;
Obj.prototype.apis = null;


Obj.prototype.parseControllers = function (dir) {
    var self = this;

    dir = dir || self.directory;
    assert(dir, 'Missing directory option');

    fs.readdir(dir, function (err, files) {
        assert.ifError(err);

        files.forEach(function (filename) {
            if ((/\.js$/).test(filename)) {
                self.readAnnotations(path.join(dir, filename), function (err, docs) {
                    assert.ifError(err);

                    self.buildDocs(docs);
                });
            } else if (filename.indexOf('.') === -1) {
                // if it's not a js file and has no '.' in the name
                // hopefully it's a folder
                self.parseControllers(path.join(dir, filename));
            }
        });
    });
};

Obj.prototype.readAnnotations = function (file, fn) {
    fs.readFile(file, function (err, data) {
        if (err) {
            fn(err);
        }

        var js = data.toString(),
            regex = /\/\*\*([\s\S]*?)\*\//gm,
            fragments = js.match(regex),
            docs = [],
            i,
            fragment,
            doc;

        if (!fragments) {
            fn(null, docs);
            return;
        }

        for (i = 0; i < fragments.length; i += 1) {
            fragment = fragments[i];
            doc = doctrine.parse(fragment, {
                unwrap: true
            });

            docs.push(doc);

            if (i === fragments.length - 1) {
                fn(null, docs);
            }
        }
    });
};

Obj.prototype.buildDocs = function (fragments) {
    var self = this,
        fn;

    fragments.forEach(function (fragment) {
        fragment.tags.forEach(function (tag) {
            if (/^Swagger[a-zA-Z]+/.test(tag.title)) {
                fn = self['parse' + tag.title];
                assert.equal(typeof fn, 'function', 'Invalid Section ' + tag.title);
                yaml.safeLoadAll(tag.description, fn.bind(self));
            }
        });
    });
};

Obj.prototype.parseSwaggerHeader = function (data) {
    var self = this;
    merge(self.apiDoc, data);
};
Obj.prototype.parseSwaggerTag = function (data) {
    var self = this,
        tags;

    if (!self.apiDoc.tags || !self.apiDoc.tags.length) {
        self.apiDoc.tags = [];
    }
    tags = self.apiDoc.tags;

    Object.keys(data).forEach(function (tagName) {
        var hasTag,
            newTag;

        hasTag = tags.some(function (item) {
            return (tagName === item.name);
        });

        if (!hasTag) {
            newTag = data[tagName];
            newTag.name = tagName;
            tags.push(newTag);
        }
    });
};
Obj.prototype.parseSwaggerPath = function (data) {};

Obj.prototype.handler = function (req, res, next) {
    var self = this,
        isDocReq = new RegExp('^' + self.path).test(req.url),
        isGET = req.method.toUpperCase() === 'GET' || req.method.toUpperCase() === 'HEAD',
        p = req.url.replace(self.path, '').replace(/\/$/, ''),
        context = {
            isIndex: false,
            data: null
        };

    if (!isDocReq || !isGET) {
        return next();
    }

    if (p === '') {
        context.isIndex = true;
        context.data = self.apis;
    } else {
        context.data = self.resources[p];

        if (!context.data) {
            return next();
        }
    }

    if (self.requestHandler) {
        context.render = function (data) {
            self.render(data || context.data, res);
        };

        self.requestHandler.bind(context).call(req, res, next);
    } else {
        self.render(context.data, res);
    }
};

Obj.prototype.render = function (data, res) {
    res.json(data);
};

module.exports = function (opts) {
    var obj = new Obj(opts);

    return obj.handler.bind(obj);
};