//initialize constants
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const isEqual = require('lodash.isequal');

const scriptName = path.basename(__filename);
const supportedSeasons = ["18-19", "19-20", "20-21", "21-22"];

var SEASON;
//parse command line arguments to get the season
let ARGS = process.argv.slice(2);
if (ARGS.length !== 1){
    console.log(`Incorrect number of args. Usage: node ${scriptName} <season>`);
    process.exit(-1);
}
else {
    if (!supportedSeasons.includes(ARGS[0])){
        console.log("Incorrect season arg. Supported seasons are supportedSeason");
        process.exit(-1);
    }
    else {
        SEASON = ARGS[0];
    }
}

//function to launch a browser using puppeteer
let browser;
let page;
let URLs;
if (SEASON === "18-19"){
    URLs = [
        "https://www.whoscored.com/Regions/252/Tournaments/2/Seasons/7361/Stages/16368/PlayerStatistics/England-Premier-League-2018-2019",
        "https://www.whoscored.com/Regions/206/Tournaments/4/Seasons/7466/Stages/16546/PlayerStatistics/Spain-LaLiga-2018-2019",
        "https://www.whoscored.com/Regions/108/Tournaments/5/Seasons/7468/Stages/16548/PlayerStatistics/Italy-Serie-A-2018-2019",
        "https://www.whoscored.com/Regions/81/Tournaments/3/Seasons/7405/Stages/16427/PlayerStatistics/Germany-Bundesliga-2018-2019",
        "https://www.whoscored.com/Regions/74/Tournaments/22/Seasons/7344/Stages/16348/PlayerStatistics/France-Ligue-1-2018-2019"
    ];
}
else if (SEASON === "19-20"){
    URLs = [
        "https://www.whoscored.com/Regions/252/Tournaments/2/Seasons/7811/Stages/17590/PlayerStatistics/England-Premier-League-2019-2020",
        "https://www.whoscored.com/Regions/206/Tournaments/4/Seasons/7889/Stages/17702/PlayerStatistics/Spain-LaLiga-2019-2020",
        "https://www.whoscored.com/Regions/108/Tournaments/5/Seasons/7928/Stages/17835/PlayerStatistics/Italy-Serie-A-2019-2020",
        "https://www.whoscored.com/Regions/81/Tournaments/3/Seasons/7872/Stages/17682/PlayerStatistics/Germany-Bundesliga-2019-2020",
        "https://www.whoscored.com/Regions/74/Tournaments/22/Seasons/7814/Stages/17593/PlayerStatistics/France-Ligue-1-2019-2020"
    ];
}
else if (SEASON === "20-21"){
    URLs = [
        "https://www.whoscored.com/Regions/252/Tournaments/2/Seasons/8228/Stages/18685/PlayerStatistics/England-Premier-League-2020-2021",
        "https://www.whoscored.com/Regions/206/Tournaments/4/Seasons/8321/Stages/18851/PlayerStatistics/Spain-LaLiga-2020-2021",
        "https://www.whoscored.com/Regions/108/Tournaments/5/Seasons/8330/Stages/18873/PlayerStatistics/Italy-Serie-A-2020-2021",
        "https://www.whoscored.com/Regions/81/Tournaments/3/Seasons/8279/Stages/18762/PlayerStatistics/Germany-Bundesliga-2020-2021",
        "https://www.whoscored.com/Regions/74/Tournaments/22/Seasons/8185/Stages/18594/PlayerStatistics/France-Ligue-1-2020-2021"
    ];
}
else {
    URLs = [
        "https://www.whoscored.com/Statistics"
    ]
}

let APPEARANCES_PER_POSITION_COUNTER = {};
let PERCENTILE_PLAYERS = {
    "FW": {names:[], codes:[]},
    "AM": {names:[], codes:[]},
    "CM": {names:[], codes:[]},
    "FB": {names:[], codes:[]},
    "CB": {names:[], codes:[]},
    "GK": {names:[], codes:[]}
};


let setup = async () => {

    return new Promise(async function(resolve, reject){

        console.time('browser launch');
        browser = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox", '--disable-gpu']
        });
        page = await browser.newPage();
        await page.reload({ waitUntil: ["networkidle2"] });
        await disableImages(page);
        console.timeEnd('browser launch');
        resolve(browser);

    });

};


