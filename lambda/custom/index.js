'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');

var audioEventHandlers = require('./audioEventHandlers');

var startHandlers = require('handlers/startHandlers');
var requestHandlers = require('handlers/requestHandlers.js');
var playingExplainerHandlers = require('handlers/playingExplainerHandlers.js');
var iteratingExplainerHandlers = require('handlers/iteratingExplainerHandlers.js');
var iteratingShowHandlers = require('handlers/iteratingShowHandlers.js');
var iteratingEpisodeHandlers = require('handlers/iteratingEpisodeHandlers.js');
var playingEpisodeHandlers = require('handlers/playingEpisodeHandlers.js');
var explainDuringEpisodeHandlers = require('handlers/explainDuringEpisodeHandlers.js');

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(
      audioEventHandlers,
      startHandlers,
      requestHandlers,
      playingExplainerHandlers,
      iteratingExplainerHandlers,
      iteratingShowHandlers,
      iteratingEpisodeHandlers,
      playingEpisodeHandlers,
      explainDuringEpisodeHandlers
    );
    alexa.execute();
};
