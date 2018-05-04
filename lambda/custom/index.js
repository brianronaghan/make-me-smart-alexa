'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');

var startHandlers = require('handlers/startHandlers');
var requestHandlers = require('handlers/requestHandlers.js');
var playingExplainerHandlers = require('handlers/playingExplainerHandlers.js');
var iteratingExplainerHandlers = require('handlers/iteratingExplainerHandlers.js');

exports.handler = function(event, context) {
    if (event && event.resources && event.resources.indexOf("arn:aws:events:us-east-1:881439228984:rule/keep-warm") >-1) {
      console.log("KEEP WARM HIT")
      return;
    }
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
