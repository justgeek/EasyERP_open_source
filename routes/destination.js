

var express = require('express');
var router = express.Router();
var DestinationHandler = require('../handlers/destination');

module.exports = function (models) {
    var handler = new DestinationHandler(models);

    router.get('/', handler.getForDd);

    return router;
};