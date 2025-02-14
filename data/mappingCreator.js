const SEASON = "21-22";

//initialize helpers
const path = require('path');
const fs = require('fs');
const countryCodes = require('./countryCodes.js');

//globals to store mappings
var FBREF_TO_WHOSCORED_PLAYERS;
var WHOSCORED_TO_FBREF_PLAYERS;
var FBREF_TO_WHOSCORED_PLAYERS_NEW = {};
var WHOSCORED_TO_FBREF_PLAYERS_NEW = {};
var UNFILLED_MAPPING = {};

//global to track number of mapping collisions. If everything goes well, it should be 0 when the program exits
var COLLISION_COUNTER = 0;

//globals to store fbref data
var EPL; //fbref epl player data
var EPL_GK; //fbref epl gk data

//repeat for the other competitions
var LA_LIGA;
var LA_LIGA_GK;

var SERIE_A;
var SERIE_A_GK;

var BUNDESLIGA;
var BUNDESLIGA_GK;

var LIGUE_1;
var LIGUE_1_GK;

var CHAMPIONS_LEAGUE;
var CHAMPIONS_LEAGUE_GK;

var EUROPA_LEAGUE;
var EUROPA_LEAGUE_GK;

var METADATA; //whoscored player data
var FBREF_TO_WHOSCORED_TEAMS; //fbref to whoscored club name dictionary


