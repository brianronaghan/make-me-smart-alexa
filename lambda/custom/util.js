var Alexa = require("alexa-sdk");
var config = require('./config')
var constants = config.constants;
var blacklist = require('./blacklist');

const makeImage = Alexa.utils.ImageUtils.makeImage;
const makePlainText = Alexa.utils.TextUtils.makePlainText;
const makeRichText = Alexa.utils.TextUtils.makeRichText;

let INTENT_DICT = undefined;

module.exports = {
  sendProgressive: function (endpoint, requestId, accessToken, speech, cb) {
    const ds = new Alexa.services.DirectiveService();
    const directive = new Alexa.directives.VoicePlayerSpeakDirective(requestId, speech);

    const progressiveResponse = ds.enqueue(directive, endpoint, accessToken)
      .then(function (what) {
        cb(null, what)
      })
      .catch((err) => {
        console.log('err', JSON.stringify(err, null, 2));
        cb(err, null)
      });
  },
  cardImage: function (url) {
    return {
      smallImageUrl: url,
      largeImageUrl: url
    }
  },
  getDeviceId: function () {
    return this.event.context.System.device.deviceId;
  },
  logExplainer: function (explainer) {
    console.log('explainer log', explainer)
    // Should I switch playig?
    this.attributes.playing = {};
    this.attributes.playing.status = 'playing';
    this.attributes.playing.type = 'explainer';
    this.attributes.playing.token = explainer.guid;
    this.attributes.playing.url = explainer.audio.url;
  },
  nullCheck: nullCheck,
  prosodyToBold: prosodyToBold,
  clearProsody: clearProsody,
  cleanSlotName: cleanSlotName,
  intentCheck: intentCheck,
  expletiveCheck: expletiveCheck,
  templateListTemplate1: function (title, token, itemLabel, itemTitleKey, items) {
    var listItemBuilder = new Alexa.templateBuilders.ListItemBuilder();
    var listTemplateBuilder = new Alexa.templateBuilders.ListTemplate1Builder();
    items.forEach(function(item, i) {
      var image;
      if (item.image) {
        image = makeImage(item.image, 88, 88);
      }
      // addItem signature:
      // addItem(image, token, primaryText, secondaryText, tertiaryText) {

      listItemBuilder.addItem(image, `PickItem_${i}`, makeRichText(`<font size='5'>${item[itemTitleKey]}</font>`));
    });
    var autoListItems = listItemBuilder.build();

    var listTemplate = listTemplateBuilder.setToken(token)
      .setTitle(title)
      .setListItems(autoListItems)
      .setBackgroundImage(makeImage(config.background.show))
      .setBackButtonBehavior('HIDDEN')
      .build();
    console.log(JSON.stringify(listTemplate, null,2));
    return listTemplate;
  },
  templateBodyTemplate1: function (title, body, secondary, backgroundImage) {
    var bodyText = prosodyToBold(body)
    var template = {
         "type": "BodyTemplate1",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='5'>${bodyText}</font>`
           }
           // "secondaryText": {
           //   "type": "RichText",
           //   "text": secondary
           // },
         },
         "backgroundImage": makeImage(backgroundImage || config.background.show),
         "backButton": "HIDDEN"
    }
    // console.log('TEMPLATE 1', JSON.stringify(template));
    return template;


  },

  templateBodyTemplate3: function (title, image, description, help, background) {
    let helpText = '';
    if (help) {
      helpText = `<font size='3'><b>${help}</b></font>`
    }
    var template = {
         "type": "BodyTemplate3",
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='5'>${title}</font>`
           },
           "secondaryText": {
             "type": "PlainText",
             "text": description
           },
           "tertiaryText": {
             "type": "RichText",
             "text": helpText
           }
         },
         "image": makeImage(image, 340,340),
         "backgroundImage": makeImage(background || config.background.show),
         "backButton": "HIDDEN"
    }
    // console.log('body', JSON.stringify(template));
    return template;


  },
  templateBodyTemplate6: function (title, body, backgroundImage) {
    var template = {
         "type": "BodyTemplate6",
         "title": title,
         "textContent": {
           "primaryText": {
             "type": "RichText",
             "text": `<font size='3'>${body}</font>`
           },
           "secondaryText": {
             "type": "PlainText",
             "text": title
           },
         },
         "backgroundImage": makeImage(backgroundImage),
         "backButton": "HIDDEN"
    }
    console.log('BODY 6', JSON.stringify(template));
    return template;


  },

  itemLister: function(items, itemTitlePlural, titleKey, start, chunkLength) {
    // TODO: add a listen feature as well... the hint thing we tell them, handles whether next or previous
    var itemsAudio, itemsCard;
    if (start === 0) {
      itemsAudio = `I'll list all ${items.length} ${itemTitlePlural}, ${chunkLength} at a time: `
      itemsCard = '';
    } else {
      itemsAudio = itemsCard = '';
    }
    for (var x = start; x < start + chunkLength; x++) {
      // console.log(x, items[x]);
      if (items[x]) {
        itemsAudio += constants.breakTime['25'] +  `${x+1}, ${items[x][titleKey]} ` + constants.breakTime['25'];
        itemsCard += `${x+1}) ${items[x][titleKey]}\n`;
      }
    }
    itemsAudio += '. Choose one';
    itemsCard += '\n'
    itemsCard += 'Choose one';
    if (start == 0) {// if start is 0
      if (chunkLength < items.length) {// if chunk length is less than total length
        // add more
        itemsAudio += ` or say 'older' for older ${itemTitlePlural}`;
        itemsCard += ` or say 'older' for older ${itemTitlePlural}`;
      }
    } else {// start != 0
      if (start + chunkLength < items.length) {// if it is start + chunk is < total length
        // add more
        itemsAudio += ` or say 'older' for older ${itemTitlePlural}`;
        itemsCard += ` or say 'older' for older ${itemTitlePlural}`;
      }
      // always have previous (if we're gonna do previous)
      itemsAudio += ` or say 'newer' to hear the more recent ${chunkLength}`;
      itemsCard += ` or say 'newer' to hear the more recent ${chunkLength}`;
    }
    itemsAudio += ". What would you like to do?"
    return {itemsAudio, itemsCard};
  },

  itemPicker: function (intentSlot, choices, choiceKey, slotKey, addOne) {
    var itemNames = choices.map(function (choice) {return choice[choiceKey].toLowerCase()});
    var itemAlts = choices.map(function (choice) {return choice.alts && choice.alts});
    var index;
    if (intentSlot && intentSlot.index && intentSlot.index.value) {
        index = parseInt(intentSlot.index.value);
        if (!addOne) {
          index--;
        }    } else if (intentSlot && intentSlot.ordinal && intentSlot.ordinal.value) {
        var str = intentSlot.ordinal.value;
        if (str === "second" || str === "second 1") {
            index = 2;
        } else {
            str = str.substring(0, str.length - 2);
            index = parseInt(str);
        }
        if (!addOne) {
          index--;
        }

    } else if (typeof intentSlot === 'string') { //NOTE:check alts
        index = searchByName(cleanSlotName(intentSlot), itemNames, itemAlts);
    } else if (intentSlot && intentSlot[slotKey] && intentSlot[slotKey].value) {
        index = searchByName(cleanSlotName(intentSlot[slotKey].value), itemNames, itemAlts);
    } else if (intentSlot && intentSlot.query && intentSlot.query.value) {
      var asIndex = Number(intentSlot.query.value);
      if (isNaN(asIndex)) {
        console.log("Searching query via query", intentSlot.query.value)
        var cleanedQuery = cleanSlotName(intentSlot.query.value);
        index = searchByName(cleanSlotName(intentSlot.query.value), itemNames, itemAlts);
        console.log("SEARCH BY NAME", index)
        if (index === -1) {
          // could not find a number based name
          console.log("WTF", intentSlot.query.value);
          var parsed = parseInt(stripArticles(intentSlot.query.value));
          console.log("PARSED", parsed);
          if (!isNaN(parsed)) { // if there is still a number in the title, just take it and try that
            index = parsed;
            if (!addOne) {
              index--;
            }
          }
        }
      } else {
        console.log('using number val in query slot')
        index = asIndex;
        if (!addOne) {
          index--;
        }
      }
    } else {
      index = -1;
    }
    console.log("END INDEX? ", index)
    var chosen;
    if (index >= 0) {
      if (index < choices.length) {
        chosen = choices[index];
        chosen.index = index;
      } else {
        console.log("WTF")
        return -1;
      }
    }
    return chosen;
  },


  nextPicker :function (currentItem, itemKey, choices, choiceKey) {
    var currentItemIndex = choices.findIndex(function(item){
      return item[choiceKey] === currentItem[itemKey];
    });
    if (currentItemIndex === -1) {
      return -1
    }
    var nextItem = choices[currentItemIndex+1];
    if (nextItem) {
      return nextItem;
    } else {
      return -1;
    }
  },
  prevPicker :function (currentItem, itemKey, choices, choiceKey) {
    var currentItemIndex = choices.findIndex(function(item){
      return item[choiceKey] === currentItem[itemKey];
    });
    if (currentItemIndex === -1 || currentItemIndex === 0) {
      console.log('PREVIOUS not found')
      return -1
    }
    var prevItem = choices[currentItemIndex-1];
    console.log('PREVIOUS ITEM', prevItem);
    return prevItem;
  }
}

