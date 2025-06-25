const express = require('express');
const router = express.Router();
const tools = require("../tools");
const axios = require("axios");
const cheerio = require('cheerio');
const ics = require("ics");
const fs = require('fs');
const events = require("events");
const moment = require("moment");
const os = require("os");
const { chromium } = require('playwright');

const eventEmitter = new events.EventEmitter();
const validTeams = [ "red", "gold", "teal", "purple", "blue", "orange", "royal", "tan", "lime", "grey", "brown", "brass", "white", "kelly", "coral", "yellow", "copper", "violet" ];
const leagueList = [ {value:"", name:"Select Your League", label:"", id: 0 }, 
    {value:"http://www.twinrinks.com/recl/leisure-schedule.php", name:"Leisure League", label: "leisure", id: 1} ,
    {value:"http://www.twinrinks.com/recb/bronze-schedule.php", name:"Bronze League", label: "bronze", id: 2 },
    {value:"http://www.twinrinks.com/recs/silver-schedule.php", name:"Silver League", label: "silver", id: 3},
    {value:"http://www.twinrinks.com/recg/gold-schedule.php", name:"Gold League", label: "gold", id: 4},
    {value:"http://www.twinrinks.com/recp/platinum-schedule.php", name:"Platinum League", label:"platinum", id: 5},
    {value:"http://twinrinks.com/recd/diamond-schedule.php", name:"Diamond League", label:"diamond", id: 6}];
const maxExpires = 1000 * 60 * 1440 * 365 * 5; // ~5 years
const standardExpires = 1000 * 60 * 1440 * 180; // ~6 months

//Update user data in cookies.
router.post(['/twinrinks/saveUser', '/saveUser'], function(req, res) {
    let body = req.body;
    let username = body.UserID;
    let showSubGames = body.ShowSubGames;
    
    try {
        
        res.cookie("BGShowSubGames", showSubGames,  {maxAge: standardExpires});
        
        //Only update user/password if a password was entered...
        if (body.Password)
        {
            let password = tools.encrypt(body.Password);
            res.cookie("BGPassword", password, {maxAge: maxExpires});
            res.cookie("BGUserID", username,  {maxAge: maxExpires});
        }    

        tools.logData(`TR: Storing user information for ${username}.`, "INFO", req.socket.remoteAddress);
        
        return res.send('success');
    }
    catch (exception) {
        tools.logError(`TR: Failed to save user information: ${exception}`, req.socket.remoteAddress);
        return res.send('Unable to save user information.' + exception);
    }
});

//Process team or league selection
router.post(['/twinrinks', '/'], function(req, res) {
    let bodyPostBack = req.body;
    let teamList = bodyPostBack.lblTeamList;
    let team = "";
   
    try {
        if (Array.isArray(teamList))
            team = teamList.join();
        else
            team = teamList;

        //Get the selected league and set the cookie 
        let league = leagueList.find(o => o.value === bodyPostBack.leagueSelection).label;    
        
        //Set the cookies if they don't already match
        if ((req.cookies.BGLeague != league) && (league != ""))
        {
            //if we changed leagues wipe out the selected team
            team = "All Teams";
            res.cookie("BGLeague", league, {maxAge: standardExpires});
        }

        if ((team != null) && (req.cookies.BGTeam != team))
        {
            //If we are not already just all teams and it has been added then set to just all teams.
            if (team.indexOf("All Teams") != -1)
            {
                if (req.cookies.BGTeam == "All Teams")
                    team = team.replace("All Teams,", "");
                else
                    team = "All Teams";
            }

            res.cookie("BGTeam", team, {maxAge: standardExpires});
        }
    }
    catch (error) {
        let dummy = JSON.stringify(bodyPostBack);        
        tools.logData(`TR: Post Back Info: ${dummy}. Failed to select league/team: ${error}`, "ERROR", req.socket.remoteAddress); 
    }
    return res.redirect(req.get('Referrer') || '/');
});