let setup = async () => {

    return new Promise(async function(resolve, reject){

        EPL = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/premierLeague.json`)));
        EPL_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/premierLeague_gk.json`)));
        LA_LIGA = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/laLiga.json`)));
        LA_LIGA_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/laLiga_gk.json`)));
        SERIE_A = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/serieA.json`)));
        SERIE_A_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/serieA_gk.json`)));
        BUNDESLIGA = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/bundesliga.json`)));
        BUNDESLIGA_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/bundesliga_gk.json`)));
        LIGUE_1 = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/ligue1.json`)));
        LIGUE_1_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/ligue1_gk.json`)));
        CHAMPIONS_LEAGUE = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/championsLeague.json`)));
        CHAMPIONS_LEAGUE_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/championsLeague_gk.json`)));
        EUROPA_LEAGUE = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/europaLeague.json`)));
        EUROPA_LEAGUE_GK = JSON.parse(fs.readFileSync(path.join(__dirname, `fbrefData/${SEASON}/europaLeague_gk.json`)));

        METADATA = JSON.parse(fs.readFileSync(path.join(__dirname, '/playerData/metadata.json')));
        FBREF_TO_WHOSCORED_TEAMS = JSON.parse(fs.readFileSync(path.join(__dirname, '/teamMappingData/fbrefToWhoscored.json')));

        FBREF_TO_WHOSCORED_PLAYERS = JSON.parse(fs.readFileSync(path.join(__dirname, '/playerMappingData/fbrefToWhoscored.json')));
        WHOSCORED_TO_FBREF_PLAYERS = JSON.parse(fs.readFileSync(path.join(__dirname, '/playerMappingData/whoscoredToFbref.json')));

        resolve();

    });

};


let processEPLData = async () => {

    let competitionName = "Premier League";

    for (let player in EPL){
        processEntry(player, EPL, competitionName, false)
    }

    for (let gk in EPL_GK){
        processEntry(gk, EPL_GK, competitionName, true)
    }


};


let processLaLigaData = async () => {

    let competitionName = "La Liga";

    for (let player in LA_LIGA){
        processEntry(player, LA_LIGA, competitionName, false)
    }

    for (let gk in LA_LIGA_GK){
        processEntry(gk, LA_LIGA_GK, competitionName, true)
    }


};

let processSerieAData = async () => {

    let competitionName = "Serie A";

    for (let player in SERIE_A){
        processEntry(player, SERIE_A, competitionName, false)
    }

    for (let gk in SERIE_A_GK){
        processEntry(gk, SERIE_A_GK, competitionName, true)
    }


};

let processBundesligaData = async () => {

    let competitionName = "Bundesliga";

    for (let player in BUNDESLIGA){
        processEntry(player, BUNDESLIGA, competitionName, false)
    }

    for (let gk in BUNDESLIGA_GK){
        processEntry(gk, BUNDESLIGA_GK, competitionName, true)
    }


};

let processLigue1Data = async () => {

    let competitionName = "Ligue 1";

    for (let player in LIGUE_1){
        processEntry(player, LIGUE_1, competitionName, false)
    }

    for (let gk in LIGUE_1_GK){
        processEntry(gk, LIGUE_1_GK, competitionName, true)
    }


};

let processChampionsLeagueData = async () => {

    let competitionName = "Champions League";

    for (let player in CHAMPIONS_LEAGUE){
        processEntry(player, CHAMPIONS_LEAGUE, competitionName, false)
    }

    for (let gk in CHAMPIONS_LEAGUE_GK){
        processEntry(gk, CHAMPIONS_LEAGUE_GK, competitionName, true)
    }


};

let processEuropaLeagueData = async () => {

    let competitionName = "Europa League";

    for (let player in EUROPA_LEAGUE){
        processEntry(player, EUROPA_LEAGUE, competitionName, false)
    }

    for (let gk in EUROPA_LEAGUE_GK){
        processEntry(gk, EUROPA_LEAGUE_GK, competitionName, true)
    }

};


let processEntry = (aPlayer, competitionData, competitionName, isGoalkeeper) => {

    let isCLorEL = false;
    if (competitionName === "Champions League" || competitionName === "Europa League"){
        isCLorEL = true;
    }

    let playerInfo = competitionData[aPlayer];
    let code = competitionData[aPlayer]['code'];

    if (FBREF_TO_WHOSCORED_PLAYERS[code] !== undefined){
        return;
    }

    //get the fbref name, apps, club and nationality
    let query, apps, mins, club, age, nationality;
    if (!isGoalkeeper){
        query = playerInfo['standard_Player'].substring(0, playerInfo['standard_Player'].indexOf('\\'));
        apps = playerInfo['standard_MP'];
        mins = playerInfo['standard_Min'];
        club = playerInfo['standard_Squad'];
        age = playerInfo['standard_Age'];
        nationality = playerInfo['standard_Nation'].split(" ")[0];
    }
    else {
        query = playerInfo['keeper_Player'].substring(0, playerInfo['keeper_Player'].indexOf('\\'));
        apps = playerInfo['keeper_MP'];
        mins = playerInfo['keeper_Min'];
        club = playerInfo['keeper_Squad'];
        age = playerInfo['keeper_Age'];
        nationality = playerInfo['keeper_Nation'].split(" ")[0];
    }
    if (apps < 4 && competitionName !== "Champions League" && competitionName !== "Europa League"){
        return;
    }
    //convert the nationality from a country code to the full name of the country
    nationality = countryCodes.getCountryName(nationality.toUpperCase());
    //trim the club country if the entry is from CL/EL
    if (isCLorEL){
        club = club.substring(club.indexOf(" ") + 1, club.length);
    }
    //get the whoscored name of the club. exit the function if the whoscored club is undefined, i.e. a club that we don't care about
    let whoscoredClub = undefined;
    if (FBREF_TO_WHOSCORED_TEAMS[club] !== undefined) {
        whoscoredClub = FBREF_TO_WHOSCORED_TEAMS[club]["whoscored"];
    }
    else {
        console.log(club);
        return;
    }
    //find all potential whoscored matches
    let matches = findMatches(query, whoscoredClub, age, isGoalkeeper);

    if (matches.length === 1){
        processMatch(matches[0], competitionName, whoscoredClub, apps, mins, code, nationality, "single");
    }
    else {
        for (let i=0; i<matches.length; i++){
            let match = matches[i];
            processMatch(match, competitionName, whoscoredClub, apps, mins, code, nationality, "multiple");
        }
    }

};


let findMatches = (fbrefName, club, age, isGoalkeeper) => {

    let matchesCounter = {};

    //remove diacritics from the fbrefname and convert to lower case (for comparisons)
    fbrefName = fbrefName
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace("Ø", "O")
        .replace("ø", "o")
        .toLowerCase();

    //split the fbref name into an array. split by spaces and dashes
    let fbrefNameParts = fbrefName.split(" ").join("-").split("-");

    //iterate through all players in PROCESSED and find potential matches
    for (let player in METADATA){

        //checking if we're looking for a goalkeeper, and continue the loop if there is a mismatch
        if ((!isGoalkeeper && METADATA[player]["position"] === "GK") || (isGoalkeeper && METADATA[player]["position"] !== "GK")){
            continue;
        }

        if (METADATA[player]["age"] !== age){
            continue;
        }

        //get a list of clubs a player in PROCESSED has played for in the relevant season
        let clubList = [];
        for (let competition in METADATA[player][SEASON]){
            clubList.push(competition.split(" | ")[1]);
        }

        //check if the current player has an entry for the query club
        if (clubList.includes(club)){

            //get the whoscored name without diacritics and convert it to lower case (for comparisons)
            let whoscoredName = METADATA[player]['simplifiedName'].toLowerCase();
            //split the whoscored name into an array. split by spaces and dashes
            let whoscoredNameParts = whoscoredName.split(" ").join("-").split("-");

            //double loop through whoscored name and fbref name and count matches in results dict
            for (let i=0; i<whoscoredNameParts.length; i++){
                for (let j=0; j<fbrefNameParts.length; j++){
                    if (whoscoredNameParts[i] === fbrefNameParts[j]){
                        if (matchesCounter[player] === undefined){
                            matchesCounter[player] = 1;
                        }
                        else {
                            matchesCounter[player]++;
                        }
                    }
                }
            }

        }

    }

    let matches = [];
    let maxMatches = 1;

    //iterate through the matchesCounter object and push the matches with the highest matchCounter to the 'matches' array
    for (let match in matchesCounter){
        if (!(matchesCounter[match] < maxMatches)){
            if (matchesCounter[match] > maxMatches){
                matches = [];
                maxMatches = matchesCounter[match]
            }
            let temp = JSON.parse(JSON.stringify(METADATA[match]));
            temp['code'] = match;
            matches.push(temp);
        }
    }

    return matches;

};


let processMatch = (match, competitionName, whoscoredClub, apps, mins, fbrefCode, nationality, matchType) => {

    let entries = match[SEASON];

    for (let entry in entries){

        if (
            entry === `${competitionName} | ${whoscoredClub}`
            && match[SEASON][entry]["whoscoredApps"] === apps
            && (match['nationality'] === nationality || Math.abs(match[SEASON][entry]["whoscoredMins"] - mins) <= 5)
        ){
            if (FBREF_TO_WHOSCORED_PLAYERS[fbrefCode] === undefined){
                FBREF_TO_WHOSCORED_PLAYERS_NEW[fbrefCode] = match["code"];
            }
            else if (FBREF_TO_WHOSCORED_PLAYERS_NEW[fbrefCode] !== match["code"]){
                COLLISION_COUNTER++;
                console.log("COLLISION (FBREF TO WHOSCORED - NEW): ", fbrefCode);
                console.log("Original Mapping: ", {
                    whoscoredCode: FBREF_TO_WHOSCORED_PLAYERS_NEW[fbrefCode],
                    whoscoredName: METADATA[FBREF_TO_WHOSCORED_PLAYERS_NEW[fbrefCode]]["name"]
                });
                console.log("New Suggested Mapping: ", {
                    whoscoredCode: match["code"],
                    whoscoredName: METADATA[match["code"]]["name"]
                });

            }
            else if (FBREF_TO_WHOSCORED_PLAYERS[fbrefCode] !== match["code"]){
                COLLISION_COUNTER++;
                console.log("COLLISION (FBREF TO WHOSCORED - OLD): ", fbrefCode);
                console.log("Original Mapping: ", {
                    whoscoredCode: FBREF_TO_WHOSCORED_PLAYERS[fbrefCode],
                    whoscoredName: METADATA[FBREF_TO_WHOSCORED_PLAYERS[fbrefCode]]["name"]
                });
                console.log("New Suggested Mapping: ", {
                    whoscoredCode: match["code"],
                    whoscoredName: METADATA[match["code"]]["name"]
                });

            }
            if (WHOSCORED_TO_FBREF_PLAYERS[match["code"]] === undefined){
                WHOSCORED_TO_FBREF_PLAYERS_NEW[match["code"]] = fbrefCode;
            }
            else if (WHOSCORED_TO_FBREF_PLAYERS_NEW[match["code"]] !== fbrefCode){
                COLLISION_COUNTER++;
                console.log("COLLISION (WHOSCORED TO FBREF - NEW): ", match["code"]);
                console.log("Original Mapping: ", {
                    whoscoredCode: WHOSCORED_TO_FBREF_PLAYERS_NEW[match["code"]],
                });
                console.log("New Suggested Mapping: ", {
                    whoscoredCode: fbrefCode,
                });
            }
            else if (WHOSCORED_TO_FBREF_PLAYERS[match["code"]] !== fbrefCode){
                COLLISION_COUNTER++;
                console.log("COLLISION (WHOSCORED TO FBREF - OLD): ", match["code"]);
                console.log("Original Mapping: ", {
                    whoscoredCode: WHOSCORED_TO_FBREF_PLAYERS[match["code"]],
                });
                console.log("New Suggested Mapping: ", {
                    whoscoredCode: fbrefCode,
                });
            }
        }
    }

};


let saveMapping = async () => {

    return new Promise(async function (resolve, reject) {
        await fs.writeFile(path.join(__dirname, `playerMappingData/fbrefToWhoscoredNew.json`), JSON.stringify(FBREF_TO_WHOSCORED_PLAYERS_NEW, null, '\t'), async function(err) {
            if (err) {
                console.log(err);
                reject();
            }
            await fs.writeFile(path.join(__dirname, `playerMappingData/whoscoredToFbrefNew.json`), JSON.stringify(WHOSCORED_TO_FBREF_PLAYERS_NEW, null, '\t'), async function(err) {
                if (err) {
                    console.log(err);
                    reject();
                }
                for (let player in METADATA){
                    if (WHOSCORED_TO_FBREF_PLAYERS[player] === undefined && WHOSCORED_TO_FBREF_PLAYERS_NEW[player] === undefined){
                        UNFILLED_MAPPING[player] = player;
                    }
                    else
                    {
                        console.log(player);
                    }
                }
                await fs.writeFile(path.join(__dirname, `playerMappingData/unfilledMapping.json`), JSON.stringify(UNFILLED_MAPPING, null, '\t'), async function(err) {
                    if (err) {
                        console.log(err);
                        reject();
                    }
                    resolve();
                });
            });
        });
    });

};


console.time('mapping creation');
setup()
    .then(async () => {
        await processEPLData()
    })
    .then(async () => {
        await processLaLigaData()
    })
    .then(async () => {
        await processSerieAData()
    })
    .then(async () => {
        await processBundesligaData()
    })
    .then(async () => {
        await processLigue1Data()
    })
    .then(async () => {
        await processChampionsLeagueData()
    })
    .then(async () => {
        await processEuropaLeagueData()
    })
    .then(async () => {
        await saveMapping();
    })
    .then(() => {
        console.log("Collisions: " + COLLISION_COUNTER);
        console.timeEnd('mapping creation');
        process.exit(-1)
    })
    .catch(async(anError) => {
        console.log(anError);
        process.exit(-1);
    });

