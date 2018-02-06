'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    // TODO Add an appropriate welcome message.
    number_feeds_per_prompt : 5,
    speak_only_feed_title : true,
    display_only_title_in_card : true,

    // TODO Add the s3 Bucket Name, dynamoDB Table Name and Region
    // dynamoDBTableName : 'session_saves'
    dynamoDBTableName: 'makeMeSmart',
    sessionDBName: 'sessions',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
};

module.exports = config;