//Build the link to twin rinks here to protect the password from being in client side
router.post(['/twinrinks/gameLink', '/gameLink'], function(req, res) {

    let body = req.body;   
    let games = body.games;
    let BGUserID = req.cookies.BGUserID;
    if ((BGUserID !== undefined) && (games != undefined && games.length > 0))
    {
        try {
            let retValue = MultiCheckIn(games, req);
            if (retValue == "success") { 
                let msg = "";
                for(let i=0;i<games.length;i++) {
                    let gameNode = games[i];
                    let status = (gameNode.checkIn == "true") ? "Checked In" : "Checked Out";
                    msg += `TR: ${BGUserID} successfully ${status} for game: ${gameNode.gameNode}.<br />`;
                }                
                tools.logData(msg, "Info", req.socket.remoteAddress);
            }
            res.send(retValue);
        }
        catch (err)
        {
            let error_message = `Failed checkin: ${err}`
            tools.logError(error_message, req.socket.remoteAddress);
            return res.send("http://www.twinrinks.com/adulthockey/subs/subs_entry.html");
        }        
    }
    else {
        try{           
            let link = `http://twinrinks.com/adulthockey/subs/subs_entry.php?subs_data1=${BGUserID}&subs_data2=${tools.decrypt(req.cookies.BGPassword)}`;
            tools.logData(`TR: ${BGUserID} redirected to check in screen on twin rinks.`, "Info", req.socket.remoteAddress);
            return res.send(link);
        }
        catch(err) 
        {
            tools.logError(`Unable to decrypt password for auto login link: ${err}`, req.socket.remoteAddress);
            return res.send("http://www.twinrinks.com/adulthockey/subs/subs_entry.html");
        }  
    }
});

router.post(['/twinrinks/clearCookies','/clearCookies'] , function(req, res) {
    try {
        let resetLeague = req.body.ResetLeague;
        let resetUser = req.body.ResetUser;
        for (const cookieName in req.cookies) {
            if (resetLeague)
            {
                if (cookieName == "BGLeague" || cookieName == "BGTeam" || cookieName == "BGShowSubGames")
                    res.clearCookie(cookieName);
            }            
            if (resetUser) 
            {
                if (cookieName == "BGUserID" || cookieName == "BGPassword")
                    res.clearCookie(cookieName);    
            }              
        }
        res.send('success');
    }
    catch (error) {
        tools.logError(`TR: Failed to clear cookies: ${error}`, req.socket.remoteAddress);
        res.send('Unable to clear settings.' + error);
    }
});