let disableImages = async(page) => {

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if(req.resourceType() === 'image'){
            req.abort();
        }
        else {
            req.continue();
        }
    });

};


let pageSetup = async (page, isFirstIteration, position) => {

    return new Promise(async function(resolve, reject) {

        if (isFirstIteration) {

            await page.reload({ waitUntil: ["networkidle2"] });

            // navigate to 'detailed' tab
            let selector;
            //whoscored data for previous seasons is stored separately (by competition)
            //data for the current season is stored together. Hence the different selectors
            if (SEASON === supportedSeasons[supportedSeasons.length - 1]){
                // navigate to 'detailed' tab (current season)
                selector = 'a[href="#top-player-stats-detailed"]';
            }
            else {
                // navigate to 'detailed' tab (previous seasons)
                selector = 'a[href="#stage-top-player-stats-detailed"]';
            }
            await page.waitForSelector(selector);
            await page.evaluate((selector) => document.querySelector(selector).click(), selector);
            await page.waitForSelector('#statistics-table-detailed');

            await page.waitFor(5000);

            // select 'total' from 'accumulation' drop-down
            await page.select('#statsAccumulationType', '2');
            await page.waitForFunction('document.querySelector("#statistics-table-detailed-loading").style.display == "none"');

            //press 'toggle all positions'
            // if (position === "FW"){
            //     selector = '#toggle-all-positions';
            //     await page.evaluate((selector) => document.querySelector(selector).click(), selector);
            // }

            selector = '#toggle-all-positions';
            await page.evaluate((selector) => document.querySelector(selector).click(), selector);

            switch (position){

                case "FW":

                    //select the forward position
                    selector = '#pitch > tbody > tr:nth-child(1) > td > label';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "W":

                    //unselect the forward position
                    // selector = '#pitch > tbody > tr:nth-child(1) > td > label';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the winger positions
                    selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(1) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(3) > label';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "AM":

                    //unselect the winger positions
                    // selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(1) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    // selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(3) > label';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    // selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(1) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    // selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(3) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);


                    //select the attacking midfield position
                    selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(2) > label';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "WM":

                    //select the wide midfielder positions
                    selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(1) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(3) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "CM":

                    //unselect the attacking midfield position
                    // selector = '#pitch > tbody > tr:nth-child(2) > td:nth-child(2) > label';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the central midfield position
                    selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(2) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "DM":

                    //unselect the central midfield position
                    // selector = '#pitch > tbody > tr:nth-child(3) > td:nth-child(2) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the defensive midfield position
                    selector = '#pitch > tbody > tr:nth-child(4) > td:nth-child(1) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "FB":

                    //unselect the defensive midfield position
                    // selector = '#pitch > tbody > tr:nth-child(4) > td:nth-child(1) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the full-back positions
                    selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(1) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(3) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "CB":

                    //unselect the full-back positions
                    // selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(1) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);
                    // selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(3) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the center-back position
                    selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(2) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    break;

                case "GK":

                    //unselect the center-back position
                    // selector = '#pitch > tbody > tr:nth-child(5) > td:nth-child(2) > label > input';
                    // await page.evaluate((selector) => document.querySelector(selector).click(), selector);

                    //select the GK position
                    selector = selector = '#pitch > tbody > tr:nth-child(6) > td:nth-child(1) > label > input';
                    await page.evaluate((selector) => document.querySelector(selector).click(), selector);

            }

            //press search button
            selector = '#filter-options > div:nth-child(4) > dl.listbox.col12-xs-6.col12-s-6.col12-m-6.col12-lg-6 > dd.search-button-container > button';
            await page.evaluate((selector) => document.querySelector(selector).click(), selector);
            await page.waitForFunction('document.querySelector("#statistics-table-detailed-loading").style.display == "none"');

            await page.waitFor(5000);
            resolve(page);

        } else {
            let selector = "#statistics-paging-detailed #next";
            await page.evaluate((selector) => document.querySelector(selector).click(), selector);
            await page.waitForFunction('document.querySelector("#statistics-table-detailed-loading").style.display == "none"');
            resolve(await page.evaluate(() => {return document.querySelector("#statistics-paging-detailed #next").className !== "option  disabled "}))
        }

    });


};


let getPlayersByPosition = async(position) => {

    console.log(`Getting ${position}s`);

    return new Promise((resolve, reject) => {

        pageSetup(page, true, position)
            .then(async () => {
                await getCodesByPosition(page, position);
                resolve();
            })
            .catch(async (anError) => {
                console.log(anError);
            });

    });

};


