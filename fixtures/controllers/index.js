/*jslint node:true, nomen:true, unparam:true */
'use strict';

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
 *   version: 1.0.1
 * host: localhost:8090
 * basePath: /
 * consumes:
 *   - application/json
 * produces:
 *   - application/json
 * tags:
 *   - name: pet
 *     description: Everything about your Pets
 *     externalDocs:
 *       description: Find out more
 *       url: http://swagger.io
 *   - name: other tag
 * @SwaggerTag
 *   test:
 *     description: just another test
 */
module.exports = function (router) {
    /**
     * @SwaggerPath
     *   /pet:
     *     post:
     *       summary: just a test route
     *       description: nothing to see here
     *       tags:
     *         - test
     *       consumes: 
     *         - application/json
     *       produces: 
     *         - application/json
     *
     
     
     
     
     * path: /activity-streams
     * operations:
     *   - httpMethod: GET
     *     summary: List all items
     *     notes: List all items
     *     nickname: activity-streamsGET
     *     type: array
     *     items:
     *       $ref: Activity-stream
     *     produces:
     *       - application/json
     *     responseMessages:
     *       - code: 200
     *         message: OK
     */
    router.get('/', function (req, res) {
        res.json(+new Date());
    });

    /**
     * @SwaggerPath
     * path: /activity-streams/{id}
     * operations:
     *   - httpMethod: GET
     *     summary: Get single item
     *     notes: Shows data from a single item.
     *     nickname: ActivityStreamGetOne
     *     type: ActivityStream
     *     produces:
     *       - application/json
     *     parameters:
     *       - name: id
     *         description: Payment method ID
     *         required: true
     *         type: string
     *         paramType: path
     *         allowMultiple: false
     *     responseMessages:
     *       - code: 200
     *         message: OK
     *       - code: 400
     *         message: Invalid ID format
     *       - code: 404
     *         message: Activity-stream not found
     */
    router.get('/:id', function (req, res) {
        res.json(+new Date());
    });

    /**
     * @SwaggerPath
     * path: /activity-streams
     * operations:
     *   - httpMethod: POST
     *     summary: Create a new item
     *     notes: Creates a new item
     *     nickname: ActivityStreamPost
     *     type: ActivityStream
     *     consumes:
     *       - application/json
     *       - application/x-www-form-urlencoded
     *     parameters:
     *       - name: body
     *         description: Document to insert
     *         required: true
     *         type: ActivityStream
     *         paramType: body
     *         allowMultiple: false
     *     responseMessages:
     *       - code: 200
     *         message: Item created. Returns the ID of the created item.
     *       - code: 400
     *         message: Invalid data supplied. Please check model validations.
     *       - code: 409
     *         message: Database conflict.
     */
    router.post('/', function (req, res) {
        res.json(+new Date());
    });
    /**
     * @SwaggerPath
     * models:
     *   Activity-stream:
     *     id: Activity-stream
     *     title: Activity-stream
     *     description: Schema for one activity-stream
     *     required:
     *       - title
     *     properties:
     *       title:
     *         type: String
     *         description: Title of activity-stream
     *       slug:
     *         type: String
     * description: Slug used in URLs
     */
};