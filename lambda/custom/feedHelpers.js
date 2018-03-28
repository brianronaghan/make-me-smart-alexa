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
          title: 'Bonds',
          author: 'Kai Ryssdal',
          tags: [],
          guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_bonds_kai.MP3',
          date: null,
          description: 'A bond is a fixed income investment in which an investor loans money to an entity (typically corporate or governmental) which borrows the funds for a defined period of time at a variable or fixed interest rate.',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_bonds_kai.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'The Cloud',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_cloud_molly.MP3",
          date: null,
          tags: ['web', 'internet'],
          author: 'Molly Wood',
          description: 'Cloud computing is a paradigm where computing resources (servers, storage, etc.) are offered as a utility via the Internet.',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_cloud_molly.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'Productivity',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_productivity_kai.MP3",
          date: null,
          author: 'Kai Ryssdal',
          tags: [],
          description: "A productivity measure is expressed as the ratio of output to inputs used in a production process, i.e. output per unit of input.",
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_productivity_kai.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'Network Effect',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_network_effect_molly.MP3",
          date: null,
          author: 'Molly Wood',
          description: 'The network effect is a phenomenon where increased numbers of people or participants improves the value of a good or service.',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_network_effect_molly.MP3",
            length: null,
            type: null
          }
        },
        {
          title: 'Inflation',
          guid: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_inflation_kai.mp3',
          date: null,
          author: 'Kai Ryssdal',
          tags: ['value of money', 'monetary policy'],
          description: 'In economics, inflation is a sustained increase in the general price level of goods and services in an economy over a period of time.',
          audio: {
            url: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_inflation_kai.mp3",
            length: null,
            type: null
          }
        },
        {
          title: 'Interest Rates',
          guid: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/16k/test_interest_rates_kai.mp3",
          date: null,
          author: 'Kai Ryssdal',
          tags: ['federal reserve', 'the fed'],
          description: "Interest Rates are the federal reserve bank's main tool to steer the economy.",
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
    var feedData;
    var needsMessage = false;
    if (itemsByFeed[feed.url] && itemsByFeed[feed.url].pulledAt > (Date.now() - cacheExpiry)) {
      console.log('within hour cache');
      feedData = itemsByFeed[feed.url];
      feedData.needsMessage = true;
      return cb.call(boundThis, null, feedData);
    } else {
      console.log('fresh pull');
      if (message) {
        console.log('sending message, means called from list eps');
        sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          message,
          function (err) {
            if (err) {
              console.log('progressive ERR', err);
              needsMessage = true;
            }
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
            items: items,
          }
          feedData = itemsByFeed[feed.url];
          feedData.needsMessage = needsMessage;
          cb.call(boundThis, null, feedData)
      });

      feedparser.on('error', function(err) {
          cb.call(boundThis, err, null);
      });
    }



  }
}