//Get the calendar entry return as a separate file
router.get(['/twinrinks/CalendarItem.ashx', '/CalendarItem.ashx'], function(req, res) {
    
    //Setup the return to be a calender item(s)
    res.contentType("text/calendar");
    res.header("content-disposition", "inline;filename=CalendarEvent.ics");

    try {
        //If we are asking for a whole season grab the cached file
        if ((req.query.league) && (req.query.team))
        {
            let league = req.query.league;        
            if (league.includes('http'))
            {
                try {
                    league = league.replace(" ", "%20");
                    league = leagueList.find(o => o.value === league).label; 
                }
                catch (error)
                {
                    tools.logData(`TR: Failed to build calendar unknown league: ${error}`, "ERROR", req.socket.remoteAddress);  
                    res.send("");
                    return;
                }
            }
            let eventList = [];       
            let myTeams = req.query.team.split(",");
            let cacheFileName = 'public/config/' + league + '.json';
            let fileData = JSON.parse(fs.readFileSync(cacheFileName));
            let gameFileData = fileData.gameData;
            
            //Now process gamelist from full data...
            for(let i=0;i<gameFileData.length;i++)
            {
                let game = gameFileData[i];     
                let gd = moment(game.gameDate, "ddd MMM, D - hh:mm A").toDate();

                //Only add game if the team is listed in it and it is in the future
                if (gd > Date.now())
                {                
                    //If no team is select or the team matches a selected one add to list to display
                    if (myTeams.includes(game.home) || myTeams.includes(game.away))
                    {                    
                        //Build the calendar event for the entry                
                        let event = {};
                        event.title = game.home + " vs " + game.away;
                        event.description = `Game Date: ${game.gameDate.replace(",", "")}\nHome Team: ${game.home}\nAway Team: ${game.away}\nRink: ${game.rink}`;
                        event.location = "Twin Rinks: " + game.rink;
                        event.start = [gd.getFullYear(), gd.getMonth() + 1, gd.getDate(), gd.getHours(), gd.getMinutes()];
                        event.duration = { minutes: 90 };
                        eventList.push(event);
                    }
                }
            } 
            const { error, value } = ics.createEvents(eventList);
            if (error)
                tools.logData(`TR: Failed to build calendar: ${error}`, "ERROR", req.socket.remoteAddress);
            else
                tools.logData(`TR: Building calendar info for league: ${req.query.league}, team: ${req.query.team}`, "INFO", req.socket.remoteAddress);
            
            res.send(value);
        }
        else if (req.query.gameDate)
        {        
            let gameDate = req.query.gameDate;
            let homeTeam = req.query.home;
            let awayTeam = req.query.away;
            let rink = req.query.rink;
            
            //User regex to split on ANY matches space comma or dash and remove blank entries with filter...
            let dp = gameDate.split(/[ ,-]/).filter(Boolean);
            let year = new Date().getFullYear();
            let dateString = `${dp[1]} ${dp[2]}, ${year} ${dp[3]} ${dp[4]}`;
                
            //Check if the game is next year and adjust accordingly...
            let gd = new Date(Date.parse(dateString));
            if (gd < Date().now)
                year++;

            const { error, value } = ics.createEvent({
                title: homeTeam + " vs " + awayTeam,
                description: `Game Date: ${gameDate.replace(",", "")}\nHome Team: ${homeTeam}\nAway Team: ${awayTeam}\nRink: ${rink}`,
                location: "Twin Rinks: " + rink,
                start: [year, gd.getMonth() + 1, gd.getDate(), gd.getHours(), gd.getMinutes()],
                duration: { minutes: 90 }
            });
            if (error)
                tools.logData(`TR: Failed to build calendar: ${error}`, "ERROR", req.socket.remoteAddress);
            else
                tools.logData(`TR: Building calendar info for game: ${gameDate}, teams: ${homeTeam}/${awayTeam}`, "INFO", req.socket.remoteAddress);
            
                res.send(value);
        }    
        else
            res.send("");
    }
    catch (error)
    {
        tools.logData(`TR: Failed to build calendar for request: ${error}`, "ERROR", req.socket.remoteAddress);  
        res.send("");
        return;
    }
});

//Legacy page just load main
router.get(['/twinrinks/BGMobileSched.aspx', '/BGMobileSched.aspx'], function(req, res)
{
    LoadMain(req,res);
});

// Display Main page 
router.get('/', function(req, res) {
    LoadMain(req, res);
});    

