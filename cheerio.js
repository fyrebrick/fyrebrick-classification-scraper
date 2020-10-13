const cheerio = require('cheerio');
const rp = require('request-promise');

let linkToColor = "https://www.bricklink.com/v2/catalog/catalogitem.page?P=24581#T=S&C=90&O={%22color%22:90,%22iconly%22:0}";
rp(linkToColor).then((html)=>{
    let $ = cheerio.load(html);
    console.log(html);
    let rawLink = $("#_idImageMain");
    //console.log(rawLink);
    console.log(rawLink);
    checkForQuotaLimit($);
});

function checkForQuotaLimit(cheerioLoad){
    if(cheerioLoad("#blErrorTitle").text()){
        console.trace(Error(cheerioLoad(".blErrorDetail pre").text()));
    }
}
