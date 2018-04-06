'use strict';

let config = require('./config.js');
var dynasty = require('dynasty')({ region: process.env.AWS_DEFAULT_REGION });
var sessions = dynasty.table(config.sessionDBName);

// var insert = function (keys, cb) {
//   sessions.insert(keys, function (err, resp) {
//     console.log("HI?")
//     cb.call(this, err, resp);
//   })
// }

var update = function (payload, cb) {
  // console.log("KEYS", keys)
  // console.log("PAY" , payload)
  // console.log("CB", cb)
  var boundThis = this;
  var keys = {
    hash: this.event.session.user.userId,
    range: this.event.session.sessionId
  }
  //sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
  //NOTE: so i need to i guess check if there is an array / obj, and if so push rather than replace. UGH
  sessions.update(keys, payload)
    .then(function (data) {
      console.log("RESP ",data)
      cb.call(boundThis, null, data)
    })
    .catch(function (err) {
      console.log('ERR', err)
      cb.call(boundThis, err)
    })
}


// if (this.event.session.new) { // can put this in new session right? or no?
//   sessions.insert({userId: this.event.session.user.userId, sessionId: this.event.session.sessionId, begin: this.event.request.timestamp})
//     .then(function(resp) {
//       console.log('new sesh babe i tried to insert', resp);
//       boundThis.response.speak('INSERTED A SESSION, maybe')
//       boundThis.emit(':responseReady');
//
//     })
//     .catch(function(err) {
//       console.log('session insert fail fail', err)
//       boundThis.response.speak('baaad insert')
//       boundThis.emit(':responseReady');
//
//     })
// } else {
//   console.log(typeof this.event.session.user.userId);
//   sessions.find({hash: this.event.session.user.userId, range: boundThis.event.session.sessionId})
//     .then(function(data){
//       console.log("SESSIONS WHAT", data)
//       boundThis.response.speak('bueno! FROM SESSIONS')
//       boundThis.emit(':responseReady');
//     })
//     .catch(function(err){
//       console.log('session fail', err)
//       boundThis.response.speak('baaad SESSIONS')
//       boundThis.emit(':responseReady');
//
//     })
//
// }
//
module.exports = { update }
