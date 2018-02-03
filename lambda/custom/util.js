var feeds = require('./feeds');
var constants = require('./constants');

module.exports = {
  feedLister: function () {
      // Generate a list of categories to serve several functions
      var categoryList = 'Here are the shows we have: ';
      var cardCategoryList = 'Our Shows: ';
      var index = 0;
      feeds.forEach(function (feeds) {
          categoryList += (++index) + constants.breakTime['100'] + feeds.feed + constants.breakTime['200'];
          cardCategoryList += (index) + ') ' + feeds.feed + ' \n';
      });
      categoryList += '. Which one would you like to hear?';
      cardCategoryList += 'Which one would you like to hear?';
      return {
        categoryList,
        cardCategoryList
      }
  },
  episodeLister: function(episodes) {
    var episodeList = 'Here are the episodes: ';
    var episodeCards = 'EPS: '
    console.log(episodes.length);
    for (var x = 0; x < 10; x++) {
      console.log(x, episodes[x]);
      episodeList += constants.breakTime['50'] +  `${x+1}, titled ${episodes[x].title}` + constants.breakTime['50'];
      episodeCards += `${x+1}) ${episodes[x].title}`;

    }
    return {episodeList, episodeCards};
  },
  cardImage: function (url) {
    return {
      smallImageUrl: url,
      largeImageUrl: url
    }
  }
}
