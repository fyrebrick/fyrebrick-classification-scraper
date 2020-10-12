let schedule = require('node-schedule');
const rp = require('request-promise');
const cheerio = require('cheerio');
const superagent = require('superagent');


let every_minute = '* * * * * ';
let every_day_once = '50 23 * * *';
let every_hour_once = '0 * * * *';
//schedule.scheduleJob(every_minute,async()=>{
    let base_uri = "https://www.bricklink.com";
    let links = [];
    let slowdown = 10000; //slowdown timer with each request;
    login((err, res) => {
            if(JSON.parse(res.text).returnCode===3){
                console.trace("login gave error: "+JSON.parse(res.text).returnMessage);
                process.exit();
            }
            rp("https://www.bricklink.com/catalogList.asp?pg=8&catString=238&catType=P").then((html) => {
                let $ = cheerio.load(html);
                checkForQuotaLimit($);
                let pages = Number($('div.catalog-list__pagination--top div:nth-child(2) b:nth-child(3)').text());
                slowdown = pages*slowdown; //why? because each request is on a separate thead, wich makes it going all at once.
                for (let i = 1; i <= pages; i++) {
                    rp("https://www.bricklink.com/catalogList.asp?v=0&pg=" + i + "&catString=238&catType=P").then((page) => {
                        let $ = cheerio.load(page);
                        checkForQuotaLimit($);
                        let list_links = $('table.catalog-list__body-main tbody tr td:nth-child(2) a');
                        for (let i = 0; i < list_links.length; i++) {
                            links.push(list_links[i].attribs.href)
                        }
                        console.log("Page " + i);
                        if(i === pages){
                            //last page is completed, running all colors of each link
                            links.forEach((link)=>{
                                rp(base_uri+link).then((html_2)=>{
                                    let $ = cheerio.load(html_2);
                                    checkForQuotaLimit($);
                                    let listofColor = $("table.pciColorInfoTable tbody tr td:first-child span a");
                                    for(let j = 0; j < listofColor.length;j++){
                                        const regex = /\d+/gm;
                                        const colorId = Number(String(listofColor[j].onclick).match(regex)[0]);
                                        let linkToColor = "https://www.bricklink.com/v2/catalog/catalogitem.page?P=24581#T=S&C="+colorId+"&O={'color':'"+colorId+"','iconly':0}";
                                        rp(linkToColor).then((html_3)=>{
                                            let $ = cheerio.load(html_3);
                                            checkForQuotaLimit($);
                                            let rawLink = $(".pciImageMain").attr('src');
                                            const regex_noImage = /no_image/gm;
                                            if(rawLink.match(regex_noImage).length===0){
                                                //has image
                                                superagent
                                                    .post('localhost:8888/add')
                                                    .send({url:rawLink,filepath:"P=24581"})
                                            };

                                        })
                                   }
                                })
                            })
                        }
                    }).catch((err) => {
                        console.trace(err);
                    })
                }
            })
            .catch(function (err) {
                console.trace(err);
            }).then(()=>{
            });
    });

//});
    function login(callback){
        sleep(slowdown/2);
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
                sleep(slowdown/2);
               callback(err,res);
            });
    }
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function checkForQuotaLimit(cheerioLoad){
    sleep(slowdown);
    if(cheerioLoad("#blErrorTitle").text()){
        console.trace(Error(cheerioLoad(".blErrorDetail pre").text()));
        process.exit();
    }
}


