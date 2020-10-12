let schedule = require('node-schedule');
const rp = require('request-promise');
const cheerio = require('cheerio');
const superagent = require('superagent');


let every_minute = '* * * * * ';
let every_day_once = '50 23 * * *';
let every_hour_once = '0 * * * *';

//schedule.scheduleJob(every_minute,async()=>{
    //login first to have no quota limit
    superagent
        .post('https://www.bricklink.com/v2/frmLogin')
        .send({ frmUsername: 'karel@karel.be', frmPassword: '1RrIRoHPYQ261Hq', frmStayLoggedIn : true })
        .end((err, res) => {
            let url = "https://www.bricklink.com/catalogList.asp?catString=238";
            let $ = cheerio.load(res.text);
            if($(".four-oh-four__content")){
                console.trace("login page gave: "+$(".tight.h1").text());
                //process.exit();
            }
            rp("https://www.bricklink.com/catalogList.asp?pg=8&catString=238&catType=P").then((html) => {
                let $ = cheerio.load(html);
                if($("#blErrorTitle").text()){
                    console.trace($(".blErrorDetail pre").text());
                    //process.exit();
                }
                let pages = Number($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
                //console.log(html);
                console.log("total pages: " + pages);
                if (pages === 0) {
                    console.trace("no pages found.");
                    //process.exit();
                }
                for (let i = 1; i <= pages; i++) {
                    rp("https://www.bricklink.com/catalogList.asp?v=0&pg=" + i + "&catString=238&catType=P").then((page) => {
                        console.log("Page " + i);
                        let $ = cheerio.load(page);
                        let list_links = $('table.catalog-list__body-main tbody tr td:nth-child(2) a');
                        for (let i = 0; i < list_links.length; i++) {
                            console.log(list_links[i].attribs.href);
                        }
                    }).catch((err) => {
                        console.trace(err);
                    })
                }
            })
            .catch(function (err) {
                console.trace(err);
            });
    });

//});

