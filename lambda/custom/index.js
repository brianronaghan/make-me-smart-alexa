'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');

var startHandlers = require('handlers/startHandlers');
var requestHandlers = require('handlers/requestHandlers.js');
var playingExplainerHandlers = require('handlers/playingExplainerHandlers.js');
var iteratingExplainerHandlers = require('handlers/iteratingExplainerHandlers.js');

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(
      startHandlers,
      requestHandlers,
      playingExplainerHandlers,
      iteratingExplainerHandlers
    );
    alexa.execute();
};