function searchByName (searchTerm, itemNames, itemAlts) { // takes names and alts and finds by name or alt
  var index = itemNames.indexOf(searchTerm);
  var stripped = stripArticles(searchTerm);
  var strippedIndex = itemNames.indexOf(stripped);
  console.log('SEARCHING normal: ', searchTerm, ' and stripped: ', stripped)
  if (index > -1) {
    console.log(`found ${searchTerm} straight up`);
    return index;
  } else if (strippedIndex > -1) {
    console.log(`found stripped ${stripped} title`);
    return strippedIndex;
  } else {
    // check without articles
    console.log("CHECKING ALTS with both stripped and normal")
    for (var i = 0; i < itemAlts.length; i++) {
      if (itemNames[i].indexOf(searchTerm) > -1) {
        console.log('found ', searchTerm, ' as partial of ', itemNames[i], ' but not resolving b/c 5 would always pick 5g')
      }
      if(itemAlts[i]) {
        for (var j = 0; j < itemAlts[i].length; j++) {
          if (itemAlts[i][j].indexOf(searchTerm) > -1) {
            console.log(`found term ${searchTerm} as part of alt ${itemAlts[i][j]}`)
            return i;
          } else if (itemAlts[i][j] === stripped) {
            // if i do index of on each string with stripped, any title with a number in it will always catch
            console.log(`found STRIPPED direct ${itemAlts[i][j]}`)
            return i;
          }
        }
      }
    }
    console.log('not even by alt names')
    return -1;
  }
}

