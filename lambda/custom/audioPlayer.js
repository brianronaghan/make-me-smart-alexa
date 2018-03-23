
var Alexa = require('alexa-sdk');
var util = require('./util');


var controllers = {
  'start': function (chosenEp, type, feedName) {
    var deviceId = util.getDeviceId.call(this);
    var devicePlaying = {
      status: 'requested',
      type: type,
      feed: feedName,
      title: chosenEp.title,
      url: chosenEp.audio.url,
      token: chosenEp.guid,
      progress: -1,
      length: chosenEp.audio.length
    }
    console.log('START', chosenEp.audio.url, chosenEp.guid);
    this.attributes.playing = devicePlaying;
    this.attributes.history[chosenEp.guid] = this.attributes.history[chosenEp.guid] || {}
    this.attributes.history[chosenEp.guid].events = this.attributes.history[chosenEp.guid].events || [];
    this.attributes.history[chosenEp.guid].status = 'requested';
    this.attributes.history[chosenEp.guid].events.push({
      timestamp: Date.now(),
      'event': 'request',
      progress: -1

    })
    this.response.audioPlayerPlay('REPLACE_ALL', chosenEp.audio.url, chosenEp.guid, null, 0);
    this.emit(':responseReady');



  },
  'resume': function () {
    console.log("RESUME -- ", JSON.stringify(this.attributes, null,2));
    var deviceId = util.getDeviceId.call(this);
    // nullCheck.call(this, deviceId);

    var playing = this.attributes.playing;
    this.response.speak(`Resuming ${playing.title}`);
    this.response.audioPlayerPlay('REPLACE_ALL', playing.url, playing.token, null, playing.progress);
    this.emit(':responseReady');


  },
  'stop': function () {
    var deviceId = util.getDeviceId.call(this);
    if (this.attributes.playing.status === 'finished') {
      this.response.speak('you done. playing the next baby.');
    } else {
      // this.response.speak("You asked me to pause, I paused.");
      this.attributes.playing['progress'] = this.event.context.AudioPlayer.offsetInMilliseconds;
      this.attributes.playing.status = 'paused';
      this.response.audioPlayerStop();
      this.emit(':responseReady');
    }
  }
};

module.exports = controllers;

function nullCheck (deviceId) {
  this.attributes.playing = this.attributes.playing || {};

}