let getCodesByPosition = async (page, position) => {

    let firstIteration = true;
    let namesAndCodes = [];

    return new Promise(async function(resolve, reject){

        let hasNextPage = true;

        (async function loop() {
            while (hasNextPage){
                hasNextPage = await new Promise( (resolve, reject) =>
                    scrapeNamesAndCodes(page, position)
                        .then(async (result) => {
                            namesAndCodes = combineResults(namesAndCodes, result);
                            APPEARANCES_PER_POSITION_COUNTER = result[2];
                            firstIteration = false;
                        })
                        .then(async () =>
                            resolve(await pageSetup(page, false))
                        )
                        .catch(async (anError) => {
                            reject(anError);
                        })
                );
                let array1 = namesAndCodes.slice(namesAndCodes.length-10, namesAndCodes.length);
                let array2 = namesAndCodes.slice(namesAndCodes.length-20, namesAndCodes.length-10);
                if (isEqual(array1, array2)){
                    namesAndCodes.splice(namesAndCodes.length-10, 10);
                    await page.waitFor(1000);
                }
            }
            scrapeNamesAndCodes(page, position)
                .then(async (result) =>
                    (namesAndCodes = combineResults(namesAndCodes, result), firstIteration = false)
                ).then(() =>
                (resolve(namesAndCodes), logResults(namesAndCodes))
            )
        })();

    });

};


let scrapeNamesAndCodes = async (page, position) => {

    return await page.evaluate((SEASON, APPEARANCES_PER_POSITION_COUNTER, position) => {

        let playerNames = [];
        let playerCodes = [];

        const names = Array.from(document.querySelectorAll('#statistics-table-detailed #top-player-stats-summary-grid tr .grid-ghost-cell .iconize-icon-left')); //get names
        const links = Array.from(document.querySelectorAll('#statistics-table-detailed #top-player-stats-summary-grid tr .grid-ghost-cell .player-link')); //get player links
        const apps = Array.from(document.querySelectorAll('#statistics-table-detailed #top-player-stats-summary-grid tr td:nth-child(3)')); //get apps

        for (let i = 0; i < links.length; i++) {

            let nameCell = names[i];
            let linkCell = links[i];
            let appsCell = apps[i];

            let name = nameCell.textContent.substring(0, nameCell.textContent.length - 1);
            let url = linkCell.getAttribute("href");
            url = url.replace("/Players/", "");
            let code = url.substring(0, url.indexOf("/"));
            let numApps = parseInt(appsCell.innerText);

            // if (numApps >= 10){
            //     playerNames.push(name);
            //     playerCodes.push(code);
            // }

            if (APPEARANCES_PER_POSITION_COUNTER[code] === undefined) {
                APPEARANCES_PER_POSITION_COUNTER[code] = {};
            }

            if (APPEARANCES_PER_POSITION_COUNTER[code][position] === undefined)
            {
                APPEARANCES_PER_POSITION_COUNTER[code][position] = numApps;
            }
            else {
                APPEARANCES_PER_POSITION_COUNTER[code][position] += numApps;
            }


        }

        return [playerNames, playerCodes, APPEARANCES_PER_POSITION_COUNTER];

    }, SEASON, APPEARANCES_PER_POSITION_COUNTER, position);

};


let combineResults = (original, addition) => {
    let result = [];
    if (addition !== undefined && Array.isArray(addition[0])){
        if (original.length === 0){
            result = [addition[0], addition[1]];
        }
        else {
            for (let i=0; i<original.length; i++){
                result[i] = original[i].concat(addition[i]);
            }
        }
    }
    else {
        result = original.concat(addition);
    }
    return result;
};


function logResults(namesAndCodes){
    if (Array.isArray(namesAndCodes[0])){
        let numbers = [];
        for (let i=0; i<namesAndCodes.length; i++){
            numbers.push(namesAndCodes[i].length);
        }
        console.log(numbers);
    }
    else {
        console.log(namesAndCodes.length)
    }
}