function nullCheck(deviceId) {
  if (this.attributes.deviceIds) {
    if (this.attributes.deviceIds.indexOf(deviceId) === -1) {
      console.log('NEW DEVICE on old USER')
      this.attributes.deviceIds.push(deviceId);
    }
  } else {
    console.log('NEW USER')
    this.attributes.userInitiated = new Date().toDateString();
    this.attributes.deviceIds = [];
    this.attributes.deviceIds.push(deviceId);
  }
  this.attributes.indices = this.attributes.indices || {};
  this.attributes.playing = this.attributes.playing || {};
  this.attributes.iterating = this.attributes.iterating || -1;
  this.attributes.requests = this.attributes.requests || [];
}

function prosodyToBold (text) {
  text = text.replace(/<prosody[^>]*>/gi, "<b>")
  text = text.replace(/<\/prosody>/gi, "</b>")
  text = text.replace(/<audio[^>]*>/gi, "")
  return text;
};

function clearProsody (text) {
  text = text.replace(/<break[^>]*>/gi, "")
  text = text.replace(/<emphasis[^>]*>/gi, "")
  text = text.replace(/<\/emphasis[^>]*>/gi, "")
  text = text.replace(/<prosody[^>]*>/gi, "")
  text = text.replace(/<\/prosody>/gi, "")
  text = text.replace(/<audio[^>]*>/gi, "")
  return text;
};

