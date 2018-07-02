'use strict';

var config = {
    appId : "amzn1.ask.skill.20034481-27aa-4d91-8a6c-c52ea4a0d377",
    items_per_prompt : {
      show: 3,
      explainer: 3,
      episode: 3,
    },
    stopMessageFrequency: 4,
    ipaNumber: "<phoneme alphabet='ipa' ph='nʌmbɝ'>number</phoneme>",
    reviewSolicitation: "Help others find our skill by rating Make Me Smart on the Alexa Skill Store or Mobile App.",
    podcastPlug: "You can also hear more from Kai and Molly on their podcast Make Me Smart!",
    stopMessage: 'Bye! Say Alexa, Make Me Smart to come back!',
    cancelMessage: 'Cancelled! Come back by saying Alexa, Make Me Smart!',
    defaultDescription: "Something else you want to get smart about? Try 'Alexa, submit an idea' and Kai and Molly might use your idea!",

    messages: [
      "Something else you want to get smart about? Try 'Alexa, submit an idea' and Kai and Molly might use it!",
      "Completionist? Say 'Alexa, browse explainers' to list every single explainer we've done!",
      "Help other people find our skill by rating Make Me Smart on the Alexa Skill Store or Mobile App.",
      "If you want to hear more from Kai and Molly, download the Make Me Smart podcast wherever you get that sort of thing.",
      "We're always looking for new ideas for explainers. Try 'Alexa, submit an idea' to give us one!",
      "Want to learn more about a topic? Goto: www.marketplace.org and get even smarter!",
      "Hey, guess what? We also have a show on the actual radio. Find Marketplace on your local public radio station.",
      "You can always say 'Alexa, play the latest' to hear what we're getting smart about right now.",
      "Have a question? Found a bug? Email testing@marketplace.org and we might be able to help!",
      "Rate Make Me Smart on the Alexa Skill Store or Mobile App."
    ],
    testIds: {
      "amzn1.ask.account.AGTQJ6UTU4PWTHCYYI4Z443Q5UO2KNAGTGIB23QIN36QISFFEXIDUYVLIBINT5QCI2DWKDJ7E6NQXA4BHCOS3JRCC4YNKJWUXWSEINHOQYHBMTQBAXRPJKWWUEHQQV6JG6IWAADB3JKYZDWBH55ZRTUPRT3EBMSVZITPX34K3BHXO2NLLLU6U4JXTFQELUALTQODUUH6IHX4GRQ" : 'spot',
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
        "help please",
        "I don't understand"
      ],
      'AMAZON.CancelIntent': [
        "cancel",
        "exit",
        "get out",
        "exit exit",
        "nevermind",
        "no",
        "I don't want to"
      ],
      'AMAZON.StopIntent': [
        "stop",
        "I'm done",
        "I'm good thank you",
        "I'm done thank you",
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
        "make  smart",
        "make  smarter",
        "make smart",
        "make smarter",
        "let's begin again",
        "begin again",
        "bets begin again",
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
        "what's happening in the world",
        "I want to hear what's new",
        "I want the main menu",
        "take me to the main menu",
        "go to the main menu",
        "I want to start over"
      ],
      ReplayExplainer: [

        "repeat explainer",
        "repeat the explainer",
        "repeat that exlplainer",

        "replay",
        "replay that",
        "replay explainer",
        "replay the explainer",
        "replay today's explainer",
        "replay that exlplainer",


        "restart",
        "restart that",
        "restart explainer",
        "restart the explainer",
        "restart today's explainer",
        "restart that exlplainer",

        "begin again",
        "begin that again",
        "begin explainer again",
        "begin the explainer again",
        "begin today's explainer again",
        "begin that exlplainer again",

        "start over",
        "start that over",

        "play again",
        "play that again",
        "play it again",
        "play that explainer again",
        "play the explainer again"
      ],
      RepeatOptions: [
        "repeat",
        "repeat that",
        "repeat options",
        "repeat all",
        "repeat those",
        "repeat my options",

        "what were my options",
        "say again",
        "say that again",
        "say that one more time",

        "again",
        "let me hear that again",
        "let's hear that again",
        "another time",
        "one more time"

      ],
      PlayLatestExplainer: [
        "all",
        "all of them",
        "all of em",
        "all the explainers",
        "all egg spiders",
        "all the spiders",
        "all explainers",
        "all explanations",


        "hear them all",
        "hear em all",
        "hear all",

        "hear all of them",
        "hear all of em",
        "hear all explainers",
        "hear all the explainers",
        "hear all of the explainers",
        "hear all explanations",
        "hear latest explainer",
        "hear today's explainer",
        "hear the latest",
        "hear latest",

        "latest",
        "latest topic",

        "play all",
        "play today's explainer",
        "play the latest explainer",
        "play all of em",
        "play them all",
        "play the latest",


        "the latest",
        "latest topic",
        "the latest explainer",
        "latest explainer",
        "the latest",
        "play today's topic",

        "today",
        "today's",
        "today's explainer",
        "today's topic",
        "today's explanation",
      ],
      RequestExplainer: [
        "tell make me smart I've got an idea",
        "tell make me smart I have got an idea",
        "tell make me smart I have an idea",
        "Alexa, I have an idea",
        "Alexa, ask Make Me Smart to submit",
        "Alexa, tell Make Me Smart I have an idea",
        "ask make me smart to submit",
        "tell make me smart to submit",
        "tell me an idea",
        "me an idea",
        "get an idea",
        "i'd like to scimitar explain are",
        "i'd like to submit an idea",
        "an explainer on india",
        "simien idea",
        "an idea",

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
        "i want to submit an idea",

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
        "everything",
        "everything you got",
        "everything its got",
        "everything you have",
        "everything it has",

        "for everything",
        "for everything you got",
        "for everything its got",
        "for everything you have",
        "for everything it has",

        "for all explainers",
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
        "list all the explainers",
        "list all our explainers",
        "list all your explainers",
        "list all the explainers",

        "list all of the explainers",
        "list all of our explainers",
        "list all of your explainers",


        "explore",
        "explore explainers",

        "explore all",
        "explore our explainers",
        "explore your explainers",
        "explore the explainers",

        "explore all explainers",
        "explore all our explainers",
        "explore all your explainers",
        "explore all the explainers",

        "explore all of our explainers",
        "explore all of your explainers",
        "explore all of the explainers",

        "browse",
        "browse explainers",
        "browse all",
        "browse topics",
        "browse explain is",
        "browse alix venus",
        "liners",
        "xplain are",

        "browse every one of your explainer",
        "browse every one of your explainers",
        "browse every one of our explainer",
        "browse every one of our explainers",
        "browse every one of the explainer",
        "browse every one of the explainers",

        "browse every explainer",
        "browse every single explainer",
        "browse all explainers",
        "browse all our explainers",
        "browse all your explainers",
        "browse all the explainers",
        "browse all of the explainers",
        "browse all of our explainers",
        "browse all of your explainers",
        "browse our explainers",
        "browse the explainers",
        "browse your explainers",

        "browse every one of your topic",
        "browse every one of your topics",
        "browse every topic",
        "browse every single topic",
        "browse all topics",
        "browse all our topics",
        "browse all your topics",
        "browse all the topics",
        "browse all of the topics",
        "browse all of our topics",
        "browse all of your topics",
        "browse our topics",
        "browse the topics",
        "browse your topics",

        "all explainers",
        "see all explainers",
        "show all explainers",
        "show me all explainers",
        "show me all the explainers",
        "show me all your explainers",

        "show me more",
        "ask for more",
        "more options",
        "more",
        "more please",
        "more explainers",
        "more spiders",
        "all the spiders"
      ],
      OlderExplainers: [
        "more explainers",
        "earlier",
        "earlier explainers",
        "more explainers",
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
        "previous 3",
        "newer",
        "newer explainers",
        "newer explainer",
        "p. n. explainer"

      ]
      // ChangeMyInfo: [
      //   "change my name",
      //   "change my info",
      //   "change my city",
      //   "change my location",
      //   "change my information",
      //   "change name",
      //   "change info",
      //   "change city",
      //   "change location",
      //   "change information",
      //
      //   "correct my name",
      //   "correct my info",
      //   "correct my city",
      //   "correct my location",
      //   "correct my information",
      //   "correct name",
      //   "correct info",
      //   "correct city",
      //   "correct location",
      //   "correct information",
      //
      //   "fix my name",
      //   "fix my info",
      //   "fix my city",
      //   "fix my location",
      //   "fix my information",
      //   "fix name",
      //   "fix info",
      //   "fix city",
      //   "fix location",
      //   "fix information",
      //
      //   "update my name",
      //   "update my info",
      //   "update my city",
      //   "update my location",
      //   "update my information",
      //   "update name",
      //   "update info",
      //   "update city",
      //   "update location",
      //   "update information",
      //
      //   "add my name",
      //   "add my info",
      //   "add my city",
      //   "add my location",
      //   "add my information",
      //   "add name",
      //   "add info",
      //   "add city",
      //   "add location",
      //   "add information",
      //
      //   "input my name",
      //   "input my info",
      //   "input my city",
      //   "input my location",
      //   "input my information",
      //   "input name",
      //   "input info",
      //   "input city",
      //   "input location",
      //   "input information",
      //
      //   "enter my name",
      //   "enter my info",
      //   "enter my city",
      //   "enter my location",
      //   "enter my information",
      //   "enter name",
      //   "enter info",
      //   "enter city",
      //   "enter location",
      //   "enter information",
      //
      //   "wrong my name",
      //   "wrong my info",
      //   "wrong my city",
      //   "wrong my location",
      //   "wrong my information",
      //   "wrong name",
      //   "wrong info",
      //   "wrong city",
      //   "wrong location",
      //   "wrong information",
      //   "that's the wrong name",
      //   "that's the wrong info",
      //   "that's the wrong city",
      //   "that's the wrong location",
      //   "wrong information",
      //   "you have the wrong name",
      //   "you have the wrong info",
      //   "you have the wrong city",
      //   "you have the wrong location",
      //   "you have the wrong information"
      // ]
    },
    navDirections:  {
      OlderExplainers: [
        "more",
        "more explainers",
        "next",
        "down",
        "page down",
        "before that",
        "further back",
      ],
      NewerExplainers: [
        "forward",
        "up",
        "scroll up",
        "previous",
        "previous page",
        "back",
        "back up",
        "go back up",
        "page down"
      ]
    },
    newUserAudio: 'https://s3.amazonaws.com/alexa-marketplace-make-me-smart/utils/Alexa+-+Ryssdal+-+Wood+-+Welcome+New+User+Message+-+MIXLEV_alexa.mp3',
    background: {
      show: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/utils/icons/1024x600_FINALB.png"
    },
    icon : {
      full: "https://s3.amazonaws.com/alexa-marketplace-make-me-smart/utils/icons/340x340_white_preview.png"
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
