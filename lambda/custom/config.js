'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    items_per_prompt : {
      show: 3,
      explainer: 3,
      episode: 3,
    },
    intents: {
      HomePage: [
        "a main menu",
        "the main menu",
        "start menu",
        "home menu",
        "main menu",
        "home page",
        "start over",
        "what's new",
        "hear what's new",
        "tell me what's new",
        "tell me what is new",
        "what is new",
        "hear new explainers",
        "make me smart",
        "what I need to know",
        "what's happening in the world"
      ],
      ReplayExplainer: [
        "replay",
        "replay that",
        "restart",
        "play again",
        "play that again",
        "again",
        "let me hear that again",
        "start over",
        "replay explainer",
        "let's hear that again",
        "repeat",
        "begin again",
        "begin that again",
        "one more time",
        "replay today's explainer",
        "replay that exlplainer"
      ],
      PlayLatestExplainer: [
        "play all",
        "all of them",
        "all of em",
        "all of 'em",
        "play them all",
        "play the latest",
        "the latest",
        "all",
        "latest topic",
        "the latest explainer",
        "latest explainer",
        "today's topic",
        "the latest",
        "play today's topic",
        "today's explainer",
        "play today's explainer",
        "play the latest explainer"
      ],
      RequestExplainer: [
        "topic",
        "suggest",
        "suggestion",
        "make a suggestion",
        "suggest an explainer",
        "request explainer slot",
        "suggest a topic",
        "request an explainer",
        "request a topic",
        "pitch explainer",
        "pitch an explainer topic",
        "pitch a topic",
        "i want to suggest a topic",
        "can i make a suggestion",
        "suggestion",
        "make a request",
        "i want to mamke a request",
        "i want to suggest something",
        "i want to suggest a topic",
        "request",
        "new topic"
      ],
      ListExplainers: [
        "explainer menu",
        "what explainers it has",
        "list explainers",
        "list all our explainers",
        "list our explainers",
        "explore all",
        "explore all explainers",
        "all explainers",
        "see all explainers",
        "show all explainers",
        "show me all explainers",
        "show me all the explainers",
        "show me more",
        "ask for more",
        "more options",
        "more",
        "more please",
        "more explainers"
      ],
      EarlierExplainers: [
        "earlier",
        "earlier explainers",
        "before that",
        "further back",
        "older",
        "older 3",
        "older explainers",
        "older explainer",
        "go back"
      ],
      LaterExplainers: [
        "later",
        "later explainers",
        "after that",
        "more recent",
        "more recent 3",
        "newer",
        "newer explainers",
        "newer explainer"
      ],
      ChangeMyInfo: [
        "change my name",
        "change my info",
        "correct name",
        "update name",
        "change info",
        "correct my name",
        "update my name",
        "change my city",
        "change my location",
        "correct location",
        "update location",
        "correct my location",
        "update my city",
        "add my info",
        "add my name",
        "add my city",
        "add info",
        "add name",
        "add city"
      ],
      'AMAZON.StopIntent': [
        "stop",
        "cancel"
      ],
      'AMAZON.HelpIntent': [
        "help",
        "help me",
        "can you help",
        "can you help me",
        "what do i do",
        "help please"
      ]
    },
    defaultDescription: "Something else you want to get smart about? Try 'Alexa, suggest a topic' and Kai and Molly might use your idea!",
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
