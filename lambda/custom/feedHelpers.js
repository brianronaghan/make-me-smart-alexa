'use strict';

var FeedParser = require('feedparser');
var entities = require('html-entities').AllHtmlEntities;
var request = require('request');
var striptags = require('striptags');

var config = require('./config');
var util = require('./util');

var cacheExpiry = config.cacheExpiry;
var sendProgressive = util.sendProgressive;


var itemsByFeed = {
  'tk': {
    'pulledAt': Date.now(),
    'items': [{
          title: 'bonds',
          author: 'Kai Ryssdal',
          tags: [],
          guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_bonds_kai.MP3',
          date: null,
          description: 'describing some bonds',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_bonds_kai.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'the cloud',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_cloud_molly.MP3",
          date: null,
          tags: ['web', 'internet'],
          author: 'Molly Wood',
          description: 'describing the cloud',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_cloud_molly.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'productivity',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_productivity_kai.MP3",
          date: null,
          author: 'Kai Ryssdal',
          tags: [],
          description: 'describing some productivity',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_productivity_kai.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'NETWORK EFFECT',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_network_effect_molly.MP3",
          date: null,
          author: 'Molly Wood',
          description: 'describing NETWORK EFFECT',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_network_effect_molly.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'inflation',
          guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_inflation_kai.mp3',
          date: null,
          author: 'Kai Ryssdal',
          tags: ['value of money', 'monetary policy'],
          description: 'describing some inflation',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_inflation_kai.mp3",
            length: null,
            type: null
          }
        },
        {
          title: 'interest rates',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_interest_rates_kai.mp3",
          date: null,
          author: 'Kai Ryssdal',
          tags: ['federal reserve', 'the fed'],
          description: 'describing some interest rates',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_interest_rates_kai.mp3",
            length: null,
            type: null
          }
        }
      ]
  }
};



module.exports = {
  feedLoader: function (feed, message, cb) {
    var boundThis = this;
    if (itemsByFeed[feed.url] && itemsByFeed[feed.url].pulledAt > (Date.now() - cacheExpiry)) {
      console.log('within hour cache');
      var feedData = itemsByFeed[feed.url];
      feedData.cached = true;
      return cb.call(boundThis, null, feedData);
    } else {
      console.log('fresh pull')
      if (message) {
        console.log('sending message, means called from list eps');
        sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function () {
            console.log('progressive cb')
          }
        );
      } else {
        console.log('NO CACHE, and NO message')
      }

      var req = request(feed.url);
      var feedparser = new FeedParser(null);
      var items = [];
      req.on('response', function (res) {


          var stream = this;

          if (res.statusCode === 200) {
              stream.pipe(feedparser);
          } else {
              return stream.emit('error', new Error('Bad status code'));
          }
      });

      req.on('error', function (err) {
        console.log('err', err);
          return cb.call(boundThis, err, null);
      });

      // Received stream. parse through the stream and create JSON Objects for each item
      feedparser.on('readable', function() {
          var stream = this;
          var item;
          while (item = stream.read()) {
              var feedItem = {};
              // Process feedItem item and push it to items data if it exists
              if (item['title'] && item['date']) {
                  feedItem['guid'] = item['guid'];
                  feedItem['title'] = item['title'];
                  feedItem['title'] = entities.decode(striptags(feedItem['title']));
                  feedItem['title'] = feedItem['title'].trim();
                  feedItem['title'] = feedItem['title'].replace(/[&]/g,'and').replace(/[<>]/g,'');

                  feedItem['date'] = new Date(item['date']).toUTCString();

                  if (item['description']) {
                      feedItem['description'] = item['description'];
                      feedItem['description'] = entities.decode(striptags(feedItem['description']));
                      feedItem['description'] = feedItem['description'].trim();
                      feedItem['description'] = feedItem['description'].replace(/[&]/g,'and').replace(/[<>]/g,'');
                  }
                  if (item['enclosures']) {
                    for(var x=0; x<item['enclosures'].length; x++) {
                      var enclosure = item['enclosures'][x];
                      if (enclosure.type === 'audio/mpeg') {
                        feedItem['audio'] = enclosure;
                        break;
                      }
                    }
                  }
                  if (item['link']) {
                      feedItem['link'] = item['link'];
                  }

                  if (item['image'] && item['image'].url) {
                      feedItem['imageUrl'] = item['image'].url;
                  }

                  if (item['meta'] && item['meta']['image'] && item['meta']['image'].url) {
                      feedItem['imageUrl'] = item['meta']['image'].url;
                  }
                  if (feedItem['audio']) {
                    items.push(feedItem);
                  }
              }
          }
      });

      // All items parsed. Store items in S3 and return items
      feedparser.on('end', function () {
        console.log('itemsByFeed', itemsByFeed, 'feed ', feed);
          var count = 0;
          // do I need to sort?
          items.sort(function (a, b) {
              return new Date(b.date) - new Date(a.date);
          });
          items.forEach(function (feedItem) {
              feedItem['count'] = count++;
          });
          itemsByFeed[feed.url] = {
            pulledAt: Date.now(),
            items: items
          }
          console.log("FEED ON END", feed)
          cb.call(boundThis, null, itemsByFeed[feed.url])
      });

      feedparser.on('error', function(err) {
          cb.call(boundThis, err, null);
      });
    }



  }
}
