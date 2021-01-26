const puppeteer = require('puppeteer');
const superagent = require('superagent');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Throttle = require('superagent-throttle');
const Jimp = require("jimp");


const REBRICKABLE_API_URL = "https://rebrickable.com/api/v3/lego/parts/?part_cat_id=59";
const REBRICKABLE_URL = "https://www.bricklink.com/v2/catalog/catalogitem.page?P=";
const REBRICKABLE_KEY = "4498d7201bc96b563b6402461cdfec70";
const BRICKLINK_URL = "https://www.bricklink.com/v2/catalog/catalogitem.page?P=";
const BRICKLINK_XP_URL = "https://www.bricklink.com/r3/catalog/parts/Minifig_Head/Minifig_Head/product.page?P=";
const BRICKOWL_URL = "https://www.brickowl.com/catalog/";
const PEERON_URL = " http://www.peeron.com/inv/parts/";
const REBRICKABLE_IMAGE_NIL = "https://rebrickable.com/static/img/nil.png"

let throttle = new Throttle({
    active: true,     // set false to pause queue
    rate: 1,          // how many requests can be sent every `ratePer`
    ratePer: 100000,   // number of ms in which `rate` requests may be sent
    concurrent: 1     // how many requests can be sent concurrently
  })

let browser;
(
    async()=>{
        browser = await puppeteer.launch({headless:false});
        await acceptBricklinkCookies();
        doPage();
    }
    )()

const doPage = async (rebrickable_url=REBRICKABLE_API_URL) => {
    amountDone = 1;
    await superagent.get(rebrickable_url)
    .use(throttle.plugin())
    .set('Accept', 'application/json')
    .set('Authorization',"key 4498d7201bc96b563b6402461cdfec70")
    .then((res)=>{
        if(res.status==200){
            res.body.results.forEach(async(result)=>{
                //! save rebrickable image
                if(typeof result.part_img_url === "string"){
                    saveImage(result.part_img_url,result.part_num,"jpg");
                }
                //! save bricklink image
                try{
                    if(result.external_ids.BrickLink){
                        setTimeout(async()=>{
                            try{
                                (await doBricklink(result.external_ids['BrickLink'][0])).forEach(async image=>{
                                    await saveImage(image,result.part_num,"png");
                                });
                            }catch(e){console.log(e.message)};
                        }, 4000*amountDone);
                        amountDone++;
                    }
                    if(result.external_ids['BrickLink']){
                        setTimeout(async()=>{
                            try{saveImage(await doBricklinkXP(result.external_ids['BrickLink'][0]),result.part_num,"png");
                            }catch(e){console.log(e.message)};
                        }, 4000*amountDone); 
                        amountDone++;
                    }
                    if(result.external_ids['BrickOwl']){
                        setTimeout(async()=>{
                            try{saveImage(await doBrickOwl(result.external_ids['BrickOwl'][0]),result.part_num,"jpg");
                            }catch(e){console.log(e.message)};
                        }, 4000*amountDone); 
                        amountDone++;
                    }
                    if(result.external_ids['Peeron']){
                        setTimeout(async()=>{
                            try{saveImage(await doPeeron(result.external_ids['Peeron'][0]),result.part_num,"jpg");
                            }catch(e){console.log(e.message)};
                        }, 4000*amountDone); 
                        amountDone++;
                    }
                }catch(err){
                    console.log(err.message);
                }

            });
            //go to the next page, maybe put timeout on this
            if(typeof res.body.next === "string"){
                //waits 15min before starting the next page
                setTimeout(()=>{
                    doPage(res.body.next);
                },900000);
            }
        }
    });
}

const saveImage = (image_url,part_num,filetype) =>{
try{    
    superagent
        .get(image_url)
        .end(async (err,res)=>{
            try{
                if (!fs.existsSync('images/'+part_num)){
                    fs.mkdirSync('images/'+part_num);
                }
                let buffer = new Buffer.from(res.body);
                let path = 'images/'+part_num+'/'+uuidv4()+'.'+filetype;
                fs.writeFile(path, buffer,()=>{
                    console.log(`saved image ${image_url}`);
                });
                setTimeout(()=>{
                    if(filetype==="png"){
                        try{
                            //1. convert file to jpg 
                            //2. save file as jpg
                            Jimp.read(path, function (err, png) {
                                if (err) {
                                console.log(err)
                                } else {
                                    png.write('images/'+part_num+'/'+uuidv4()+'.jpg')
                                    //3. delete png file
                                    fs.unlinkSync(path)
                                }
                            })
                            console.log("successfully converted image "+path);
                        }catch(e){
                            console.log("something happened with converting the png file to jpg");
                        }
                    }
                },60000) //1 min to save png file before converting and deleting
            }catch(e){
                console.log(`error on saving img with parameters ${image_url} ${part_num} ${filetype}`);
            }
        });
    }catch(e){
        console.log(image_url);
        console.log(e.message);
    }
}


const doBricklink = async (bricklink_id)=>{
    const page = await browser.newPage();
    await page.goto(BRICKLINK_URL+bricklink_id);
    await page.setDefaultNavigationTimeout(0);
    //await page.click(`.pciImgThumb`);
    setTimeout(async()=>{
        await page.close();
    },10000); //close this page after 10 seconds
    let images = [];

    images.push(await page.$eval('#_idtdThumbWrapper > div.pciThumbImgWindow > div.pciThumbImgBox.pciThumbImgBoxSelected > span > img', img => img.src));
    try{images.push(await page.$eval('#_idtdThumbWrapper > div.pciThumbImgWindow > div:nth-child(2) > span > img', img => img.src));}catch(e){};
    try{images.push(await page.$eval('#_idtdThumbWrapper > div.pciThumbImgWindow > div:nth-child(4) > span > img', img => img.src));}catch(e){};
    try{images.push(await page.$eval('#_idtdThumbWrapper > div.pciThumbImgWindow > div:nth-child(5) > span > img', img => img.src));}catch(e){};
    try{images.push(await page.$eval('#_idtdThumbWrapper > div.pciThumbImgWindow > div:nth-child(6) > span > img', img => img.src));}catch(e){};
    return images;
}

const doBricklinkXP = async (bricklink_id)=>{
    const page = await browser.newPage();
    await page.goto(BRICKLINK_XP_URL+bricklink_id);
    await page.setDefaultNavigationTimeout(0);
    setTimeout(async()=>{
        await page.close();
    },10000); //close this page after 20 seconds
    return await page.$eval('.floating-image img', img => img.src);
}

const doBrickOwl = async (boid)=>{
    const page = await browser.newPage();
    await page.goto(BRICKOWL_URL+boid);
    await page.setDefaultNavigationTimeout(0);
    setTimeout(async()=>{
        await page.close();
    },10000); //close this page after 20 seconds
    const placeholder = "https://img.brickowl.com/files/image_cache/large/placeholder.png";
    const src = await page.$eval('#item-left > p > a > img', img => img.src);
    return (src===placeholder)?undefined:src;
}

const doPeeron = async (peeron_id)=>{
    const page = await browser.newPage();
    await page.goto(PEERON_URL+peeron_id);
    await page.setDefaultNavigationTimeout(0);
    setTimeout(async()=>{
        await page.close();
    },10000); //close this page after 20 seconds
    return await page.$eval('#setpic', img => img.src);
}

const acceptBricklinkCookies = async ()=>{
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto("https://bricklink.com");
    await page.click("#blGlobalFooter > section > div > div > div > button"); //click on the 'accept cookies' button
}
