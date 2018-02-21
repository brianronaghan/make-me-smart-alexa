'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    // TODO Add an appropriate welcome message.
    items_per_prompt : {
      show: 4,
      explainer: 3,
      episode: 3,
    },
    cacheExpiry: 1000 * 60 * 60, // 1 hour, but for this user, right? should I persist?
    // TODO Add the s3 Bucket Name, dynamoDB Table Name and Region
    // dynamoDBTableName : 'session_saves'
    dynamoDBTableName: 'makeMeSmart',
    sessionDBName: 'session_info',
};

module.exports = config;
