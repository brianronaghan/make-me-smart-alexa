'use strict';

var Alexa = require('alexa-sdk');
var feeds = require('./feeds');
var feedHelper = require('./feedHelpers');

var feedLoader = feedHelper.feedLoader;
var util = require('./util')
var audioEventHandlers = {
    'PlaybackStarted' : function () {
        /*
         * AudioPlayer.PlaybackStarted Directive received.
         * Confirming that requested audio file began playing.
         * Storing details in dynamoDB using attributes.
         */
        this.attributes.enqueued = {};
        console.log("STARTED", JSON.stringify(this, null,2));
        // maybe check playing against enqueued? then put in playing and nuke enqueued?
        logPlay.call(this)
        this.emit(':saveState', true);
    },
    'PlaybackFinished' : function () {
        /*
         * AudioPlayer.PlaybackFinished Directive received.
         * Confirming that audio file completed playing.
         * Storing details in dynamoDB using attributes.
         */
        logFinished.call(this);
        console.log("WE FINISHED"); // although... hm
        this.emit('FinshedHandler'); // did not work... gotta require it or somethign?
        this.emit(':saveState', true);
    },
    'PlaybackStopped' : function () {
        /*
         * AudioPlayer.PlaybackStopped Directive received.
         * Confirming that audio file stopped playing.
         * Storing details in dynamoDB using attributes.
         */
        logStop.call(this);
        this.emit(':saveState', true);
    },
    'PlaybackNearlyFinished' : function () {
        /*
         * AudioPlayer.PlaybackNearlyFinished Directive received.
         * Using this opportunity to enqueue the next audio
         * Storing details in dynamoDB using attributes.
         * Enqueuing the next audio file.
         */
         if (this.attributes['enqueued'] && this.attributes['enqueued'].token) {
             /*
              * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
              * same audio being played.
              * If an audio file is already enqueued, exit without enqueuing again.
              */
             return this.context.succeed(true);
         }
         console.log('NEARLY FINISHED ATTS', JSON.stringify(this.attributes, null, 2))
         var chosenShow = util.itemPicker(this.attributes.show, feeds, 'feed');
         console.log('nearly finished', chosenShow)
         var boundThis = this;
         feedLoader.call(this, chosenShow, false, function(err, feedData) {
           console.log('NEARLY FINISHED feed cb');
           var currentEpIndex = feedData.items.findIndex(function(episode) {
             return episode.guid === boundThis.attributes.playing.token
           });
           console.log('cur ind', currentEpIndex)
           var nextEp = feedData.items[currentEpIndex+1];
           console.log('next', nextEp);
           console.log('this',boundThis)
           logEnqueue.call(boundThis, nextEp)
           // do I need to put all the playing data in here or let playback started do it?
           console.log('things ', nextEp.audio.url, nextEp.guid, boundThis.attributes.playing.token);
           boundThis.response.audioPlayerPlay('ENQUEUE', nextEp.audio.url, nextEp.guid, boundThis.attributes.playing.token, 0);
           boundThis.emit(':saveState', true);

         })

         // var enqueueToken = this.attributes['enqueuedToken'];
         // var playBehavior = 'ENQUEUE';
         // var podcast = audioData[this.attributes['playOrder'][enqueueIndex]];
         // var expectedPreviousToken = this.attributes['token'];
         // var offsetInMilliseconds = 0;
         //

        // if (this.attributes['enqueuedToken']) {
        //     /*
        //      * Since AudioPlayer.PlaybackNearlyFinished Directive are prone to be delivered multiple times during the
        //      * same audio being played.
        //      * If an audio file is already enqueued, exit without enqueuing again.
        //      */
        //     return this.context.succeed(true);
        // }

        // var enqueueIndex = this.attributes['index'];
        // enqueueIndex +=1;
        // // Checking if  there are any items to be enqueued.
        // if (enqueueIndex === audioData.length) {
        //     if (this.attributes['loop']) {
        //         // Enqueueing the first item since looping is enabled.
        //         enqueueIndex = 0;
        //     } else {
        //         // Nothing to enqueue since reached end of the list and looping is disabled.
        //         return this.context.succeed(true);
        //     }
        // }
        // // Setting attributes to indicate item is enqueued.
        // this.attributes['enqueuedToken'] = String(this.attributes['playOrder'][enqueueIndex]);
        //
        // var enqueueToken = this.attributes['enqueuedToken'];
        // var playBehavior = 'ENQUEUE';
        // var podcast = audioData[this.attributes['playOrder'][enqueueIndex]];
        // var expectedPreviousToken = this.attributes['token'];
        // var offsetInMilliseconds = 0;
        //
        // this.response.audioPlayerPlay(playBehavior, podcast.url, enqueueToken, expectedPreviousToken, offsetInMilliseconds);
    },
    'PlaybackFailed' : function () {
        logFail.call(this);
        //  AudioPlayer.PlaybackNearlyFinished Directive received. Logging the error.
        console.log("Playback Failed ", JSON.stringify(this.event, null, 2));
        this.response.speak("Sorry, I could not play the requested audio. Blame it on the rain.")
        this.context.succeed(true);
    },

};

module.exports = audioEventHandlers;


/*
  this.attributes.history = {
  tokenId: [

]
}
*/

function logPlay() {
  nullCheck.call(this)
  if (this.attributes.playing.progress === -1) {
    this.attributes.history[this.attributes.playing.token].status = 'started';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'start',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
    this.attributes.playing.progress = getOffsetInMilliseconds.call(this)
    this.attributes.playing.status = 'playing';
  } else {
    this.attributes.playing.status = 'playing';
    this.attributes.history[this.attributes.playing.token].status = 'resumed';
    this.attributes.history[this.attributes.playing.token].events.push({
      'event': 'resume',
      'timestamp': Date.now(),
      'progress': getOffsetInMilliseconds.call(this)
    })
  }

}
function logStop() {
  nullCheck.call(this)
  this.attributes.history[this.attributes.playing.token].status = 'stopped';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'stop',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logFinished() {
  nullCheck.call(this)
  this.attributes.playing.status = 'finished';
  // set play to enqueued? Why isn't enqueue working?
  this.attributes.playing.progress = -1; // or something else? or wipe it out?
  this.attributes.history[this.attributes.playing.token].status = 'finished';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'finish',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })
}

function logFail() {
  nullCheck.call(this);
  this.attributes.history[this.attributes.playing.token].status = 'failed';
  this.attributes.history[this.attributes.playing.token].events.push({
    'event': 'failed',
    'timestamp': Date.now(),
    'progress': getOffsetInMilliseconds.call(this)
  })

}

function logEnqueue(nextEp) {
  nullCheck.call(this, nextEp.guid);
  this.attributes['enqueued'] = {
    type: 'episode',
    title: nextEp.title,
    url: nextEp.audio.url,
    token: nextEp.guid,
    progress: -1
  };
  this.attributes.history[nextEp.guid].status = 'enqueued';
  this.attributes.history[nextEp.guid].events.push({
    'event': 'enqueued',
    'timestamp': Date.now(),
    'progress': -1
  })

}


function nullCheck (token) {
  var token = token || this.attributes.playing.token;
  this.attributes.history = this.attributes.history || {};
  this.attributes.history[token] = this.attributes.history[token] || {};
  this.attributes.history[token].status = this.attributes.history[token].status || 'initiated';
  this.attributes.history[token].events = this.attributes.history[token].events || [];
}

function getToken() {
    // Extracting token received in the request.
    return this.event.request.token;
}

function getOffsetInMilliseconds() {
    // Extracting offsetInMilliseconds received in the request.
    return this.event.request.offsetInMilliseconds;
}
