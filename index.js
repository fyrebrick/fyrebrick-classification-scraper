"use strict"

let schedule = require('node-schedule');
const rp = require('request-promise');
const cheerio = require('cheerio');
const superagent = require('superagent');


let every_minute = '* * * * * ';
let every_day_once = '50 23 * * *';
let every_hour_once = '0 * * * *';
let every_ten_minutes = '*/10 * * * *';
let every_5_minutes = '*/5 * * * *';


let scrape_cron = every_5_minutes;
console.log("ready to start scraping, scraping at "+scrape_cron);
schedule.scheduleJob(scrape_cron,async()=>{
        try{
            console.log('start scraping...');
            let val = doScrape(1*1000);
            if(val){
                console.log('scraping should be done successfully');
            }else{
                console.log('scraping gave an error');
            }
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
    login((err, res) => {
        sleep(slowdown);
        if(JSON.parse(res.text).returnCode===3){
            console.trace(Error("login gave error: "+JSON.parse(res.text).returnMessage));
        }else{
            console.log('log in successful');
        }
        sleep(slowdown);
        setTimeout(checkPages,slowdown,slowdown);
    });
}

function checkPages(slowdown){
    rp("https://www.bricklink.com/catalogList.asp?pg=8&catString=238&catType=P").then((html) => {
        console.log('checking amount of pages...');
        sleep(slowdown);
        let $ = cheerio.load(html);
        if(checkForQuotaLimit($)){
            return false;
        }
        let pages = Number($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
        console.log("pages found: "+pages+", iterating all pages...");
        sleep(slowdown);
        for (let i = 1; i <= pages; i++) {
            setTimeout(doPage,slowdown,i,pages);
        }
    })
}

function doPage(i,pages){
    let links = [];
    rp("https://www.bricklink.com/catalogList.asp?v=0&pg=" + i + "&catString=238&catType=P").then((page) => {
        let $ = cheerio.load(page);
        if(checkForQuotaLimit($)){
            return false;
        }
        let list_links = $('table.catalog-list__body-main tbody tr td:nth-child(2) a');
        for (let j = 0; j < list_links.length; j++) {
            links.push(list_links[j].attribs.href);
        }
        console.log(links.length+" items on page "+i);
        if(i === pages){
            //last page is completed, running all colors of each link
            links.forEach((link)=>{
                let regex_id = /P=(.+)/gm;
                let id = link.match(regex_id)[0].substr(2);
                console.log(link);
                console.log('item '+id+' on page '+i);
                let body = {url:"http://img.bricklink.com/ItemImage/PL/"+id+".png",filepath:"P="+id};
                console.log("making request with body: "+JSON.stringify(body));
                superagent
                    .post('http://match_match_1:8888/add')
                    .set('accept', 'json')
                    .send(body).then((res)=>{
                    console.log("done....."+id);
                })
                    .catch((err)=>{
                        console.log(err.message);
                    });
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

            })
        }
    })
}

