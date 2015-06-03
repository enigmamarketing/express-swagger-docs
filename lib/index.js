/*jslint node:true, nomen:true, unparam:true */
'use strict';

var path = require('path'),
    fs = require('fs'),
    assert = require('assert'),
    doctrine = require('doctrine'),
    async = require('async'),
    yaml = require('js-yaml'),
    merge = require('merge'),
    swaggerTools = require('swagger-tools'),
    templateEngine = require('./templateEngine'),
    clone = require('clone'),
    Obj;

Obj = function (opts) {
    var self = this;

    self.directory = opts.directory;
    self.path = opts.path || '/swagger';
    self.requestHandler = (typeof opts.requestHandler === 'function' && opts.requestHandler) || null;
    self.corsOrigin = (opts.corsOrigin === true ? '*' : opts.corsOrigin);
    self.templateFiles = opts.templateFiles === undefined ? path.join(__dirname, './templates') : opts.templateFiles;

    self.apiDoc = {
        swagger: '2.0',
        info: {
            title: null,
            version: null
        },
        paths: {}
    };

    self.parseControllers();

    if (self.templateFiles) {
        self.templateEngine = templateEngine(self.templateFiles);
    }
};

// folder where we can find the controllers
Obj.prototype.directory = null;
Obj.prototype.path = null;
Obj.prototype.requestHandler = null;
Obj.prototype.corsOrigin = null;

Obj.prototype.apiDoc = null;
Obj.prototype.isSwaggerDocValid = null;


Obj.prototype.parseControllers = function (dir) {
    var self = this;

    dir = dir || self.directory;
    assert(dir, 'Missing directory option');

    fs.readdir(dir, function (err, files) {
        assert.ifError(err);

        files.forEach(function (filename) {
            // Only works with js files, for now
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

    self.isSwaggerDocValid = null;
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

    self.isSwaggerDocValid = null;
};

Obj.prototype.parseSwaggerPath = function (data) {
    var self = this;

    merge.recursive(self.apiDoc.paths, data);

    self.isSwaggerDocValid = null;
};

Obj.prototype.parseSwaggerDefinitions = function (data) {
    var self = this;

    if (!self.apiDoc.definitions) {
        self.apiDoc.definitions = {};
    }

    merge(self.apiDoc.definitions, data);

    self.isSwaggerDocValid = null;
};

Obj.prototype.validateApiDoc = function (cb) {
    var self = this,
        spec = swaggerTools.specs.v2,
        swaggerObject = self.apiDoc;

    if (self.isSwaggerDocValid) {
        return cb(true);
    }

    spec.validate(swaggerObject, function (err, result) {
        var isValid = result === undefined ? true : false;
        assert.ifError(err);

        self.isSwaggerDocValid = isValid;
        cb(isValid, result);
    });
};

// We do some of the replacements that are expected to be performed according to the spec,
// as replacing the path tags with the tag full info, populating basePath and host, merging
// path parameters with the operation ones, etc..
Obj.prototype.getExpandedApiDoc = function (req) {
    var self = this,
        data = clone(self.apiDoc),
        tagsDefinitions = {},
        paths = data.paths;

    if (!data.basePath) {
        data.basePath = '/';
    }

    if (!data.host) {
        data.host = req.hostname;
    }

    // populate tags
    if (data.tags) {
        data.tags.forEach(function (tag) {
            tagsDefinitions[tag.name] = tag;
        });

        Object.keys(paths).forEach(function (route) {
            var routeMethods = paths[route];

            Object.keys(routeMethods).forEach(function (method) {
                var tags = routeMethods[method].tags;

                if (!tags) {
                    return;
                }

                tags.forEach(function (tag, index) {
                    if (tagsDefinitions[tag] !== undefined) {
                        tags[index] = tagsDefinitions[tag];
                    } else {
                        tags[index] = {
                            name: tag
                        };
                    }
                });
            });
        });
    }

    return data;
};

Obj.prototype.handler = function (req, res, next) {
    var self = this,
        isDocReq = new RegExp('^' + self.path).test(req.url),
        isGET = req.method.toUpperCase() === 'GET' || req.method.toUpperCase() === 'HEAD';

    if (!isDocReq || !isGET) {
        return next();
    }

    self.validateApiDoc(function (isValid, details) {
        var context = {
            data: self.getExpandedApiDoc(req),
            swaggerDoc: self.apiDoc,
            isSwaggerDocValid: isValid,
            errors: details
        };

        if (self.requestHandler) {
            context.render = function (userContext) {
                self.render(userContext || context, req, res, next);
            };

            self.requestHandler.call(context, req, res, next);
        } else {
            self.render(context, req, res, next);
        }
    });
};

Obj.prototype.render = function (context, req, res, next) {
    var self = this;

    if (self.corsOrigin) {
        res.header('Access-Control-Allow-Origin', self.corsOrigin);
    }

    if (!context.isSwaggerDocValid) {
        return res.status(500).json(context.errors);
    }

    if (/\.json$/.test(req.url) || !self.templateFiles) {
        return res.json(context.swaggerDoc);
    }

    if (/\.html?$/.test(req.url)) {
        return self.templateEngine(context, function (err, html) {
            if (err) {
                return next(err);
            }

            res.end(html);
        });
    }

    res.format({
        'application/json': function () {
            res.json(context.swaggerDoc);
        },

        'text/html': function () {
            self.templateEngine(context, function (err, html) {
                if (err) {
                    return next(err);
                }

                res.end(html);
            });
        },

        'default': function () {
            res.status(406).send('Not Acceptable');
        }
    });

};

module.exports = function (opts) {
    var obj = new Obj(opts);

    return obj.handler.bind(obj);
};