'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    // TODO Add an appropriate welcome message.
    items_per_prompt : {
      show: 3,
      explainer: 3,
      episode: 3,
    },
    cacheExpiry: 1000 * 60 * 60 * 60, // 1 hour, but for this user, right? should I persist?
    // TODO Add the s3 Bucket Name, dynamoDB Table Name and Region
    // dynamoDBTableName : 'session_saves'
    dynamoDBTableName: 'makeMeSmart',
    sessionDBName: 'session_info',
    explainerFeed: null,
    constants: {
      breakTime : {
        '10' : '<break time = "10ms"/>',
        '25' : '<break time = "25ms"/>',
          '50' : '<break time = "50ms"/>',
          '100' : '<break time = "100ms"/>',
          '200' : '<break time = "200ms"/>',
          '250' : '<break time = "250ms"/>',
          '300' : '<break time = "300ms"/>',
          '500' : '<break time = "500ms"/>'
      },

    },
    feeds: [
        {
          'feed' : 'Make Me Smart',
          'image': 'https://img.apmcdn.org/3b52d43387699b5913df1dc0d4a460dcf0dba882/square/309cac-make-me-smart-tile.jpg',
          'url' : 'https://feeds.publicradio.org/public_feeds/make-me-smart-with-kai-and-molly/alexa/rss',
          'description': "A weekly podcast about the economy, technology and culture. Hosts Kai Ryssdal and Molly Wood use their expertise to connect the dots on the topics they know best, and get help from listeners and experts about the ones they want to know better."
        },
        {
            'feed' : 'Marketplace',
            'image': 'https://cms.marketplace.org/sites/default/files/marketplace_250.png',
            'url' : 'https://feeds.publicradio.org/public_feeds/marketplace-pm/alexa/rss',
            'description': "Helmed by Kai Ryssdal, our flagship program examines what the day in money delivered, through stories, conversations, newsworthy numbers and more."
        },
        {
            'feed' : 'Marketplace Morning Report',
            'image': 'https://cms.marketplace.org/sites/default/files/marketplace_morning_250.png',
            'url' : 'https://feeds.publicradio.org/public_feeds/apm-marketplace-morning-report/alexa/rss',
            'description' : "Host David Brancaccio explores the latest on markets, money, jobs and innovation, providing the context you need to make smarter decisions."
        },
        {
            'feed' : 'Marketplace Tech',
            'image': 'https://cms.marketplace.org/sites/default/files/MktplcTech1400x1440.png',
            'url' : 'https://feeds.publicradio.org/public_feeds/apm-marketplace-tech/alexa/rss',
            'description': "Host Molly Wood helps listeners understand the business behind the technology that’s rewiring our lives."
        },
        {
            'feed' : 'Marketplace Weekend',
            'image': 'https://cms.marketplace.org/sites/default/files/APM_Spotify-1000x1000_MW.jpg',
            'url' : 'https://feeds.publicradio.org/public_feeds/apm-marketplace-weekend/alexa/rss',
            'description': "Host Lizzie O'Leary gives you a relaxed yet informative look at where the economy collides with real life. It's everything from the paycheck to the personal."
        },
        {
          'feed' : 'Uncertain Hour',
          'image': 'https://cms.marketplace.org/sites/default/files/TUH_S2%203000x3000_on%20gray.png',
          'url' : 'http://feeds.publicradio.org/public_feeds/the-uncertain-hour/alexa/rss',
          'description': "In The Uncertain Hour, host Krissy Clark dives into one controversial topic each season to reveal the surprising origin stories of our economy."
        },
        {
            'feed' : 'Corner Office',
            'image': 'https://cms.marketplace.org/sites/default/files/field_image_branding/2015/06/corner_office_fin.png',
            'url' : 'https://feeds.publicradio.org/public_feeds/corner-office/itunes/rss',
            'description': "One of our most popular on-air series, Kai Ryssdal’s “Conversations from the Corner Office” brings you inside the room with the business leaders transforming our economy, our culture and our daily lives."
        },
        {
            'feed' : 'Codebreaker',
            'image': 'https://cms.marketplace.org/sites/default/files/field_image_branding/2015/10/Codebreaker_1400x1400_new.png',
            'url' : 'https://feeds.publicradio.org/public_feeds/codebreaker-by-marketplace-and-tech-insider/alexa/rss',
            'description': "Codebreaker is a podcast that dares to ask – and answer – the fundamental questions about technology that consume us every day."
        }
    ]
};

module.exports = config;
