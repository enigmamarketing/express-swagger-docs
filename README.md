# Express Swagger Docs
Generates swagger docs from JSDocs in JavaScript files. It was based on [swagger-express](https://github.com/fliptoo/swagger-express) but modified to export HTML documentation instead of using (only) Swagger UI. By default it exports **/swagger.json** and **/swagger.html**.

Swagger UI is great as a quick sandbox tool but (in our opinion) not the best fit for API documentation. Branding Swagger UI or changing it's layout is also not a 5 minute job. This module intends to create readable, compact documentation that you can adjust to match your project.

It implements an API that responds to either text/html or application/json. It is still **fully compatible with Swagger UI** and any other application, but it will also respond with a nice set of HTML pages for browser navigation. This plugin doesn't include Swagger UI so you will need to host it yourself, if required. 

The response type is defined by the Accept header or by using an extension:

- **text/html** .html
- **application/json** .json

It only supports [version 2.0](https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md) of the [swagger](http://swagger.io/) specification. 

## Current Limitations
Pull requests are welcome.

- XML is not supported 
- External $ref resources are not supported, only internal definitions. eg. $ref: #/definitions/Tag
- Only .js files are parsed


## Install 
```
npm install express-swagger-docs
```
## Basic Usage

### register middleware
This basic example will search all JavaScript files in the **directory** and read any JSDoc that may describe a Swagger API. Those will be served under the path - in the default case '/swagger.json'.

```
var swaggerDocs = require('express-swagger-docs'),
	routerFolder = './controllers';

app.use(swaggerDocs({
	directory: routerFolder
}));
```

### Write JSDoc
We can write these sections:

- @SwaggerHeader
- @SwaggerTag
- @SwaggerPath

#### @swaggerHeader 
Only the info.title and info.version properties are mandatory. There can be more than one instance of the swagger header definition, properties will be overwritten. There is no pre-defined order by which the properties will be merged. 

Usually this is placed in the same file we have our home route (**/**).

```
/**
 * @swaggerHeader
 * info:
 *   title: Swagger Sample App
 *   version: 1.0.0
 */
```

But you may define any additional properties

```
/**
 * @swaggerHeader
 * info:
 *   title: Swagger Sample App
 *   description: This is a sample server Petstore server.
 *   termsOfService: http://swagger.io/terms/
 *   contact:
 *     name: API Support
 *     url: http://www.swagger.io/support
 *     email: support@swagger.io
 *   license:
 *     name: Apache 2.0
 *     url: http://www.apache.org/licenses/LICENSE-2.0.html
 *   version: 1.0.0
 * host: localhost:8090
 * basePath: /
 * tags:
 *   - name: pet
 *     description: Everything about your Pets
 *     externalDocs:
 *       description: Find out more
 *       url: http://swagger.io
 *   - name: other tag
 */
```

#### @swaggerTag
We don't need to submit the tags array in the @swaggerHeader. These definitions can be distributed across the files and the plugin will merge them into the tags array.

```
/**
 * @swaggerTag
 * pet:
 *  description: Everything about your Pets
 *  externalDocs:
 *    description: Find out more
 *    url: http://swagger.io
```

#### @swaggerPath
There will be multiple definitions of this, one per route plus a 

```
/**
 * @swagger
 * resourcePath: /api
 * description: All about API
 */

/**
 * @swagger
 * path: /login
 * operations:
 *   -  httpMethod: POST
 *      summary: Login with username and password
 *      notes: Returns a user based on username
 *      responseClass: User
 *      nickname: login
 *      consumes: 
 *        - text/html
 *      parameters:
 *        - name: username
 *          description: Your username
 *          paramType: query
 *          required: true
 *          dataType: string
 *        - name: password
 *          description: Your password
 *          paramType: query
 *          required: true
 *          dataType: string
 */
exports.login = function (req, res) {
  var user = {};
  user.username = req.param('username');
  user.password = req.param('password');
  res.json(user);
}

/**
 * @swagger
 * models:
 *   User:
 *     id: User
 *     properties:
 *       username:
 *         type: String
 *       password:
 *         type: String    
 */
 ```

## Options
There are additional options if you want to provide your custom templates or implement any additional validation.

### directory - Required
The directory holding the controller files with the annotations. We use **express-enrouten** to set up our routes but it should work with any folder with a collection of JavaScript files.

### path 
The path under which the docs will be served. No regex is allowed only a base path string. 

By default /swagger will be used which exposes /swagger.json and /swagger.html
Accessing /swagger will return either text/html or application/json according to the Accept header.

### corsOrigin
By default CORS headers *will not be set*. If you wish the module to set them set the option as true for '*' or provide the list of domains in a comma separated string.

```
app.use(swaggerDocs({
    directory: routerFolder,
    corsOrigin: true // will output Access-Control-Allow-Origin: *
});
```

or

```
app.use(swaggerDocs({
    directory: routerFolder,
    corsOrigin: 'lackey.io, getlackey.com'
});
```

### templateFiles
The path to a folder with some [DustJs](http://www.dustjs.com/) templates to render the documentation. If you want to provide your own templates please copy our files from /views into your project and make any changes you need. 

We don't directly support any other templating system but you can still use it by setting a custom requestHandler.

### requestHandler
This handler will only be called for HEAD/GET requests on the path that is defined for the docs. For every other case the plugin will call **next**.

The request handler will be bound to a context object with these properties:

- **data** an object with the API documentation
- **render** a method that uses the default rendering engine. It accepts a data object as an optional argument
- **isIndex** boolean that indicates if this is the API documentation index page

```
app.use(swaggerDocs({
    directory: routerFolder,
    requestHandler: function (req, res, next) {
        var data = this.data;

		res.format({
			'text/html': function () {
				// uses whatever template engine express has set up
				res.render('my-docs-tpl', data);
			},

			'application/json': function () {
				res.json(data);
			},

			'default': function () {
				// log the request and respond with 406
				res.status(406).send('Not Acceptable');
			}
		});
    }
}));
```

The request handler can be used for several other cases. For instance, if you need to limit access to the documentation depending on the logged in user. In this case you may wish to only change the data object data and use the default rendering.

```
app.use(swaggerDocs({
    directory: routerFolder,
    requestHandler: function (req, res, next) {
        var userHasAccess = myAccessControllFunction(req, res);// custom function
		
		if (userHasAccess) {
			this.render();
		} else {
			res.status(403).send('Forbidden');
		}
    }
}));
```
where **myAccessControllFunction** would validate the request and check if a user has access.

If you want to hide the existence of any API resource from a given user/group 

```
app.use(swaggerDocs({
    directory: routerFolder,
    requestHandler: function (req, res, next) {
        var userHasAccess = myAccessControllFunction(req, res),// custom function
        	data = this.data;
		
		if (!userHasAccess) {
			return next(); // will eventually issue a 404
		}

		if (this.isIndex) {
			data = removeUnwantedAPIsFunction(this.data, req, res);// custom function
		}

		this.render(data);
    }
}));
```

where your **removeUnwantedAPIsFunction** function would strip out any unwanted information from the data object. 