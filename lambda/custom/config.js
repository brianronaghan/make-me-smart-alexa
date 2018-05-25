'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    // TODO Add an appropriate welcome message.
    items_per_prompt : {
      show: 3,
      explainer: 3,
      episode: 3,
    },
    states: {
      START: '',
      HOME_PAGE: '_HOME_PAGE',
      PLAYING_EXPLAINER: '_PLAYING_EXPLAINER',
      REQUEST: '_REQUEST',
      ITERATING_EXPLAINER: '_ITERATING_EXPLAINER'
    },
    newUserAudio: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/utils/Alexa+-+Ryssdal+-+Wood+-+Welcome+New+User+Message+-+MIXLEV_alexa.mp3',
    background: {
      show: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/1024x600_FINALB.png"
    },
    icon : {
      full: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/icon_full.png"
    },
    cacheExpiry: 1000 * 60 * 60 * 60 * 3, // 2 hour, but for this spin-up, right? should I persist?
    dynamoDBTableName: 'makeMeSmart',
    sessionDBName: 'session_info',
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
};

module.exports = config;
