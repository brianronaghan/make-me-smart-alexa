'use strict';

var FeedParser = require('feedparser');
var entities = require('html-entities').AllHtmlEntities;
var request = require('request');
var striptags = require('striptags');

module.exports = {
  feedLoader: function (feedUrl, cb) {
    console.time('feed-response');
    console.time('feed-end');

    var req = request(feedUrl);
    var feedparser = new FeedParser(null);
    var items = [];
    req.on('response', function (res) {
      console.timeEnd('feed-response');


        var stream = this;

        if (res.statusCode === 200) {
            stream.pipe(feedparser);
        } else {
          console.log("ER")
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
            console.log("ITEM from RSS, what do want to keep? ", item);
            if (item['title'] && item['date']) {
              // console.log("ITEM ", item)
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
                      feedItem['podcast'] = enclosure;
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
                items.push(feedItem);
            }
        }
    });

    // All items parsed. Store items in S3 and return items
    feedparser.on('end', function () {
      console.timeEnd('feed-end');

        var count = 0;
        // do I need to sort?
        items.sort(function (a, b) {
            return new Date(b.date) - new Date(a.date);
        });
        items.forEach(function (feedItem) {
            feedItem['count'] = count++;
        });
        cb(null, items)
        // stringifyFeeds(items, (feedData) => {
        //   console.log("HEY the feedData", feedData)
        // });
    });

    feedparser.on('error', function(err) {
        cb(err, null);
    });
  }
}
