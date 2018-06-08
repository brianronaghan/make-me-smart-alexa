'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    items_per_prompt : {
      show: 3,
      explainer: 3,
      episode: 3,
    },
    testIds: {
      "amzn1.ask.account.AGXAI6THSPIDUPSEDUTAXRMH6NJJVZ57KZGR6MLRR2VRTFZV3FJ2VZWGHRQ33WLY5TPGN5UCWYRWE5CJW6HAT2LEJWJNV64UHVVR42RTNSIGRZBC572NR7CSY57B4FVSLD4APAKB7SB4KZHWE74DQPW7S4TDNILRWBIB3Q3CJ4YXRUAUYQ5ATDB7HVAVHYGOF2P5WUGL53RSY7I" : 'spot',
      "amzn1.ask.account.AGD4CGALBA72FJSNNU253ORGG6UQZQDKE2DLMRQQ4U6HASASRK32B24XYGLOIE5SO4XMTSVM3YODR5VSANAFBLTX5DKWS2PIJYO3DQYXRAEGXRI7TD6CDCPOHLIBCQLCJDOQUJTYUDWDXQCB4A3GUYCRCAALJLDRAVHFJIEKXJM2FV5CMZEL23C2RYJUKFAS2MPZLTSHDXXA4WQ": 'simulator',
      "amzn1.ask.account.AFQSYYOM57YKMLWU2CHCZKZHVYI43VSAGGD3GQ2C3CX3RTI6SREPY63RLNABCNOZ5L5OLOGFMYR647UYXNEEUMKCOV3PNJWRH4NWDEEAWD3HBBFL5COWJJVC76BFK6ZQYBEPYU2YOWSIUY2S4K4ZGYXEMSSKXWN6YVCBAKY6HPJHE6H4OFKAARRYB4QM5OWXYRMKLGWZ43NBHMA" : 'show'
    },
    states: {
      START: '',
      HOME_PAGE: '_HOME_PAGE',
      PLAYING_EXPLAINER: '_PLAYING_EXPLAINER',
      ITERATING_EXPLAINER: '_ITERATING_EXPLAINER',
      REQUEST: '_REQUEST',
      CHANGE_INFO: '_CHANGE_INFO',
      UNRESOLVED: '_UNRESOLVED'
    },
    intents: {
      'AMAZON.HelpIntent': [
        "help",
        "help me",
        "can you help",
        "can you help me",
        "what do i do",
        "help please"
      ],
      'AMAZON.StopIntent': [
        "stop",
        "cancel",
        "I'm done",
        "I'm set",
        "I'm good",
        "I'm all set",
        "Enough",
        "That's enough",
        "I'm good thanks",
        "I'm all set",
        "All set",
        "All set, thanks",
        "All done, thanks",
        "All done",
        "Done",
        "I'm done",
        "I'm done thanks"
      ],
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
        "play all of em",
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
        "tell make me smart I’ve got an idea",
        "pitch",
        "pitch explainer",
        "pitch an explainer",
        "pitch a new explainer",
        "pitch an explainer topic",
        "pitch a topic",
        "propose",
        "propose explainer",
        "propose an explainer",
        "propose a new explainer",
        "propose an explainer topic",
        "propose a topic",
        "propose an idea",
        "request",
        "make a request",
        "request an explainer",
        "request explainer",
        "request a topic",
        "request a new topic",
        "request a new explainer",
        "i want to request something",
        "i want to make a request",
        "i want to pitch something",
        "submit",
        "submission",
        "make a submission",
        "submit explainer",
        "submit an explainer",
        "submit my explainer",
        "submit my explainer idea",

        "submit my idea",
        "submit my idea",
        "submit an idea for your next one",
        "submit an idea for your next explainer",

        "submit an idea for what we should explain next",
        "submit my idea for what you should explain next",
        "submit idea",
        "submit your idea",
        "submit an idea",
        "submit an idea for an explainer",
        "submit an idea for a new explainer",

        "submit a topic",
        "submit a topic idea",
        "i want to submit a topic",
        "can i make a submission",
        "i want to submit something",
        "i want to submit a topic",
        "suggest",
        "suggestion",
        "make a suggestion",
        "suggest an explainer",
        "suggest a topic",
        "i want to suggest a topic",
        "can i make a suggestion",
        "i want to suggest something",
        "i want to suggest a topic",
        "idea",
        "new idea",
        "new explainer",
        "I've got an idea",
        "I've got an idea for",
        "I have an idea",

        "I've got an idea for an explainer",
        "I've got an explainer idea",
        "topic",
        "new topic",
        "I've got an idea for a topic"
      ],
      ListExplainers: [
        "explainer menu",
        "what explainers it has",
        "what you got",
        "what you have",
        "list",
        "list all",
        "list explainers",
        "list all our explainers",
        "list our explainers",
        "list your explainers",
        "list the explainers",
        "list all explainers",
        "everything",
        "explore",
        "explore explainers",
        "explore all",
        "explore our explainers",
        "explore your explainers",
        "explore the explainers",
        "explore all explainers",
        "explore all our explainers",
        "explore all the explainers",
        "browse",
        "browse explainers",
        "browse all",
        "browse all explainers",
        "browse our explainers",
        "browse the explainers",
        "browse your explainers",
        "browse all our explainers",
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
      OlderExplainers: [
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
      NewerExplainers: [
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
        "change my city",
        "change my location",
        "change my information",
        "change name",
        "change info",
        "change city",
        "change location",
        "change information",

        "correct my name",
        "correct my info",
        "correct my city",
        "correct my location",
        "correct my information",
        "correct name",
        "correct info",
        "correct city",
        "correct location",
        "correct information",

        "fix my name",
        "fix my info",
        "fix my city",
        "fix my location",
        "fix my information",
        "fix name",
        "fix info",
        "fix city",
        "fix location",
        "fix information",

        "update my name",
        "update my info",
        "update my city",
        "update my location",
        "update my information",
        "update name",
        "update info",
        "update city",
        "update location",
        "update information",

        "add my name",
        "add my info",
        "add my city",
        "add my location",
        "add my information",
        "add name",
        "add info",
        "add city",
        "add location",
        "add information",

        "input my name",
        "input my info",
        "input my city",
        "input my location",
        "input my information",
        "input name",
        "input info",
        "input city",
        "input location",
        "input information",

        "enter my name",
        "enter my info",
        "enter my city",
        "enter my location",
        "enter my information",
        "enter name",
        "enter info",
        "enter city",
        "enter location",
        "enter information",

        "wrong my name",
        "wrong my info",
        "wrong my city",
        "wrong my location",
        "wrong my information",
        "wrong name",
        "wrong info",
        "wrong city",
        "wrong location",
        "wrong information",
        "that's the wrong name",
        "that's the wrong info",
        "that's the wrong city",
        "that's the wrong location",
        "wrong information",
        "you have the wrong name",
        "you have the wrong info",
        "you have the wrong city",
        "you have the wrong location",
        "you have the wrong information"
      ]
    },
    defaultDescription: "Something else you want to get smart about? Try 'Alexa, submit an idea' and Kai and Molly might use your idea!",
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