function intentCheck (text) {
  console.log(`DOUBLE CHECKING ${text} against utterances.`)
  if (!INTENT_DICT) {
    INTENT_DICT = {};
    for (let intent of Object.keys(config.intents)) {
      for (let utterance of config.intents[intent]) {
        INTENT_DICT[utterance] = intent;
      }
    }
    console.log("BUILT DICT ", JSON.stringify(INTENT_DICT, null,2))
  }
  return INTENT_DICT[text]
}

function stripArticles (searchTerm) {
  console.log('raw', searchTerm)
  searchTerm = searchTerm.replace(/a\s/gi, " ")
  searchTerm = searchTerm.replace(/um\s/gi, " ")
  searchTerm = searchTerm.replace(/the\s/gi, " ")
  searchTerm = searchTerm.replace(/an\s/gi, " ")
  searchTerm = searchTerm.replace(/uh\s/gi, " ")
  searchTerm = searchTerm.replace(/play\s/gi, " ")
  searchTerm = searchTerm.replace(/number\s/gi, " ")
  searchTerm = searchTerm.replace(/pick\s/gi, " ")
  searchTerm = searchTerm.replace(/topic\s/gi, " ")
  searchTerm = searchTerm.replace(/choose\s/gi, " ")
  searchTerm = searchTerm.replace(/explainer\s/gi, " ")
  searchTerm = searchTerm.replace(/choice\s/gi, " ")
  searchTerm = searchTerm.replace(/item\s/gi, " ")
  searchTerm = searchTerm.replace(/option\s/gi, " ")
  searchTerm = searchTerm.replace(/explain\s/gi, " ")
  searchTerm = searchTerm.replace(/about\s/gi, " ")
  searchTerm = searchTerm.replace(/define\s/gi, " ")
  searchTerm = searchTerm.replace(/subject\s/gi, " ")
  searchTerm = searchTerm.replace(/hear\s/gi, " ")
  searchTerm = searchTerm.replace(/discuss\s/gi, " ")
  searchTerm = searchTerm.replace(/discussion\s/gi, " ")
  searchTerm = searchTerm.replace(/definition\s/gi, " ")
  searchTerm = searchTerm.replace(/conversation\s/gi, " ")
  searchTerm = searchTerm.replace(/on\s/gi, " ")
  searchTerm = searchTerm.replace(/find\s/gi, " ")
  searchTerm = searchTerm.replace(/search\s/gi, " ")
  searchTerm = searchTerm.replace(/tell\s/gi, " ")
  searchTerm = searchTerm.replace(/one\s/gi, " ")

  searchTerm = searchTerm.replace(/#/gi, " ")

  searchTerm = searchTerm.replace(/^\s+|\s+$/g, "");  // any leading or trailing whitespace


  console.log("STRIPPED ", searchTerm)

  return searchTerm;
}

function expletiveCheck (query) {
  if (blacklist.indexOf(query.toLowerCase()) > -1) {
    console.log(query, ' is a bad word with index ', blacklist.indexOf(query.toLowerCase()));
    return true;
  } else {
    console.log("NOT PURE WHOLE WORD CHECK")
  }

};

function cleanSlotName (showString) {
  var cleanedSlot = showString.toLowerCase();
  var reg = /market place/i;
  cleanedSlot = cleanedSlot.replace(reg, 'marketplace');
  // remove all spaces?
  if (cleanedSlot === 'code breaker') {
    cleanedSlot = 'codebreaker';
  }

  return cleanedSlot;
};
