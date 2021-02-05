const cheerio = require('cheerio');
const superagent = require('superagent');

superagent.get("https://www.bricklink.com/catalogList.asp?pg=1&catString=238&catType=P").then(async (res) => {
    console.log(res);
    let html = res.text;
    console.log("check pages..");
    let $ = cheerio.load(html);
    console.log('checking amount of pages...');
    //console.log($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
    //console.log(html)
    let pages = Number($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
    console.log("pages found: "+pages);
    for (let i = 1; i <= pages; i++) {
        await setTimeout(await doPage,slowdown,i,pages);
        await sleep(slowdown);
    }
})

