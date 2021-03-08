# brickscraper 

Scrapes all images for the image collection database and to keep it up to date.

### usage

only scrapes minifig heads currenlty.

Uses [snakehead007/match/docker-compose.yml](https://github.com/snakehead007/match/blob/master/docker-compose.yml) to run.

This will run match, elasticsearch, rembg-docker and brickscraper.

- brickscraper will scrape all the image urls
- rembg-docker (docker wrapper for rembg) will remove the background of the images
- match will upload the images finally

This will be used to match and recognize lego pictures.

(Use on your own terms)