// Display the main page 
function LoadMain(req, res)
{
    let leagueID = 0;
    tools.logData(`TR: Page host: ${req.headers.host}, URL: ${req.url}, Original URL: ${req.originalUrl}`, "DEBUG", req.socket.remoteAddress);
    //Must register the listener BEFORE the emit method..
    eventEmitter.once("ProcessComplete", function(teamList, gameList, error) 
    {  
        return res.render("index", { title: 'Twin Rinks Schedule', leagueList, teamList, team, gameList, league, showSubGames, UserID, error, leagueID });          
    });      

    //Read parameters if they exist store as cookies 
    let league = req.cookies.BGLeague;
    let team = req.cookies.BGTeam
    let showSubGames;
    if (req.cookies.BGShowSubGames)
        showSubGames = (req.cookies.BGShowSubGames == "true") ? "checked" : undefined;
    let UserID = req.cookies.BGUserID;

    //If the league is selected grab it now
    if (league != null)
    {
        //Update cookie if it isn't already set
        if (req.cookies.BGLeague != league)
            res.cookie("BGLeague", league, {maxAge: standardExpires});
        //TODO: Change this to the draft date for the league
        if ((team != null) && (req.cookies.BGTeam != team))
            res.cookie("BGTeam", team, {maxAge: standardExpires});
        
        //Match the league label and load the data when found.
        let loadTeamCheck = {};
        for(let i=0;i<leagueList.length;i++)
        {
            let item = leagueList[i];
            if (league == item.label) {
                leagueID = i;
                loadTeamCheck = item;                
            }
        }

        //Log data before calling load teams
        tools.logData(`TR: Loading data for league: ${league}, team(s): ${team}`, "INFO", req.socket.remoteAddress);

        //If we have an object load the teams now
        if (Object.keys(loadTeamCheck).length)
            LoadTeams(req, loadTeamCheck, team);                     
    }
    else
    {
        tools.logData(`TR: Twinrinks page loaded with no selections.`, "INFO", req.socket.remoteAddress);
        leagueID = 0;
        eventEmitter.emit("ProcessComplete", [], [], "No league selected.");
    }
}

