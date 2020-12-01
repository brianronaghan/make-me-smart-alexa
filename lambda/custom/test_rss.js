var rss_explainers = require('./rss_explainers');


(()=> {
  rss_explainers.getExplainers.call(this, (err, myExplainers) => {
    console.log(myExplainers.length);
    myExplainers.forEach((ex)=>{
      console.log(ex.guid);
    })
    // console.log(myExplainers);
  });

})();
