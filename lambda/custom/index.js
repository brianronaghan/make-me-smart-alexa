'use strict';
var Alexa = require("alexa-sdk");
var config = require('./config');

var rss_explainers = require('./rss_explainers');



var startHandlers = require('./handlers/startHandlers');
var homePageHandlers = require('./handlers/homePageHandlers.js')
var playingExplainerHandlers = require('./handlers/playingExplainerHandlers.js');
var iteratingExplainerHandlers = require('./handlers/iteratingExplainerHandlers.js');
var requestHandlers = require('./handlers/requestHandlers.js');
var changeInfoHandlers = require('./handlers/changeInfoHandlers.js')
var unresolvedHandlers = require('./handlers/unresolvedHandlers.js')

exports.handler = function(event, context) {
    rss_explainers.getExplainers();   // hit cache for explainers


    if (event && event.resources && event.resources.indexOf("arn:aws:events:us-east-1:881439228984:rule/keep-warm") >-1) {
      console.log("KEEP WARM HIT")
      return;
    }
    console.log('YO  what the request',event.request);
    console.log('CONTEXT',context);

    var alexa = Alexa.handler(event, context);
    alexa.appId = config.appId;
    alexa.dynamoDBTableName = config.dynamoDBTableName;
    alexa.registerHandlers(
      startHandlers,
      homePageHandlers,
      playingExplainerHandlers,
      iteratingExplainerHandlers,
      requestHandlers,
      changeInfoHandlers,
      unresolvedHandlers
    );
    alexa.execute();
};
