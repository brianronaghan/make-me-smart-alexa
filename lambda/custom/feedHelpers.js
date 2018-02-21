'use strict';

var FeedParser = require('feedparser');
var entities = require('html-entities').AllHtmlEntities;
var request = require('request');
var striptags = require('striptags');

var config = require('./config');
var util = require('./util');

var cacheExpiry = config.cacheExpiry;
var sendProgressive = util.sendProgressive;


var itemsByFeed = {};

module.exports = {
  feedLoader: function (feed, message, cb) {
    console.log("ITEMS IN MEMORY ", itemsByFeed)
    var boundThis = this;
    if (itemsByFeed[feed.url] && itemsByFeed[feed.url].pulledAt > (Date.now() - cacheExpiry)) {
      console.log('within hour cache');
      return cb.call(boundThis, null, itemsByFeed[feed.url])
    } else {
      console.log('fresh pull')
      if (message) {
        console.log('sending message, means called from list eps');
        sendProgressive(
          this.event.context.System.apiEndpoint, // no need to add directives params
          this.event.request.requestId,
          this.event.context.System.apiAccessToken,
          `Let me look for new items of ${feed.feed}.`,
          function () {
            console.log('progressive cb')
          }
        );
      } else {
        console.log('no message')
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
          return cb(err, null);
      });

      // Received stream. parse through the stream and create JSON Objects for each item
      feedparser.on('readable', function() {
          var stream = this;
          var item;
          while (item = stream.read()) {
              var feedItem = {};
              // Process feedItem item and push it to items data if it exists
              if (item['title'] && item['date']) {
                if (item.title === 'S02-6: Encryption' || item['title'] === 'Five ways a bioethicist wants to change our bodies to fight climate change') {
                  console.log("ITEM ", JSON.stringify(item, null, 2));
                }
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
