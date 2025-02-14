//initialize constants
const path = require('path');
const fs = require('fs');
const utilities = require("../server/utilities");

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin());

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

//globals
var BROWSER;
var PAGES = [];
var URLs;
if (SEASON === "18-19"){
    URLs = [
        "https://fbref.com/en/comps/9/1889/2018-2019-Premier-League-Stats",
        "https://fbref.com/en/comps/12/1886/2018-2019-La-Liga-Stats",
        "https://fbref.com/en/comps/11/1896/2018-2019-Serie-A-Stats",
        "https://fbref.com/en/comps/20/2109/2018-2019-Bundesliga-Stats",
        "https://fbref.com/en/comps/13/2104/2018-2019-Ligue-1-Stats",
        "https://fbref.com/en/comps/8/2102/stats/2018-2019-Champions-League-Stats",
        "https://fbref.com/en/comps/19/2103/stats/2018-2019-Europa-League-Stats"
    ];
}
else if (SEASON === "19-20"){
    URLs = [
        "https://fbref.com/en/comps/9/3232/2019-2020-Premier-League-Stats",
        "https://fbref.com/en/comps/12/3239/2019-2020-La-Liga-Stats",
        "https://fbref.com/en/comps/11/3260/2019-2020-Serie-A-Stats",
        "https://fbref.com/en/comps/20/3248/2019-2020-Bundesliga-Stats",
        "https://fbref.com/en/comps/13/3243/2019-2020-Ligue-1-Stats",
        "https://fbref.com/en/comps/8/2900/stats/2019-2020-Champions-League-Stats",
        "https://fbref.com/en/comps/19/2901/stats/2019-2020-Europa-League-Stats"
    ];
}
else if (SEASON === "20-21"){
    URLs = [
        "https://fbref.com/en/comps/9/10728/2020-2021-Premier-League-Stats",
        "https://fbref.com/en/comps/12/10731/2020-2021-La-Liga-Stats",
        "https://fbref.com/en/comps/11/10730/2020-2021-Serie-A-Stats",
        "https://fbref.com/en/comps/20/10737/2020-2021-Bundesliga-Stats",
        "https://fbref.com/en/comps/13/10732/2020-2021-Ligue-1-Stats",
        "https://fbref.com/en/comps/8/10096/stats/2020-2021-Champions-League-Stats",
        "https://fbref.com/en/comps/19/10097/stats/2020-2021-Europa-League-Stats"
    ];
}
else {
    URLs = [
        "https://fbref.com/en/comps/9/Premier-League-Stats",
        "https://fbref.com/en/comps/12/La-Liga-Stats",
        "https://fbref.com/en/comps/11/Serie-A-Stats",
        "https://fbref.com/en/comps/20/Bundesliga-Stats",
        "https://fbref.com/en/comps/13/Ligue-1-Stats",
        "https://fbref.com/en/comps/8/11323/stats/2021-2022-Champions-League-Stats",
        "https://fbref.com/en/comps/19/stats/Europa-League-Stats"
    ];
}
const COMPETITION_NAMES = [
    "Premier League",
    "La Liga",
    "Serie A",
    "Bundesliga",
    "Ligue 1",
    "Champions League",
    "Europa League"
];

const FBREF_TO_WHOSCORED_TEAMS = JSON.parse(fs.readFileSync(path.join(__dirname, '/teamMappingData/fbrefToWhoscored.json')));

var POSSESSION_STATS = {};


/**
 * Launches a browser window using puppeteer and creates the required number of pages
 * @returns {Promise<*>} Promise resolves when the browser has been successfully launched and all pages have been created
 */
let setup = async () => {
    return new Promise(async function(resolve, reject){

        console.time('browser launch');

        BROWSER = await puppeteer.launch({
            headless: false,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-site-isolation-trials"],
            defaultViewport: null
        });
        (async function loop() {
            for (let i=0; i<URLs.length; i++){
                await new Promise(async function (resolve, reject) {
                    PAGES[i] = await BROWSER.newPage();
                    PAGES[i].setDefaultNavigationTimeout(0);
                    await disableImages(PAGES[i]);
                    resolve();
                });
            }
            let pages = await BROWSER.pages();
            await pages[0].close();
            console.timeEnd('browser launch');
            resolve();
        })();

    });
};


/**
 * Disables image loading in puppeteer tabs
 * @param {*} page - The page where image loading is to be disabled
 * @returns {Promise<void>}
 */
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


let loadPages = async () => {

    return new Promise(async function (resolve, reject) {

        (async function loop() {
            for (let i=0; i<URLs.length; i++){
                await utilities.delay(3100);
                await PAGES[i].goto(URLs[i], {waitUntil: 'networkidle2'});
            }
            resolve();
        })();

    });

};


let saveJSONs = async () => {

    return new Promise(function (resolve, reject) {

        let retrieveJSONPromises = [];
        for (let i=0; i<COMPETITION_NAMES.length; i++){
            retrieveJSONPromises.push(retrieveJSON(PAGES[i], COMPETITION_NAMES[i]))
        }
        Promise.all(retrieveJSONPromises).then(
            async (results) => {
                for (let i=0; i<results.length; i++){
                    let currentCompetition = results[i]['competitionName'];
                    POSSESSION_STATS[currentCompetition] = results[i]['possessionStats'];
                }
                await fs.writeFile(path.join(__dirname, `possessionData/${SEASON}.json`), JSON.stringify(POSSESSION_STATS, null, '\t'), async function(err) {
                    if (err) {
                        console.log(err);
                    }
                    resolve()
                });
            }
        )

    });

};


let retrieveJSON = async (page, competitionName) => {

    await page.waitForSelector('#stats_squads_standard_for');

    return await page.evaluate(async (competitionName, FBREF_TO_WHOSCORED_TEAMS) => {

        let possessionStats = {};
        const tds = Array.from(document.querySelectorAll('#stats_squads_standard_for tbody tr [data-stat="possession"]')); //get all td elements in the table
        const ths = Array.from(document.querySelectorAll('#stats_squads_standard_for tbody tr [data-stat="squad"]')); //get all th elements in the table (team names)
        for (let i=0; i<tds.length; i++){
            let teamNameHTML;
            if (competitionName !== "Champions League" && competitionName !== "Europa League"){
                teamNameHTML = ths[i].innerHTML;
            }
            else {
                teamNameHTML = ths[i].innerHTML;
                teamNameHTML = teamNameHTML.substring(teamNameHTML.indexOf('</span>')+7, teamNameHTML.length);
            }
            let teamName = teamNameHTML.substring(teamNameHTML.indexOf('">')+2, teamNameHTML.indexOf('</a>'));
            if (FBREF_TO_WHOSCORED_TEAMS[teamName] === undefined){
                console.log(`Undefined team mapping: ${teamName}`);
                continue;
            }
            teamName = FBREF_TO_WHOSCORED_TEAMS[teamName]["whoscored"];
            possessionStats[teamName] = parseFloat(tds[i].innerHTML);
        }
        console.log(tds);
        console.log(ths);
        return {
            'possessionStats': possessionStats,
            'competitionName': competitionName,
        }

    }, competitionName, FBREF_TO_WHOSCORED_TEAMS);

};


console.time('possession retrieval');
setup()
    .then(async () => {
        await loadPages();
        await saveJSONs();
    })
    .then(() =>
        (console.timeEnd('possession retrieval'), process.exit(0))
    )
    .catch(async (anError) => {
        console.log(anError);
        process.exit(-1);
    });
