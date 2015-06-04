# Express Swagger Docs
Generates swagger docs from JSDocs comments in JavaScript files. 

----
**This is an early, untested, version. HTML templates need to be finished. Pull Requests are welcome**
----

This module is based on [swagger-express](https://github.com/fliptoo/swagger-express) but modified to export HTML documentation instead of using (only) Swagger UI. By default it exports **/swagger.json** and **/swagger.html**.

Swagger UI is great as a quick sandbox tool but (in our opinion) not the best fit for API documentation. Branding Swagger UI or changing it's layout is also not a 5 minute job. This module intends to create readable, compact documentation that you can adjust to match your project.

It implements an API that responds to either text/html or application/json. It is still **fully compatible with Swagger UI** or any other swagger client, but it will also respond with a nice HTML page for browser navigation. This plugin doesn't include Swagger UI so you will need to host it yourself, if required. 

The response type is defined by the Accept header or by using an extension:

- **text/html** or **.html**
- **application/json** or **.json**

It only supports [version 2.0](https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md) of the [swagger](http://swagger.io/) specification. 

The generated Swagger Document is transparently validated using the [swagger-tools](https://github.com/apigee-127/swagger-tools) validator and will output a HTTP 500 error in case it doesn't validate against the spec.

## Current (known) Limitations
Pull requests are welcome.

- XML is not supported 
- External $ref resources are not supported, only internal definitions. eg. $ref: #/definitions/Tag
- Only .js files are parsed
- HTML version doesn't expose all options


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
- @SwaggerDefinitions

#### @SwaggerHeader 
Only the **info.title** and **info.version** properties are mandatory. There can be more than one instance of the swagger header definition, properties will be overwritten. There is no pre-defined order by which the properties will be merged. 

Usually this is placed in the same file we have our home route (**/**), but it's really up to you.

```
/**
 * @SwaggerHeader
 * info:
 *   title: Swagger Sample App
 *   version: 1.0.0
 */
```

But you may define any additional properties

```
/**
 * @SwaggerHeader
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

#### @SwaggerTag
We don't need to define the tags array in the @SwaggerHeader. These definitions can be distributed across the files and the plugin will merge them into the tags array. Once again, duplications will be merged in no particular order.

```
/**
 * @SwaggerTag
 * pet:
 *  description: Everything about your Pets
 *  externalDocs:
 *    description: Find out more
 *    url: http://swagger.io
```

#### @SwaggerPath
There will be multiple definitions of this block, one per each exposed express handler you wish do document as a REST endpoint. Usually, we place them right before the method they are describing, but it really doesn't matter where you place them.

```
/**
* @SwaggerPath
*   /login:
*     get:
*       summary: just a test route
*       description: nothing to see here
*       tags:
*         - login
*       consumes:
*         - application/json
*       produces:
*         - application/json
*/
exports.login = function (req, res) {
  var user = {};
  user.username = req.param('username');
  user.password = req.param('password');
  
  // just a fake example...
  res.json(user);
}
```

#### @SwaggerDefinitions
Definitions may be defined in the @SwaggerHeader but you can also define them in the document where they are used. As before, duplications will be merged in no particular order.

```
/**
 * @SwaggerDefinitions
 *   ApiResponse:
 *     type: object
 *     properties:
 *       code:
 *         type: integer
 *         format: int32
 *       type:
 *         type: string
 *       message:
 *         type: string
 */
```

## Options
There are additional options if you want to provide your custom templates or implement any additional validation.

### directory - Required
The directory holding the controller files with the annotations. We use **express-enrouten** to set up our routes but it should work with any folder with a collection of JavaScript files. If they don't have the correct @SwaggerXXXX comment they will be ignored.

### path 
The path under which the docs will be served. No regex is allowed, only a base path string. 

By default **/swagger** will be used, which exposes **/swagger.json** and **/swagger.html**. Accessing **/swagger** will return either text/html or application/json according to the Accept header in the request.

### corsOrigin
By default CORS headers *will not be set*. If you wish the module to set them set the option as **true** for **'*'** or provide the allowed domain.

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
    corsOrigin: 'lackey.io'
});
```

### templateFiles
The path to a folder with some [DustJs](http://www.dustjs.com/) templates to render the documentation. Setting this property as **false** disables the HTML template and always returns the JSON format.

If you want to provide your own templates please create a **main.dust** file that parses the swagger.json doc or copy our files from [/lib/templates](https://github.com/enigmamarketing/express-swagger-docs/tree/master/lib/templates) into your project and make any changes you need.

If your template uses any requires just write the path as **'express-swagger-docs/my-required-file'** and our pluging will replace the **express-swagger-docs** path with the correct templates folder path:

```
	{>"express-swagger-docs/my-required-file"/}
```

We don't directly support any other templating system but you can still use it by setting a custom requestHandler.

### requestHandler
This handler will only be called for HEAD/GET requests on the path that is defined for the docs. For every other case the plugin will call **next**.

The request handler will be bound to a context object with these properties:

- **data** an object with an extended object of API documentation. Easier for templating
- **swaggerDoc** an object with the API documentation
- **render** a method that uses the default rendering engine. It accepts a data object as an optional argument
- **isSwaggerDocValid** the result of the swaggerDoc validation 
- **errors** any validation errors, if there are any

```
app.use(swaggerDocs({
    directory: routerFolder,
    requestHandler: function (req, res, next) {
    	var self = this;
		res.format({
			'text/html': function () {
				var data = self.data, // or self.swaggerDoc
				// uses whatever template engine express has set up
				res.render('my-docs-tpl', data);
			},

			'application/json': function () {
				res.json(self.swaggerDoc);
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

If you want to completely hide the existence of any API resource from a given user/group 

```
app.use(swaggerDocs({
    directory: routerFolder,
    requestHandler: function (req, res, next) {
    	var data = this.data;
		
		if (mySpecificUser(req, res)) {
			data = removeUnwantedAPIsFunction(this.data, req, res);// custom function
		}
		this.render(data);
    }
}));
```

where your **removeUnwantedAPIsFunction** function would strip out any unwanted information from the data object. 