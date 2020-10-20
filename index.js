let schedule = require('node-schedule');
const rp = require('request-promise');
const cheerio = require('cheerio');
const superagent = require('superagent');


let every_minute = '* * * * * ';
let every_day_once = '50 23 * * *';
let every_hour_once = '0 * * * *';
let every_ten_minutes = '*/10 * * * *';
let every_5_minutes = '*/5 * * * *';
let IP = "images";

let links;
let scrape_cron = every_5_minutes;
console.log('starting up!');

console.log("ready to start scraping...");
sleep(30*1000).then(async()=>{
    links = [];
        try{
            console.log("checking if match server is online..");
            await superagent
                .get('http://'+IP+':8888/count')
                .set('accept', 'json')
                .end((err,res) => {
                    if(err){
                        console.log(err);
                        console.log("cannot connect to match server, stopping.");
                        process.exit();
                    }
                    console.log(res.text);
                    console.log("match server is online, continuing");
                });
            console.log('start scraping...');
            await doScrape(20*1000);
        }catch(err){
            console.log(err);
        }
});

function login(callback){
        superagent
            .post('https://www.bricklink.com/ajax/renovate/loginandout.ajax')
            .send({ userid: 'karel@karel.be', password: '1RrIRoHPYQ261Hq', keepme_loggedin : "true" , override: "false", mid: "1742b350c3b00000-4684cddb9eb6e6d8",pageid: "LOGIN" })
            .set('accept', '*/*')
            .set('content-type','application/x-www-form-urlencoded; charset=UTF-8')
            .set('cookie','blckMID=1742b350c3b00000-4684cddb9eb6e6d8; _ga=GA1.2.1157918364.1598452776; ASPSESSIONIDSCSATDQA=EBLPBPEBNNPCFFNGEJMCJEMH; blckSessionStarted=1; cartBuyerID=-770659983; _gid=GA1.2.216106421.1602421317; ASPSESSIONIDSAQCRDRA=LOOJCPEBPNJMKBDAIBDPNAAG; ASPSESSIONIDQAQCRDRA=BOIONHPBNAILBGAIOAKCJHCC; ASPSESSIONIDSCQDQCRB=BMFMNHPBCLMACMJIJNLLLPND; catalogView=cView=0; blckCookieSetting=TGATCETFPTFABLFCHK; BLNEWSESSIONID=6C17035F3E5FEB395563454A2C034EF5; ASPSESSIONIDSARARDRA=IBPHOHPBBLGNPIELDBEIPGAH; BLdiscussFlag=; _gat=1; AWSALB=tejAmNRIxj5hpwwLHMecgTFd2G8ZPtS7nCpO7jLmTqiRlzGMBu6+YnC03qS+FQnlQYpOsifMt5qtn+V5H2WgbEzrW1vGASTu/QinMD09nizLOS7LREboYHF//XJK; AWSALBCORS=tejAmNRIxj5hpwwLHMecgTFd2G8ZPtS7nCpO7jLmTqiRlzGMBu6+YnC03qS+FQnlQYpOsifMt5qtn+V5H2WgbEzrW1vGASTu/QinMD09nizLOS7LREboYHF//XJK')
            .set('accept-encoding','gzip, deflate, br')
            .set('accept-language','pl-PL,pl;q=0.9,en-BE;q=0.8,en-US;q=0.7,en;q=0.6')
            .set('content-lenght','135')
            .set('user-agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4240.75 Safari/537.36')
            .set('x-requested-with','XMLHttpRequest')
            .end((err, res) => {
               callback(err,res);
            });
    }
function sleep(ms) {
    console.log("sleeping for "+ms+"ms");
    return new Promise(resolve => setTimeout(resolve, ms));
}
function checkForQuotaLimit(cheerioLoad){
    if(cheerioLoad("#blErrorTitle").text()){
        console.log(cheerioLoad(".blErrorDetail pre").text());
        return true;
    }
    return false;
}

function doScrape(slowdown){
    let base_uri = "https://www.bricklink.com";
    //let slowdown = 5000; //slowdown timer with each request;
    login(async(err, res) => {
        await sleep(slowdown);
        console.log("starting login");
        if(JSON.parse(res.text).returnCode===3){
            console.trace(Error("login gave error: "+JSON.parse(res.text).returnMessage));
        }else{
            console.log('log in successful');
        }
        console.log("starting checkpages, in timeout");
        setTimeout(checkPages,slowdown,slowdown);
    });
}

function checkPages(slowdown){
    rp("https://www.bricklink.com/catalogList.asp?pg=8&catString=238&catType=P").then(async (html) => {
        console.log("check pages..");
        let $ = cheerio.load(html);
        if(checkForQuotaLimit($)){
            return false;
        }
        console.log('checking amount of pages...');
        let pages = Number($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
        console.log("pages found: "+pages+", iterating all pages...");
        for (let i = 1; i <= pages; i++) {
            await setTimeout(await doPage,slowdown,i,pages);
            await sleep(slowdown);
        }
    })
}

function doPage(i,pages){
    rp("https://www.bricklink.com/catalogList.asp?v=0&pg=" + i + "&catString=238&catType=P").then(async(page) => {
        let $ = cheerio.load(page);
        if (checkForQuotaLimit($)) {
            return false;
        }
        console.log("doing page " + i);
        let list_links = $('table.catalog-list__body-main tbody tr td:nth-child(2) a');
        console.log(links.length + " links on page " + i);
        for (let j = 0; j < list_links.length; j++) {
            let link = list_links[j].attribs.href;
            let regex_id = /P=(.+)/gm;
            let id = link.match(regex_id)[0].substr(2);
            console.log(link);
            console.log('item ' + id + ' on page ' + i);
            await superagent
                .post('http://'+IP+':8888/add')
                .set('Content-Type', 'multipart/form-data')
                .field('url', "http://img.bricklink.com/ItemImage/PL/" + id + ".png")
                .field('filepath',"P=" + id)
                .end((err,res) => {
                    if(err){
                        console.log(err.message);
                    }
                    console.log(res.text);
                console.log("done " +i+"/"+list_links.length);
            });

            await sleep(5000);
        }
    });
            //last page is completed, running all colors of each link
                /*
                rp(base_uri+link).then((html_2)=>{
                    let $ = cheerio.load(html_2);
                    checkForQuotaLimit($);
                    let listofColor = $("table.pciColorInfoTable tbody tr td:first-child span a");
                    for(let j = 0; j < listofColor.length;j++){
                        const regex = /\d+/gm;
                        const colorId = Number(String(listofColor[j].attribs.onclick).match(regex));
                        let linkToColor = "https://www.bricklink.com/v2/catalog/catalogitem.page?P="+id+"1#T=S&C="+colorId+"&O={'color':'"+colorId+"','iconly':0}";
                        rp(linkToColor).then((html_3)=>{
                            let $ = cheerio.load(html_3);
                            checkForQuotaLimit($);
                            let rawLink = $("img.pciImageMain").text;
                            console.log(rawLink);
                            const regex_noImage = /no_image/gm;
                            if(rawLink.match(regex_noImage).length===0){
                                //has image
                                    //upload image
                            }

                        })
                    }
                })
                */


}