async function populatePercentilePlayers(){

    for (let player in APPEARANCES_PER_POSITION_COUNTER){

        if (APPEARANCES_PER_POSITION_COUNTER[player]["FW"] >= 10){
            PERCENTILE_PLAYERS["FW"].codes.push(player);
        }

        if ((APPEARANCES_PER_POSITION_COUNTER[player]["AM"] || 0) +
            (APPEARANCES_PER_POSITION_COUNTER[player]["W"] || 0) +
            (APPEARANCES_PER_POSITION_COUNTER[player]["WM"] || 0) >= 10
        ){
            PERCENTILE_PLAYERS["AM"].codes.push(player);
        }

        if ((APPEARANCES_PER_POSITION_COUNTER[player]["CM"] || 0) + (APPEARANCES_PER_POSITION_COUNTER[player]["DM"] || 0) >= 10){
            PERCENTILE_PLAYERS["CM"].codes.push(player);
        }

        if (APPEARANCES_PER_POSITION_COUNTER[player]["FB"] >= 10){
            PERCENTILE_PLAYERS["FB"].codes.push(player);
        }

        if (APPEARANCES_PER_POSITION_COUNTER[player]["CB"] >= 10){
            PERCENTILE_PLAYERS["CB"].codes.push(player);
        }

        if (APPEARANCES_PER_POSITION_COUNTER[player]["GK"] >= 10){
            PERCENTILE_PLAYERS["GK"].codes.push(player);
        }

    }

}


let saveData =  async (rawData, position) => {

    let filePath;

    switch (position) {
        case "FW":
            filePath = `positionData/${SEASON}/FWPercentilePlayers.json`;
            break;
        case "AM":
            filePath = `positionData/${SEASON}/AMPercentilePlayers.json`;
            break;
        case "CM":
            filePath = `positionData/${SEASON}/CMPercentilePlayers.json`;
            break;
        case "FB":
            filePath = `positionData/${SEASON}/FBPercentilePlayers.json`;
            break;
        case "CB":
            filePath = `positionData/${SEASON}/CBPercentilePlayers.json`;
            break;
        case "GK":
            filePath = `positionData/${SEASON}/GKPercentilePlayers.json`;
            break;

    }

    //remove duplicates from the arrays
    for (let array in rawData){
        let uniqueSet = new Set(rawData[array]);
        rawData[array] = [...uniqueSet];
    }

    return new Promise(async function (resolve, reject) {
        await fs.writeFile(path.join(__dirname, filePath), JSON.stringify(rawData, null, '\t'), function(err) {
            if (err) {
                console.log(err);
            }
            resolve();
        });
    });

};


console.time('player positions scraped');
setup()
    .then(async() => {
        return new Promise(function (resolve, reject) {
            (async function loop() { //special syntax to call asynchronous function in a loop
                for (let i=0; i<URLs.length; i++){
                    await new Promise(function (resolve, reject) {
                        page.goto(URLs[i], {waitUntil: 'networkidle2'})
                            .then(async () => {
                                await getPlayersByPosition("FW")
                            })
                            .then(async () => {
                                await getPlayersByPosition("W")
                            })
                            .then(async () => {
                                await getPlayersByPosition("AM")
                            })
                            .then(async () => {
                                await getPlayersByPosition("WM")
                            })
                            .then(async () => {
                                await getPlayersByPosition("CM")
                            })
                            .then(async () => {
                                await getPlayersByPosition("DM")
                            })
                            .then(async () => {
                                await getPlayersByPosition("FB")
                            })
                            .then(async () => {
                                await getPlayersByPosition("CB")
                            })
                            .then(async () => {
                                await getPlayersByPosition("GK");
                                resolve()
                            })
                    });
                }
                resolve();
            })();
        })
    })
    .then(async () => {
        await populatePercentilePlayers()
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["FW"], "FW")
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["AM"], "AM")
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["CM"], "CM")
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["FB"], "FB")
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["CB"], "CB")
    })
    .then(async () => {
        await saveData(PERCENTILE_PLAYERS["GK"], "GK")
    })
    .then(() => {
        return new Promise(async function (resolve, reject) {
            await fs.writeFile(path.join(__dirname, `positionData/${SEASON}/appsPerPosition.json`), JSON.stringify(APPEARANCES_PER_POSITION_COUNTER, null, '\t'), function(err) {
                if (err) {
                    console.log(err);
                }
                resolve();
            });
        });
    })
    .then(async () => {
        console.timeEnd('player positions scraped'), process.exit(0)
    })
    .catch(async(anError) => {
        console.log(anError);
        process.exit(-1);
    });