//Load the data for a selected league (filter by team if provided)
async function LoadTeams(req, league, teamName)
{
    let teamList = [];    
    let myTeams = [];
    let teamGameList = [];
    let gameFileData = [];
    let rawTeamList = [];
    let rawGameData = [];
    let BGPassword;
    let BGShowSubGames = false;
    let loadFromCache = false;
    let BGUserID = req.cookies.BGUserID;
 
    if (BGUserID)
    {
        try
        {
            BGPassword = tools.decrypt(req.cookies.BGPassword);
            BGShowSubGames = req.cookies.BGShowSubGames;
        }
        catch (err)
        {
            tools.logData(`TR: Unable to decrypt password for user: ${BGUserID}, Error: ${err}`, "ERROR", req.socket.remoteAddress);
        }
    }
    if (teamName)
        myTeams = teamName.split(",");       
    
    tools.logData("TR: About to load user info", "DEBUG", req.socket.remoteAddress);

    //Wait till we have the user info loaded (to track check-in/sub games) before processing
    eventEmitter.once("UserLoadComplete", async function(subGames, error) 
    {
        tools.logData("TR: Done loading user info", "DEBUG", req.socket.remoteAddress);
    
        //Cache the data to a file and only pull weekly
        let cacheFileName = 'public/config/' + league.label + '.json';
        let daysOld = Number.MAX_SAFE_INTEGER;
        if (fs.existsSync(cacheFileName))
        {
            //Check date and if so use instead of reloading from website
            let stats = fs.statSync(cacheFileName);
            daysOld = (new Date().getTime() - stats.mtime) / (1000 * 60 * 1440);        
        }

        //If the file is new enough lets use it.  Let's not use this code for now as it is not working correctly.
        if (daysOld < req.app.locals.twinRinksDays)        
        {
            tools.logData(`TR: Loading data from cache file: ${cacheFileName}`, "INFO", req.socket.remoteAddress);
            loadFromCache = true;
            let fileData = JSON.parse(fs.readFileSync(cacheFileName));
            teamList = fileData.teamList;
            gameFileData = fileData.gameData;

            //Now process gamelist from full data...
            for(let i=0;i<gameFileData.length;i++)
            {
                let subGame = false;
                let game = gameFileData[i];                                      

                //Only add game if the team is listed in it and it is in the future
                if (game.rawDate > Date.now())
                {
                    if (subGames.length > 0)
                    {
                        let matchedGame =  subGames.find(o => o.rawDate === game.rawDate);
                        if (matchedGame)
                        {
                            subGame = true;
                            game.status = matchedGame.Attendence;
                            game.displayText = matchedGame.displayText;
                            game.teamOrSub = matchedGame.TeamorSub;     
                            game.SubInfo = matchedGame.SubInfo;     
                            game.NodeName = matchedGame.NodeName;        
                        }                                   
                    }       
                    
                    if (game.away.includes("cancelled"))
                    {
                        game.displayText = "Cancelled";
                        game.status = "cancelled";
                    }

                    //Build a list of all home/away teams listed
                    let gameHomeList = game.home.toLowerCase().split(/[ //-]/);
                    let gameAwayList = game.away.toLowerCase().split(/[ //-]/);
                    
                    let homeMatch = (myTeams.filter(element => gameHomeList.includes(element.toLowerCase())).length > 0);
                    let awayMatch = (myTeams.filter(element => gameAwayList.includes(element.toLowerCase())).length > 0);

                    let validHomeMatch = (validTeams.filter(element => gameHomeList.includes(element.toLowerCase())).length > 0);
                    let validAwayMatch = (validTeams.filter(element => gameAwayList.includes(element.toLowerCase())).length > 0);
                    
                    //If no team is select or the team matches a selected one add to list to display
                    if (subGame)
                        teamGameList.push(game);
                    else if (!teamName || homeMatch || awayMatch || myTeams.includes("All Teams"))
                        teamGameList.push(game);
                    else if (myTeams.includes("Playoffs") && ((validHomeMatch == false) || (validAwayMatch == false)))
                        teamGameList.push(game);
                }
            }

            for (let i=0;i<teamList.length;i++)
            {
                let item = teamList[i];
                if ((myTeams.includes(item.teamName) == false) && item.selected)
                    delete teamList[i].selected;
                else if (myTeams.includes(item.teamName))
                    teamList[i].selected = "selected";
            }
        }
        else
        {            
            tools.logData(`TR: Loading data from twinrinks website url: ${league.value}`, "INFO", req.socket.remoteAddress);
            //Initialize the team list
            if (teamName) 
                teamList.push({ teamName: "All Teams" });
            else
                teamList.push({ teamName: "All Teams", selected: "selected"});
            teamList.push({ teamName: "Playoffs" });
            //Build the raw team list for caching..
            rawTeamList.push({ teamName: "All Teams", selected: "selected" });
            rawTeamList.push({ teamName: "Playoffs" });

            //Get the schedule page from twin rinks website
            let schedulePage = await axios.get(league.value);
            const $ = cheerio.load(schedulePage.data);
            $('#div_tab > table > tbody > tr ').each((index, element) => 
            {
                //Skip the header row
                if(index==0)
                    return; 
                let children = $(element).children();
                let game = {};
                let subGame = false;
                let gameDate = new Date($(children[0]).text());
                let rawStringDate = moment(gameDate).format("ddd MMM D, YYYY") + " - " + $(children[3]).text().replace("P", " PM");              
                game.gameDate = moment(gameDate).format("ddd MMM, D") + " - " + $(children[3]).text().replace("P", " PM");
                game.rink = $(children[2]).text();                
                game.home = tools.UpperCase($(children[5]).text().split("-")[0]);
                game.away = tools.UpperCase($(children[6]).text().split("-")[0]);
                game.rawDate = moment(rawStringDate, "ddd MMM D, YYYY - hh:mm A").valueOf(); 
                if ($(children[6]).text().includes("cancelled"))
                {
                    game.status = "cancelled";
                    game.displayText = "Cancelled";
                }
                else {
                    game.status = "blank";
                    game.displayText = "Unknown";                
                }
                game.teamOrSub = "Team";
                //Push the game to the raw game list for caching prior to enhancing with user data
                let tempGame = JSON.parse(JSON.stringify(game));
                rawGameData.push(tempGame);

                if (subGames.length > 0)
                {
                    let matchedGame =  subGames.find(o => o.rawDate === game.rawDate);
                    //Need to do some more matching beyond just the date
                    if (matchedGame)
                    {
                        subGame = true;
                        game.status = matchedGame.Attendence;
                        game.displayText = matchedGame.displayText;
                        game.teamOrSub = matchedGame.TeamorSub;    
                        game.SubInfo = matchedGame.SubInfo;   
                        game.NodeName = matchedGame.NodeName;            
                    }                   
                }
                
                if ((teamList.filter(teamList => teamList.teamName === game.home) == false) && (validTeams.includes(game.home.toLowerCase())))
                {
                    let homeTeam = {};
                    homeTeam.teamName = game.home;
                    //Push team to raw team list for caching prior to selecting
                    rawTeamList.push({ teamName: game.home});

                    if (myTeams.includes(game.home))
                        homeTeam.selected = "selected";
                    teamList.push(homeTeam);
                }

                if ((teamList.filter(teamList => teamList.teamName === game.away) == false) && (validTeams.includes(game.away.toLowerCase())))
                {
                    let awayTeam = {};
                    awayTeam.teamName = game.away;
                    //Push team to raw team list for caching prior to selecting
                    rawTeamList.push({teamName: game.away});

                    if (myTeams.includes(game.away))
                        awayTeam.selected = "selected";
                    teamList.push(awayTeam);
                }
                
                //Only add game if the team is listed in it and it is in the future                
                if (game.rawDate > Date.now())
                {
                     //Build a list of all home/away teams listed
                     let gameHomeList = game.home.toLowerCase().split(/[ //-]/);
                     let gameAwayList = game.away.toLowerCase().split(/[ //-]/);
                     
                     let homeMatch = (myTeams.filter(element => gameHomeList.includes(element.toLowerCase())).length > 0);
                     let awayMatch = (myTeams.filter(element => gameAwayList.includes(element.toLowerCase())).length > 0);
                     
                    //If no team is select or the team matches a selected one add to list to display
                    if (subGame)
                        teamGameList.push(game);
                    else if (!teamName || homeMatch || awayMatch || myTeams.includes("All Teams"))
                        teamGameList.push(game);
                    else if (myTeams.includes("Playoffs") && ((validTeams.includes(game.home.toLowerCase()) == false) || (validTeams.includes(game.home.toLowerCase()) == false)))
                        teamGameList.push(game);
                }
                gameFileData.push(game);           
            });
        }

        //Store the data in a file...
        if (loadFromCache == false)
        {
            let fileData = {}
            fileData.gameData = rawGameData;
            fileData.teamList = rawTeamList;
            fs.writeFileSync(cacheFileName, JSON.stringify(fileData));
        }

        //Signal we are done
        eventEmitter.emit("ProcessComplete", teamList, teamGameList, error);
        return;
    });

    if ((teamName) && (BGUserID) && (BGPassword)) {
        try {
            LoadUserInfo(teamName, BGUserID, BGPassword, BGShowSubGames, req.socket.remoteAddress);
        }
        catch (err)
        {
            tools.logError(`TR: Error loading user info: ${err}`, req.socket.remoteAddress);
            eventEmitter.emit("UserLoadComplete", [], "Failed to load user information.");
        }
    }
    else    
        eventEmitter.emit("UserLoadComplete", [], "");    
}

//Load all sub games and user game statuses here..
async function LoadUserInfo(teamName, BGUserID, BGPassword, BGShowSubGames, ipAddress) {
    let userGameList = [];
    let body = "";

    if ((teamName) && (BGUserID) && (BGPassword))
    {
        tools.logData(`TR: Loading Game Data for User: ${BGUserID}, Team(s): ${teamName}`, "INFO", ipAddress);
        try 
        {
            const browser = await chromium.launch({headless: true});
            const context = await browser.newContext({ignoreHTTPSErrors: true});
            const page = await context.newPage();
            await page.goto('https://www.twinrinks.com/adulthockey/subs/subs_entry.html');
            await page.locator('input[name="subs_data1"]').click();
            await page.locator('input[name="subs_data1"]').fill(BGUserID);
            await page.locator('input[name="subs_data1"]').press('Tab');
            await page.locator('#myInput').fill(BGPassword);
            await page.getByRole('button', { name: 'Login!' }).click();            

            // Now you are on the page after login
            await page.waitForLoadState('networkidle'); 

            // Get the body content of the new page
            body = await page.content();        
            
            await context.close();
            await browser.close();           
        }
        catch (exp)
        {
            tools.logData(`TR: Unable to login to twinrinks website, Error: ${exp}`, "ERROR", ipAddress);
        }
        
        try {
            let now = new Date();
            let unix = moment(now).unix();                    
            fs.writeFileSync(`${os.tmpdir()}\\tempresults_${unix}.html`, body)
        }
        catch(err) {
            tools.logData(`TR: Unable to save temp file, Error: ${err}`, "ERROR", ipAddress);
        }
        
        //body = fs.readFileSync("D://temp//tempresults_1689899142.html");
        const $ = cheerio.load(body);
        
        let gameNodes = $('input[name^="g"]');
        if (gameNodes.length == 0)
        {
            //do something here 
            let sMessage = `No games found for user: ${BGUserID}. `;
            //Scrub big pointless warning messages.
            if (body.includes("Check if you are available to sub"))
                sMessage += "No current games on schedule";
            else if (body.includes("invalid_login"))
                sMessage += "Invalid login information";

            tools.logData(`TR: ${sMessage}`, "WARN", ipAddress);
            eventEmitter.emit("UserLoadComplete", userGameList, sMessage);
            return;
        }
        else
        {                    
            let gameID = 1;
            let key = "g1";
            let gameNodes =  $('input[name="g1"]');
            let gameDate = new Date();
            while (gameNodes.length > 0) {                    
                //Build structure with results to embed in existing structure...
                let gameNode = gameNodes[0];
                let gameEntry = {};                                   
            
                let nodeName = gameNode.attribs.name;
                let nodeValue = gameNode.attribs.value;                        
                let pieces = nodeValue.split(/[ ]/).filter(Boolean);
            
                let attendenceNodes = $(`input[name^="${nodeName}i"]`); 
                let attendence = "Unknown";
                for(let i=0;i<attendenceNodes.length;i++)
                {
                    let node = attendenceNodes[i];
                    try {
                        if (node.attribs.checked != null)
                        {
                            attendence = node.attribs.value;
                            break;
                        }
                        else if (node.nextSibling.data && node.nextSibling.data.trim() == "You are not available")
                        {
                            attendence = "OUT";
                            break;
                        }
                    }
                    catch (err) {
                        tools.logError(`Error parsing attendence nodes: ${err}`, ipAddress);
                    }
                }

                //Check if it is a sub game and get date from 0/2 instead of 1/3 pieces..
                if (pieces.length < 6)
                {
                    let dateString = pieces[0] + " " + pieces[2].replace("P", " PM").replace("A", " AM");
                    gameDate = Date.parse(dateString);
                    try {
                        if (gameNode.nextSibling.next.next.data != null && gameNode.nextSibling.next.next.data.trim() == "You are not available")
                            attendence = "SubOut";
                        else if (gameNode.nextSibling.nextSibling.firstChild.firstChild != null) {
                            let subInfo = gameNode.nextSibling.nextSibling.firstChild.firstChild.data.trim();
                            gameEntry.SubInfo = subInfo;
                        }
                    }
                    catch(err) {
                        tools.logWarn(`Unable to get subinfo. Error: ${err}`, ipAddress);
                    }
                    
                    if (attendence == "Unknown")
                        attendence = "SubUnknown";
                    else if (attendence == "SubOut")
                        attendence = "SubOut";
                    else if (attendence != "IN")
                        attendence = "Sub";
                    gameEntry.TeamorSub = "Sub";
                }
                else
                {
                    let dateString = pieces[1] + " " + pieces[3].replace("P", " PM").replace("A", " AM");
                    gameDate = Date.parse(dateString);
                    gameEntry.TeamorSub = "Team";
                }

                let formatDate = moment(gameDate).toLocaleString();
                gameEntry.rawDate = gameDate;
                gameEntry.Date = formatDate;
                gameEntry.NodeName = nodeName;
                
                gameEntry.Attendence = attendence;
                switch (attendence.toUpperCase()) {
                    case "IN": 
                        gameEntry.displayText = "Checked In";
                        break;
                    case "OUT":
                        gameEntry.displayText = "Checked Out";
                        break;
                    case "Unknown":
                        gameEntry.displayText = "Not Set";
                        break;
                    case "SUBOUT":
                        gameEntry.displayText = "Not Available"
                        break;
                    case "SUB":
                        gameEntry.displayText = "Sub Request";
                        break;
                    default:
                        gameEntry.displayText = "Unknown";
                }
                
                //Only add in sub games if flag is set...
                if ((BGShowSubGames == "true") || (gameEntry.TeamorSub == "Team") || (gameEntry.Attendence == "IN") || (gameEntry.Attendence == "Sub")) {                        
                    userGameList.push(gameEntry);
                }
                                        
                gameID++;
                key = `g${gameID}`;
                gameNodes = $(`input[name="${key}"]`);
            }
        }               
        tools.logData(`TR: Loading user info: ${BGUserID}`, "INFO", ipAddress);                 
        eventEmitter.emit("UserLoadComplete", userGameList, "");
        return;
    }
}

//Check In/Out of a game keep all games in a session
function MultiCheckIn(games, req)
{
    try{
        let BGUserID = req.cookies.BGUserID;
        let BGPass = tools.decrypt(req.cookies.BGPassword);

        //If last checkin was less than 10 minutes ago don't allow another checking    
        let lastCheckin = req.cookies.lastCheckin;        
        if ((lastCheckin !== undefined) && ((Date.now() - lastCheckin) < 600000))
        {
            try
            {           
                let link = `http://twinrinks.com/adulthockey/subs/subs_entry.php?subs_data1=${BGUserID}&subs_data2=${tools.decrypt(req.cookies.BGPassword)}`;
                tools.logData(`TR: ${BGUserID} redirected to check in screen on twin rinks.`, "Info", req.socket.remoteAddress);
                return link;
            }
            catch(err) 
            {
                tools.logError(`Unable to build auto login link: ${err}`, req.socket.remoteAddress);
                return "http://www.twinrinks.com/adulthockey/subs/subs_entry.html";
            }  
        }
        else
        {                
            (async () => {
                const browser = await chromium.launch({headless: true});
                const context = await browser.newContext({ignoreHTTPSErrors: true});
                const page = await context.newPage();
                await page.goto('https://www.twinrinks.com/adulthockey/subs/subs_entry.html');
                await page.locator('input[name="subs_data1"]').click();
                await page.locator('input[name="subs_data1"]').fill(BGUserID);
                await page.locator('input[name="subs_data1"]').press('Tab');
                await page.locator('#myInput').fill(BGPass);
                await page.getByRole('button', { name: 'Login!' }).click();
            
                for(let i=0;i<games.length;i++)
                {
                    let gameNode = games[i].gameNode;
                    let checkIn = games[i].checkIn;
                    
                    //IF this is a sub game then there is no nth(1) you must toggle the nth(0) instead
                    if (checkIn == 'false')
                    {
                        if ((await page.locator('input[name="' + gameNode + '"]').nth(1).count())>0)
                            await page.locator('input[name="' + gameNode + '"]').nth(1).check();
                        else
                            await page.locator('input[name="' + gameNode + '"]').nth(0).uncheck();                        
                    }
                    else
                        await page.locator('input[name="' + gameNode + '"]').nth(0).check();
                }                               
                await page.getByRole('button', { name: 'Submit' }).click();
            
                // ---------------------
                await context.close();
                await browser.close();
            })();
            return "success";
        }
    }
    catch(err) 
    {
        tools.logError(`Error checking in/out: ${err}`, req.socket.remoteAddress);
        return "http://www.twinrinks.com/adulthockey/subs/subs_entry.html";
    }    
}

module.exports = router;