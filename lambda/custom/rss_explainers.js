let Parser = require('rss-parser');
let parser = new Parser({
    customFields: {
        item: [
          ['media:content', 'media:content'],
          ['enclosure', 'enclosures',{keepArray: true}],

        ]
      }
} 
);
 
(async () => {
 
  let feed = await parser.parseURL('http://paper-marketplace.test/feed/alexa/mms-explainers');
  console.log(feed.title);
 
  feed.items.forEach(item => {
    console.log(item.enclosures)
  });
  let exps = feed.items.map(item => {
    return {
        title: item.title,
    }
  })
 
})();
