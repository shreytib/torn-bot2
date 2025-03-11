const fs = require("fs");
const axios = require('axios');
require('dotenv').config();
const https = require('https');
const WebSocket = require('ws');

const botToken = process.env.BOT_TOKEN;

const { Client, GatewayIntentBits , EmbedBuilder } = require('discord.js');

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
});

// SSL certificates (use your own certificate files)
const serverOptions = {
    cert: fs.readFileSync('./certificate.pem'),
    key: fs.readFileSync('./private-key.pem'),
	passphrase: 'I dont know what I am doing'
};

// Create HTTPS server
const server = https.createServer(serverOptions);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocket.Server({ server });

wss.on('connection', (socket) => {
    console.log('New client connected');
	welcome_msg = {
		message : 'Hello, client',
		payload : 'BAZAAR BOT SPEAKING'
	};
	socket.send(JSON.stringify(welcome_msg));

    // Handle incoming messages
    socket.on('message', (message) => {
        client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] Received message on websocket:\n${message.toString()}` });
    });

	// Handle client disconnection
    socket.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(8080, '0.0.0.0', () => {
    console.log('WebSocket server running on wss://18.153.90.118:8080');
});

// Function to broadcast messages to connected clients
function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

let bot = require("./token.json");
let keys = require("./keys.json");
let factions = require('./factions.json');
let players = require('./players.json');
let stalkList = require('./stalkList.json');
let items = require('./items.json');

let players_blacklist = require("./players_blacklist.json");

let prices = require("./prices.json");
let muggable_blacklist = new Map(require("./muggable_blacklist.json"));
let stalking_blacklist = new Map(require("./stalking_blacklist.json"));

let update = false;
let update2 = false;

let bot_pause = 0;
let temp_keys = {};

const RW_Weapons = ['Mag 7', 'SIG 552', 'Heckler & Koch SL8', 'Jackhammer', 'M16 A2 Rifle', 'Sawed-Off Shotgun', 'Enfield SA-80', 'Benelli M4 Super', 'M4A1 Colt Carbine', 'Ithaca 37', 'ArmaLite M-15A4', 'Blunderbuss', 'Vektor CR-21', 'Benelli M1 Tactical', 'Tavor TAR-21', 'AK-47', 'Steyr AUG', 'XM8 Rifle', 'SKS Carbine', 'Bo Staff', 'Kama', 'Guandao', 'Hammer', 'Yasukuni Sword', 'Leather Bullwhip','Samurai Sword', 'Kitchen Knife', 'Macana', 'Naval Cutlass', 'Metal Nunchaku', 'Frying Pan', 'Katana', 'Dagger', 'Kodachi', 'Crowbar', 'Axe', 'Scimitar', 'Knuckle Dusters', 'Pen Knife','Baseball Bat', 'Butterfly Knife', 'Swiss Army Knife', 'Cricket Bat', 'Sai', 'Chain Whip', 'Claymore Sword', 'Ninja Claws', 'Wooden Nunchaku', 'Spear', 'Diamond Bladed Knife', 'Flail', 'PKM', 'Milkor MGL', 'Stoner 96', 'SMAW Launcher', 'Minigun', 'RPG Launcher', 'M249 SAW', 'Thompson', 'AK74U', 'S&W Revolver', 'TMP', 'BT MP9', 'MP 40', 'MP5 Navy', 'Beretta M9', '9mm Uzi', 'Fiveseven', 'USP', 'Skorpion', 'Taurus', 'Desert Eagle', 'Qsz-92', 'Cobra Derringer', 'Luger', 'Ruger 57', 'MP5k', 'Magnum', 'P90', 'Raven MP25', 'Springfield 1911', 'Bushmaster Carbon 15', 'Lorcin 380', 'Glock 17', 'Beretta 92FS', 'Negev NG-5', 'China Lake', 'Type 98 Anti Tank'];
const RW_Armors = ["Assault", "Riot", "Dune", "Delta", "Marauder", "Sentinel", "Vanguard", "EOD"];

let count_calls = 0;
let fac_api_calls = 0;
let callsUserChecking = 0;
let callsMarketChecking = 0;

let lastMuggerCheck = new Date();

let stalkList_cutoff = 0;

let minimumWaitTimeUser = 10 * 1000; // Minimum wait time in milliseconds
let minimumWaitTimeSE = 4 * 1000; // Minimum wait time in milliseconds

function shortenNumber(num) {
	let prefix = '';
	if(num < 0) prefix = '-';

    num = num.toString().replace(/[^0-9.]/g, '');
    if (num < 1000) {
        return num;
    }
    let si = [
      {v: 1E3, s: "K"},
      {v: 1E6, s: "M"},
      {v: 1E9, s: "B"},
      {v: 1E12, s: "T"},
      {v: 1E15, s: "P"},
      {v: 1E18, s: "E"}
      ];
    let index;
    for (index = si.length - 1; index > 0; index--) {
        if (num >= si[index].v) {
            break;
        }
    }
    return prefix+(num / si[index].v).toFixed(2).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + si[index].s;
}

function convertToMarkdownTable(dataList) {
    let table = '```\n';
    dataList.forEach(row => {
        table += row.join(' | ') + '\n';
    });
    table += '```';
    return table;
}

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function predictStat(data){
	//
	let age = data.age;
	let activity = data.personalstats.other.activity.time;

	let attacksstalemated = data.personalstats.attacking.attacks.stalemate;
	let attacksassisted = data.personalstats.attacking.attacks.assist;
	let attackswon = data.personalstats.attacking.attacks.won;
	let attackslost = data.personalstats.attacking.attacks.lost;

	let revives = data.personalstats.hospital.reviving.revives;

	let statenhancersused = data.personalstats.items.used.stat_enhancers;

	///

	let xantaken = data.personalstats.drugs.xanax;
	let refills = data.personalstats.other.refills.energy;
	let energydrinkused = data.personalstats.items.used.energy_drinks;
	let boostersused = data.personalstats.items.used.boosters;
	let dumpE = data.personalstats.items.found.dump * 5;
	let lsdE = data.personalstats.drugs.lsd * 50;
	let donatordays = data.personalstats.other.donator_days;

	boostersused = boostersused - statenhancersused;

	///

	let attackE = (attackswon + attackslost + attacksstalemated + attacksassisted) * 25;
	let reviveE = revives * 25;
	//let bountyE = data.personalstats.bountiescollected ? data.personalstats.bountiescollected * 25 : 0;
	//let huntingE = (data.personalstats.soutravel) ? data.personalstats.soutravel * 2250 : 0;
	//let totalExpenditure = attackE + reviveE + dumpE + bountyE;
	let totalExpenditure = attackE + reviveE + dumpE;

	let energyDrinksE = energydrinkused * 25;
	let xanE = xantaken * 250;
	let naturalE, naturalE2;

	if(donatordays > 10 && ((activity / (age * 86400)) * 100) >= 0.5){ // donator and more than 50% activity
		naturalE = donatordays * 400; //500??
		naturalE2 = donatordays * 460; // 575??
	} // else if ??
	else { // non donator or less than 50% activity
		naturalE = (activity/5000)*(Math.log2(age)/2.5) * 175;
		naturalE2 = (activity/5000)*(Math.log2(age)/2.5) * 225;
	}

	
	//if(boostersused >= 100) estimatedFHC = boostersused * 0.3 * 100;
	let estimatedFHC = boostersused * 0.9; // 90% of non SE boosters assumed FHCs
	let FHCe = donatordays > 10?  estimatedFHC * 150: estimatedFHC * 100;
	let refillE = donatordays > 10?  refills * 150: refills * 100;

	let totalEGain = energyDrinksE + lsdE + xanE + refillE + naturalE + FHCe;
	let totalEGain2 = energyDrinksE + lsdE + xanE + refillE + naturalE2 + FHCe;

	let eToSpend = totalEGain - totalExpenditure;
	let eToSpend2 = totalEGain2 - totalExpenditure;

	let eToNextGym = [
		['Premier Fitness', 200, 2.0, 5],
		['Average Joes', 500, 2.5, 5],
		['Woody\'s Workout', 1000, 2.95, 5],
		['Beach Bods', 2000, 3.2, 5],
		['Silver Gym', 2750, 3.4, 5],
		['Pour Femme', 3000, 3.6, 5],
		['Davies Den', 3500, 3.7, 5],
		['Global Gym', 4000, 4.0, 5],
		['Knuckle Heads', 6000, 4.35, 10],
		['Pioneer Fitness', 7000, 4.55, 10],
		['Anabolic Anomalies', 8000, 4.85, 10],
		['Core', 11000, 5.05, 10],
		['Racing Fitness', 12420, 5.1, 10],
		['Complete Cardio', 18000, 5.5, 10],
		['Legs, Bums and Tums', 18100, 5.67, 10],
		['Deep Burn', 24140, 6.0, 10],
		['Apollo Gym', 31260, 6.2, 10],
		['Gun Shop', 36610, 6.35, 10],
		['Force Training', 46640, 6.55, 10],
		['Cha Cha\'s', 56520, 6.65, 10],
		['Atlas', 67775, 6.6, 10],
		['Last Round', 84535, 6.75, 10],
		['The Edge', 106305, 6.9, 10]
	];
	//console.log(eToSpend);
	//
	// let eScore = Math.round((eInGym / 100) + (boostersused) + (statenhancersused * 100)).toLocaleString();
	//console.log( (Math.round((eInGym / 100) + (boostersused) + (statenhancersused * 100)) * 1000).toLocaleString() );

	let stats = 1;
	let stats2 = 1;
	let bonus = 1.15; // 1.11
	let happy = 4225;
	let gain;

	function softCapStatsCalculation(eToSpend){
		stats += 2075 * eToSpend + (0.01 * boostersused * eToSpend);
	}

	function softCapStatsCalculation2(eToSpend2){
		stats2 += 6000 * eToSpend2;
	}

	for(var i = 0; i < eToNextGym.length; i++){
		if(eToSpend <= 0) break;
		if(stats >= 50000000){
			softCapStatsCalculation(eToSpend);
			break;
		}

		if(eToSpend >= eToNextGym[i][1]){
			gain = ((eToNextGym[i][2] * 4) * ((0.00019106 * stats) + (0.00226263 * happy) + 0.55)) * (bonus) / 150 * eToNextGym[i][1];
			eToSpend -= eToNextGym[i][1];
		} else {
			gain = ((eToNextGym[i][2] * 4) * ((0.00019106 * stats) + (0.00226263 * happy) + 0.55)) * (bonus) / 150 * eToSpend;
			eToSpend = 0;
		}

		stats += gain;
	}

	for(i = 0; i < eToNextGym.length; i++){
		if(eToSpend2 <= 0) break;
		if(stats2 >= 50000000){
			softCapStatsCalculation2(eToSpend2);
			break;
		}

		if(eToSpend2 >= eToNextGym[i][1]){
			gain = ((eToNextGym[i][2] * 4) * ((0.00019106 * stats2) + (0.00226263 * happy) + 0.55)) * (bonus) / 150 * eToNextGym[i][1];
			eToSpend2 -= eToNextGym[i][1];
		} else {
			gain = ((eToNextGym[i][2] * 4) * ((0.00019106 * stats2) + (0.00226263 * happy) + 0.55)) * (bonus) / 150 * eToSpend2;
			eToSpend2 = 0;
		}

		stats2 += gain;
	}

	if(boostersused < 100) stats += boostersused/5 * 5000;
	if(boostersused < 100) stats2 += boostersused/5 * 20000;

	stats = Math.ceil(Math.min(stats,stats2));
	stats2 = Math.ceil(Math.max(stats,stats2) / Math.log(Math.max(stats,stats2)) * 12);

	//console.log(`Pre SE stats:  ~ [${shortenNumber(Math.min(stats,stats2))}] - [${shortenNumber(Math.max(stats,stats2))}]`);
	let starting_stat = 2500000000;

	if(statenhancersused <= 250){
		starting_stat = 2500000000;
		for (i = 0; i < statenhancersused; i++){
			stats += starting_stat * 0.01;
			stats2 += starting_stat * 0.01;
			starting_stat *= 1.01;
		}
	}
	else if(statenhancersused <= 1000){
		starting_stat = 2500000000;
		for (i = 0; i < statenhancersused/2; i++){ // 50% SEs in each stat
			stats += starting_stat * 0.01 * 2;
			stats2 += starting_stat * 0.01 * 2;
			starting_stat *= 1.01;
		}
	}
	else{
		starting_stat = 2500000000;
		for (i = 0; i < statenhancersused*0.4; i++){ // 40% SEs in 1st and 2nd stat
			stats += starting_stat * 0.01 * 2;
			stats2 += starting_stat * 0.01 * 2;
			starting_stat *= 1.01;
		}
		starting_stat = 2500000000;
		for (i = 0; i < statenhancersused*0.2; i++){ // 20% SEs in 3rd stat
			stats += starting_stat * 0.01;
			stats2 += starting_stat * 0.01;
			starting_stat *= 1.01;
		}
	}

	stats = Math.ceil(Math.min(stats,stats2));
	stats2 = Math.ceil(Math.max(stats,stats2) / Math.log(Math.max(stats,stats2)) * 12);

	let text = `~ ${shortenNumber(Math.min(stats,stats2))} - ${shortenNumber(Math.max(stats,stats2))}`;

	return text;
}

async function calcWorth(data, player_id){
	try{
		let worth = 0;
		let common_items = 0;
		let wep_items = 0;
		let RW_armor_items = 0;
		let other_items = 0;
		let count = 0;
		let accepted_count = 0;
		let value = 0;
	
		if(data.bazaar.length != 0) {
			for(itm of data.bazaar){
				count++;
				value += itm.price * itm.quantity;
				if(itm.type === 'Defensive' && RW_Armors.some(word => itm.name.includes(word))){
					if(itm.name.includes('EOD')){
						RW_armor_items += Math.min(8000000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Sentinel')){
						RW_armor_items += Math.min(3000000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Vanguard')){
						RW_armor_items += Math.min(3000000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Marauder')){
						RW_armor_items += Math.min(1000000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Delta')){
						RW_armor_items += Math.min(800000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Assault')){
						RW_armor_items += Math.min(200000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Riot')){
						RW_armor_items += Math.min(100000000, itm.price);
						accepted_count++;
					}
					else if(itm.name.includes('Dune')){
						RW_armor_items += Math.min(100000000, itm.price);
						accepted_count++;
					}
				}
				else if(itm.type === 'Defensive'){
					// skip general armor
				}
				else if(itm.hasOwnProperty('UID') && RW_Weapons.includes(itm.name)){
					wep_items += Math.min(1000000000, itm.price/2);
					accepted_count++;
				}
				else if(itm.market_price !== 0){
					if(itm.price <= itm.market_price * 1.15){
						common_items += itm.price * itm.quantity;
						accepted_count++;
					}
					else{
						// do not add. stupid price listed for general item that has a market value associated with it.
					}
				}
				else if(itm.type === 'Collectible'){
					other_items += Math.min(200000000, itm.price) * itm.quantity;
					accepted_count++;
				}
				else{
					// other_items += Math.min(1000000, itm.price * itm.quantity);
					// do not add. stupid item
				}
			}
		}
	
		worth += (players[player_id]?.soldValue ?? 0) * 100; // if soldValue is undefined, add 0
		worth += common_items * 20;
		worth += RW_armor_items * 15;
		worth += wep_items * 5;
		worth += other_items * 1;
	
		if(data.personalstats.networth.total < 0){
			worth += data.personalstats.networth.total * 50;
		}
		
		return {worth, count, accepted_count, value};
	}
	catch (error){
		console.log(`ERROR CALCWORTH: ${player_id}\n`, error);
		return client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] Unexpected error in CALCWORTH: ${error.message}\n${error.stack}` });;
	}
}




async function APICall(url, key_id){
	++count_calls;

	let data = {}
    data["data"] = {};
    data["error"] = 0;

	try {
        
		let key = keys[key_id].key;
		let keyname = keys[key_id].holder;

		const response = await axios.get(url, { timeout: 15000 });

		if(!response.data){
            data["error"] = 1;
            return data;
        }

		if (response.data.error) {
            data["error"] = 1;
			const errorCode = response.data.error.code;

			if ([2, 5, 10, 13, 18].includes(errorCode)) {
				if ([5].includes(errorCode)) {
					if (keys.hasOwnProperty(key_id)) {
						delete keys[key_id];
						if (temp_keys.hasOwnProperty(key_id)) {
							temp_keys[key_id]["count"] += 1;
						} else{
							temp_keys[key_id] = {};
							temp_keys[key_id]["key"] = key;
							temp_keys[key_id]["count"] = 1;
						}
					}

					fs.writeFileSync('keys.json', JSON.stringify(keys));
					console.log(`${keyname}'s key is making too many requests! Removing it. Add it back later. Skipping request.`);
                    client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] ${keyname}, your key is making too many requests! Removing it temporarily.` });
                    return data;
				} else{
					if (keys.hasOwnProperty(key_id)) {
						delete keys[key_id];
					}
					fs.writeFileSync('keys.json', JSON.stringify(keys));
					console.log(`${keyname}'s key is invalid, removing and skipping`);
					client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] ${keyname}, your key is invalid! Removing it.` });
                    return data;
				}
			} else if ([8, 9, 14, 17].includes(errorCode)) {
                // Handle other specific errors if needed
                bot_pause += 1;

                //console.log(`${keyname}'s key is giving error: ${errorCode}, skipping`);
				//return client.channels.cache.get(bot.channel_logs).send({ content:`${keyname}, Error Code: ${errorCode} ${response.data.error.error}` });
                return data;
            }
            else {
                console.error(`Unhandled error code: ${errorCode}`);
                client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] Unhandled API error code: ${errorCode} ${response.data.error.error}.\nAPI Key Holder: ${keyname}\nURL: ${url}` });
                return data;
            }
		}

        if (temp_keys.hasOwnProperty(key_id)) {
            delete temp_keys[key_id];
        }

        data["data"] = response.data;
		return data;

		
	} catch(error){
		let data = {};
		data['data'] = {};
        data["error"] = 1;
        let temp = {};
		if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                console.error('Request timed out');
                
                temp["info"] = "Request timed out";
                temp["time"] = new Date();
                temp["message"] = error.message;
                temp["stack"] = error.stack;

				//client.channels.cache.get(bot.channel_error).send({ content:`${temp["info"]} at ${temp["time"]}\n${temp["message"]}\n${temp["stack"]}` });
				return data;

            } else if (error.response) {
				// Handle specific HTTP error codes if needed
                if (error.response.status === 502 || error.response.status === 503 || error.response.status === 504) {
                    bot_pause += 1; // Adjust as per your logic
                    return;
                }
                // The request was made and the server responded with a status code
                console.log('Error status:', error.response.status);
                console.log('Error data:', error.response.data);
                
                temp["info"] = `HTTP error ${error.response.status}`;
                temp["time"] = new Date();
                temp["message"] = error.message;
                temp["stack"] = error.stack;
                
            } else if (error.request) {
                // The request was made but no response was received
                console.log('Error request:', error.request);
                
                temp["info"] = "No Response";
                temp["time"] = new Date();
                temp["message"] = error.message;
                temp["stack"] = error.stack;
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error message:', error.message);
                
                temp["info"] = "Unknown Axios error";
                temp["time"] = new Date();
                temp["message"] = error.message;
                temp["stack"] = error.stack;
            }
        } else {
            console.error('Non-Axios error occurred:', error.message);
            
            temp["info"] = "Unknown non-axios error";
            temp["time"] = new Date();
            temp["message"] = error.message;
            temp["stack"] = error.stack;
        }
        client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] ${temp["info"]} at ${temp["time"]}\n${temp["message"]}\n${temp["stack"]}` });
        return data;
    }
}

async function UserChecking(index, key_id) {
	currdate = parseInt(Date.now()/1000);
	if(players[index].lastBazaarCount === 0 && players[index].soldValue === 0){
		players[index].worth = 0;
		delete stalkList[index];
		return;
	}

	let data = {};
	data['error'] = 1;
	data['data'] = {};

	let url = `https://api.torn.com/v2/user/${index}?selections=profile,bazaar,personalstats&cat=all&from=${currdate}&key=${keys[key_id].key}`;

	data = await APICall(url, key_id);
	callsUserChecking++;

	if(data && data.error === 0){
        data = data.data;

		try{
			if(data.status && ['Traveling', 'Hospital', 'Jail', 'Abroad', 'Okay', 'Returning'].includes(data.status.state)){
				let sum = 0;
				let baz_value = 0;
				let muggable = [];
				let count = 0;

				if(data.bazaar.length !== 0) {
					for(itm of data.bazaar){
						count++;
						checkCheapListing(index, itm, data);
						sum += itm.price * itm.quantity;
		
						if(itm.name in prices && data.job.company_type === 5 && itm.price <= prices[itm.name]*1.025){
							baz_value += Math.max(0,((prices[itm.name] - itm.price*0.975) * itm.quantity));
							muggable.push([itm.name, (`${shortenNumber(itm.price)} x ${itm.quantity}`), `Profit: ${shortenNumber(prices[itm.name] - itm.price*0.975)} x ${itm.quantity}`]);
						}
						if(itm.name in prices && data.job.company_type != 5 && itm.price < prices[itm.name]*1.1){
							baz_value += Math.max(0,((prices[itm.name] - itm.price*0.9) * itm.quantity));
							muggable.push([itm.name, (`${shortenNumber(itm.price)} x ${itm.quantity}`), `Profit: ${shortenNumber(prices[itm.name] - itm.price*0.9)} x ${itm.quantity}`]);
						}
					}
				}

				if(data.last_action.status === 'Offline' && players[index].lastBazaarValue === 0 && sum === 0){
					players[index].lastAction = data.last_action.timestamp;
					delete stalkList[index];
					// console.log(`Removed ${data.name}[${index}] from stalklist since bazaar closed/ empty.`)
					return;
				}

				if(players[index].faction_id !== data.faction.faction_id){
					players[index].faction_id = data.faction.faction_id;
				}
				if(players[index].faction_name !== data.faction.faction_name){
					players[index].faction_name = data.faction.faction_name;
				}
				if(!Object.keys(factions).includes(data.faction.faction_id.toString())){
					client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] ${players[index].name} [${index}] in ally faction ${data.faction.faction_name} [${data.faction.faction_id}]. Removed from track.` });
					delete players[index];
					return;
				}
				if(players[index].networth !== data.personalstats.networth.total){
					players[index].networth = data.personalstats.networth.total;
				}

				if(data.status.state === 'Hospital' && !(players[index].state.includes('Mugged')) && data.status.details.includes('Mugged')){
					players[index].soldValue = 0;
					client.channels.cache.get(bot.channel_logs).send({ content: `Player ${players[index].name} [${index}]: ${data.status.details.replace(/<a href = "(.*?)">(.*?)<\/a>/g, '[$2]($1)')} at: ${new Date()}` });
				}

				if(players[index].state.includes('Returning') && !(data.status.details.includes('Returning'))){
					players[index].lastAction = data.last_action.timestamp; // just landed
				}

				players[index].state = data.status.details;

				if(data.job.company_type == 5){
					players[index].soldValue += Math.round((players[index].lastBazaarValue - sum) * 0.25);
				}
				else{
					players[index].soldValue += players[index].lastBazaarValue - sum;
				}

				let last_count = players[index].lastBazaarCount;
				players[index].lastBazaarValue = sum;
				players[index].lastBazaarCount = count;
				//if(players[index].soldValue!=0) console.log(`${players[index].name} has sold $${players[index].soldValue} worth of items`);
		
				if(players[index].soldValue < 0){
					players[index].soldValue = 0;
					players[index].lastAction = data.last_action.timestamp;
					// console.log(`${players[index].name} sold value is negative, resetting`)
					return;
				}
				
				if(['Traveling', 'Abroad'].includes(data.status.state) || (data.status.state === 'Hospital' && data.status.description.includes('In a'))){
					// console.log(`${data.name} skipped, Traveling`);
					players[index].lastAction = data.last_action.timestamp;
					return;
				}
		
				if( (data.last_action.timestamp !== players[index].lastAction) || (currdate - data.last_action.timestamp < 90)){
					players[index].soldValue = 0;
					players[index].lastAction = data.last_action.timestamp;
					// console.log(`${data.name} has made an action, resetting value and skipping`)
					return;
				}
		
				if(data.status.state === 'Hospital'){
					if(180 < data.status.until - currdate){
						// console.log(`${data.name} skipped, too long in hospital ${Math.ceil((data.status.until - currdate)/60)} minutes`);
						return;
					}
				}
		
				
				let color;
				switch(data.last_action.status){
					case "Online": color = "#0ca60c"; break;
					case "Idle": color = "#e37d10"; break;
					default: color = "#ccc8c8"; break;
				}

				if(muggable_blacklist.get(index)){ 
					if(muggable_blacklist.get(index).time < currdate){
						muggable_blacklist.delete(index);
					}
				}
				if(stalking_blacklist.get(index)){ 
					if(stalking_blacklist.get(index).time < currdate){
						stalking_blacklist.delete(index)
					}
				}

		
				if(data.status.state === 'Hospital' || (data.status.state === 'Okay' && data.job.company_type != 5)){			
					if(baz_value >= 10000000){	
						let status2 = new EmbedBuilder();
		
						const markdownTable = convertToMarkdownTable(muggable);
		
						status2.setTitle(`${data.name} [${index}]`)
							.setColor(color)
							.setURL('https://www.torn.com/bazaar.php?userId=' + index)
							.setDescription(`
								${players[index].faction_name} [${players[index].faction_id}]
								**${data.last_action.status}** and ${data.status.state === 'Hospital' ?
									`Is leaving hospital <t:${data.status.until}:R>`
									: `Is ${data.status.state}`}
								**Potential Mug $${shortenNumber(baz_value)}**
								Last action: ${data.last_action.relative}`
							)
							.addFields(
								{ name: 'Xanax', value: `${data.personalstats.drugs.xanax}`, inline: true },
								{ name: ' ', value: ` `, inline: true },
								{ name: 'LSD', value: `${data.personalstats.drugs.lsd}`, inline: true },
								{ name: 'SEs', value: `${data.personalstats.items.used.stat_enhancers}`, inline: true },
								{ name: ' ', value: ` `, inline: true },
								{ name: 'ELO', value: `${data.personalstats.attacking.elo}`, inline: true }
							)
							.addFields(
								{ name: 'STAT ESTIMATE', value: `${await predictStat(data)}`, inline: true }
							)
							.addFields({ name: 'Data', value: markdownTable })
							.setFooter({ text: `Pinged at ${new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '')}` });
		
						if(muggable_blacklist.get(index)){
							// already pinged
						}
						else{
							if(baz_value >= 10000000){
								client.channels.cache.get(bot.channel_buymugs).send({ content: bot.role_mug, embeds: [status2] });
							}
							else {
								client.channels.cache.get(bot.channel_buymugs).send({ embeds: [status2] });
							}
							console.log(`${players[index].name} has $${baz_value} worth profit buymug, sending message`);
							muggable_blacklist.set(index, {time:currdate+300, name:players[index].name});
							update2 = true;
						}
					}
				}

				let status = new EmbedBuilder();
				
				status.setTitle(data.name + " [" + index + "]")
				.setColor(color)
				.setURL('https://www.torn.com/loader.php?sid=attack&user2ID=' + index)
				.setDescription(`
					${players[index].faction_name} [${players[index].faction_id}]
					**${data.last_action.status}** and ${data.status.state === 'Hospital' ?
						`Is leaving hospital <t:${data.status.until}:R>`
						: `Is ${data.status.state}`}
					**And has $${shortenNumber(players[index].soldValue)} on hand.**
					Last action: ${data.last_action.relative}\n
					Last Listings: ${last_count}, Now: ${count}`
				)
				.addFields(
					{ name: 'Xanax', value: `${data.personalstats.drugs.xanax}`, inline: true },
					{ name: ' ', value: ` `, inline: true },
					{ name: 'LSD', value: `${data.personalstats.drugs.lsd}`, inline: true },
					{ name: 'SEs', value: `${data.personalstats.items.used.stat_enhancers}`, inline: true },
					{ name: ' ', value: ` `, inline: true },
					{ name: 'ELO', value: `${data.personalstats.attacking.elo}`, inline: true }
				)
				.addFields(
					{ name: 'STAT ESTIMATE', value: `${await predictStat(data)}`, inline: true }
				)
				.setFooter({ text: `Pinged at ${new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '')}` });
		
				if(players[index].soldValue >= 35000000){
		
					if(stalking_blacklist.get(index)){ 
						// already pinged
					}
					else{
						let payload = {
							message: 'Bazaar Sale',
							userID: index,
							money: players[index].soldValue,
						};
						broadcast(payload);
						
						client.channels.cache.get(bot.channel_sales).send({ content: bot.role_mug, embeds: [status] });
						// client.channels.cache.get(bot.channel_logs).send({ content:`${JSON.stringify(data)}` });

						console.log(`${players[index].name} has $${players[index].soldValue} on hand, sending message`);
						stalking_blacklist.set(index, {time:currdate+30, name:players[index].name});
						update = true;
						players[index].soldValue = 0;
					}
				}
			} else{
				console.error('---------------------\nUnexpected response structure:', data.status, '\n-------------------\n\n');
			}
		} catch(error){
			console.log(`Unexpected error: ${error}`);
            return client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] Unexpected error in UserChecking: ${error.message}\n${error.stack}` });
        }
	}
	else{
		return;
	}
	
}

async function SEChecking(index, key_id) {
	currdate = parseInt(Date.now()/1000);

	let data = {};
	data['error'] = 1;
	data['data'] = {};

	let url = `https://api.torn.com/v2/market/${index}?selections=itemmarket&from=${currdate}&key=${keys[key_id].key}`;

	data = await APICall(url, key_id);
	callsMarketChecking++;

	if(data && data.error === 0){
        data = data.data;

		try{
			if (data.itemmarket.listings.length === 0) {
				return;
			}

			let minCost = data.itemmarket.listings[0].price;
			let qty = data.itemmarket.listings[0].amount;
	
			if(items[index].lastCheapestValue === minCost && items[index].qty === qty){
				//console.log(`${items[index].name} no change in listing.`)
				return;
			}

			let check = false;

			if(minCost < items[index].lastCheapestValue) {
				check = true;
			}
	
			items[index].lastCheapestValue = minCost;
			items[index].qty = qty;
	
			let diff = 0;
	
			let color = "#0ca60c";
	
			if( (['106', '329', '330', '331', '336'].includes(index) && qty === 1 && check) || (!['106', '329', '330', '331', '336'].includes(index) && qty <= 5 && check) ){
				diff = (items[index].minimum * 1.1) - minCost;
	
				if(diff > 0){
					let status = new EmbedBuilder();
					status.setTitle(`${items[index].qty}x ${items[index].name} [${items[index].id}]`)
						.setColor(color)
						.setURL(`https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${items[index].id}`)
						.setDescription("NEW LISTING")
						.addFields(
							{ name: 'Price', value: `$${shortenNumber(minCost)}`, inline: true },
							{ name: ' ', value: " ", inline: true },
							{ name: 'Quantity', value: `${qty}`, inline: true }
						)
						.setFooter({ text: `Pinged at ${new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '')}` });
			
					client.channels.cache.get(bot.channel_SEbuymugs).send({ content: bot.role_SE, embeds: [status] });
				}
			}
		} catch(error){
            console.log(`Unexpected error: ${error}`);
            return client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] Unexpected error in SEChecking: ${error.message}\n${error.stack}` });
        }
	} else{
		return;
	}
}

async function updateFaction(index, key_id){
	currdate = parseInt(Date.now()/1000);

	let data = {};
	data['error'] = 1;
	data['data'] = {};

	let url = `https://api.torn.com/v2/faction/${index}?selections=basic,members&from=${currdate}&key=${keys[key_id].key}`;

	data = await APICall(url, key_id);
	fac_api_calls++;

	if(data && data.error === 0){
        data = data.data;

		try{
			//console.log(`Checking faction ${factions[index].name} [${factions[index].tag}] [${index}]. Total members: ${Object.keys(factions[index].players).length} at ${new Date()}`);

			if(factions[index].name !== data.basic.name || factions[index].tag !== data.basic.tag || factions[index].players.length !== data.members.length){
				factions[index].name = data.basic.name;
				factions[index].tag = data.basic.tag;

				factions[index].players = data.members.map(member => member.id);

				console.log(`Change in faction ${data.basic.name} [${data.basic.tag}] [${index}]. Total members: ${data.members.length} at ${new Date()}`);
			}

			let to_update = [];

			for (let itm of data.members){

				let i = itm.id;
				
				if(players.hasOwnProperty(i)){
					if(players[i].lastAction < itm.last_action.timestamp){
						to_update.push(i);
					}
				}
				else{
					let tmp_player = await handlePlayerData(i)
					players[i] = tmp_player.playerData;
					fs.writeFileSync('players.json', JSON.stringify(players));
				}
			}

			//console.log(to_update);

			return to_update;
		} catch(error){
			console.log(`Unexpected error: ${error}`);
            client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] Unexpected error in updateFaction: ${error.message}\n${error.stack}` });
			return [];
        }
	}
	else{
		console.log(`Error Data in updateFaction:\n${data}`);
		return [];
	}
}

async function updatePlayer(index, key_id){
	currdate = parseInt(Date.now()/1000);

	let data = {};
	data['error'] = 1;
	data['data'] = {};

	let url = `https://api.torn.com/v2/user/${index}?selections=profile,bazaar,personalstats&cat=all&from=${currdate}&key=${keys[key_id].key}`;

	data = await APICall(url, key_id);
	fac_api_calls++;

	if(data && data.error === 0){
        data = data.data;

		try{
			const {worth, count, accepted_count, value} = await calcWorth(data, index);
			players[index].worth = worth;
			players[index].lastBazaarCount = count;
			players[index].accepted_count = accepted_count;
			players[index].lastBazaarValue = value;
			return;
		} catch(error){
			console.log(`Unexpected error: ${error}`);
            return client.channels.cache.get(bot.channel_error).send({ content:`[Bazaar] Unexpected error in updatePlayer: ${error.message}\n${error.stack}` });
        }
	}
	else{
		return;
	}
}

async function updateStalkList(){
	let tmp_list = {};

	for (let i in players){
		if(i in players_blacklist){
			// do not add to stalkList
		}
		else{
			if(players[i].worth > 0){
				tmp_list[i] = players[i].worth;
			}
		}
	}

	// Convert the dictionary to an array of entries
	const entries = Object.entries(tmp_list);

	// Sort the array based on the 'worth' value in descending order
	const sortedEntries = entries.sort((a, b) => b[1] - a[1]);

	// Get the top x players
	const topX = sortedEntries.slice(0, 100);

	stalkList_cutoff = topX.length > 0 ? topX[topX.length - 1][1] : 0;

	// If you need the result as an object, you can convert it back
	stalkList = Object.fromEntries(topX);

	//console.log(`Updated Stalk List at ${new Date()}`);
	//console.table(stalkList);
	
	minimumWaitTimeUser = (60 * Object.keys(stalkList).length/ 750) * 1000;

	fs.writeFileSync('stalkList.json', JSON.stringify(stalkList));

	return;
}

async function checkCheapListing(index, itm, data){
	let diff = (prices[itm.name] - itm.price) * itm.amount;
	if(itm.name in prices && diff >= 0){
		let status = new EmbedBuilder();
		status.setTitle(`${itm.amount}x ${itm.name} [${itm.id}]`)
			.setColor(color)
			.setURL(`https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${itm.id}`)
			.setDescription("NEW LISTING")
			.addFields(
				{ name: 'Price', value: `$${shortenNumber(itm.price)}`, inline: true },
				{ name: ' ', value: " ", inline: true },
				{ name: 'Quantity', value: `${itm.amount}`, inline: true },
				{ name: 'Profit', value: `$${shortenNumber(diff)}`, inline: true },
				{ name: ' ', value: " ", inline: true },
				{ name: 'Tracking under', value: `$${shortenNumber(prices[itm.name])}`, inline: true }
			)
			.setFooter({ text: `Pinged at ${new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z/, '')}` });

		if(diff >= 5000000){
			client.channels.cache.get(bot.channel_cheapbuys).send({ content: bot.role_buy, embeds: [status] });
		}
		else if(diff >= 1000000){
			client.channels.cache.get(bot.channel_cheapbuys).send({ embeds: [status] });
		}
		console.log(`${itm.name} has a new listing with potential profit: $${diff}, sending message`);
	}
}





async function runUserChecking(count){
	callsUserChecking = 0;
	let elapsedTimeUser = 0.0;
	let start = performance.now();
	
	let promises = [];
	
	let key_pos = count;
	let keys_list = Object.keys(keys);
	
	update = false;
	update2 = false;

	let key_id = '';

	for (let i in stalkList){
		if (key_pos >= keys_list.length) { key_pos = 0; }
		key_id = keys_list[key_pos].toString();
		promises.push(UserChecking(i, key_id));
		++key_pos;
	}

	await Promise.all(promises);
	
	let end = performance.now(); // Record end time
    elapsedTimeUser = Math.round(end - start); // Calculate elapsed time
    console.log(`[    USER    ] x${Object.keys(players).length} Wait Time: ${minimumWaitTimeUser}, Last Run Calls: ${callsUserChecking} at:`, new Date(), `in ${elapsedTimeUser} miliseconds.`);
	
	fs.writeFileSync('players.json', JSON.stringify(players));

	if(update){
		fs.writeFileSync('players_blacklist.json', JSON.stringify([...stalking_blacklist]));
	}
	if(update2){
		fs.writeFileSync('muggable_blacklist.json', JSON.stringify([...muggable_blacklist]));
	}
}

async function runSEChecking(count){
	let elapsedTimemarket = 0.0;
	let startmarket = performance.now();
	
	const promises = [];

	let keys_list = Object.keys(keys);
	let key_pos = keys_list.length - count - 1;

	let key_id = '';

	for (let i in items) {
		if (key_pos <= 0) { key_pos = keys_list.length - 1; }
		key_id = keys_list[key_pos].toString();
		promises.push(SEChecking(i, key_id));
		//await userChecking(i, keys[key_pos].key, keys[key_pos].holder);
		--key_pos;
	}
	
	await Promise.all(promises);
	
	let endmarket = performance.now(); // Record end time
    elapsedTimemarket = Math.round(endmarket - startmarket); // Calculate elapsed time
    console.log(`[     SE     ] x${Object.keys(items).length} Wait Time: ${minimumWaitTimeSE}, Last Run Calls: ${callsMarketChecking} at:`, new Date(), `in ${elapsedTimemarket} miliseconds.`);
}


async function runFactionChecking(players2Update) {
    let batchSize = 50;
    let delay = 12 * 1000;


	let promises_player = [];
	let count = 0;
	let count2 = 0;

	let keys_list = Object.keys(keys);
	let key_pos = 0;
	let key_id = '';

	for (let player_id of players2Update) {
		count++;
		count2++;

		if (key_pos >= keys_list.length) { key_pos = 0; }
		key_id = keys_list[key_pos].toString();
		promises_player.push(updatePlayer(player_id, key_id));
		++key_pos;
	
		if (count >= 50) {
			let startTime = Date.now(); // Record start time
			await Promise.all(promises_player);
			await updateStalkList();
			let elapsedTime = Date.now() - startTime;
			let remainingTime = Math.max(0, 12000 - elapsedTime);
			console.log(`\nChecked ${count2}/${players2Update.length} players at: `, new Date());
			// Reset the batch
			promises_player = [];
			count = 0;
			fs.writeFileSync('players.json', JSON.stringify(players));
			await sleep(remainingTime);
		}
	}

	// If there are any remaining promises, process them
	if (promises_player.length > 0) {
		let startTime = Date.now(); // Record start time
		await Promise.all(promises_player);
		await updateStalkList();
		let elapsedTime = Date.now() - startTime;
		let remainingTime = Math.max(0, 12000 - elapsedTime);
		console.log(`\nChecked ${count2}/${players2Update.length} players at: `, new Date());
		await sleep(remainingTime);
	}
}





const StartLoop = async () => {

	const manageUpdateFaction = async () => {
		try{
			while (true) {
				let fac_elapsedTime = 0.0;
				let fac_start = performance.now();
				console.log("\nStarting new loop factions at: ", new Date());
				let promises_fac = [];
				let fac_count = 0;
				let fac_count2 = 0;
				let players2Update = [];

				let keys_list = Object.keys(keys);
				let key_pos = 0;
				let key_id = '';

				for (let fac_id of Object.keys(factions)) {
					fac_count++;
					fac_count2++;
					console.log(fac_id);

					if (key_pos >= keys_list.length) { key_pos = 0; }
					key_id = keys_list[key_pos].toString();
					promises_fac.push(updateFaction(fac_id, key_id));
					++key_pos;
				
					if (fac_count >= 50) {
						let startTime = Date.now(); // Record start time
						let flattenedResults = (await Promise.all(promises_fac)).flat();
						players2Update.push(...flattenedResults);
						let elapsedTime = Date.now() - startTime;
						let remainingTime = Math.max(0, 12000 - elapsedTime);
						console.log(`\nChecked ${fac_count2}/${Object.keys(factions).length} factions at: `, new Date());
						// Reset the batch
						promises_fac = [];
						fac_count = 0;
						fs.writeFileSync('factions.json', JSON.stringify(factions));
						await sleep(remainingTime);
					}
				}

				// If there are any remaining promises, process them
				if (promises_fac.length > 0) {
					let results = await Promise.all(promises_fac);
					let flattenedResults = results.flat();
					players2Update.push(...flattenedResults);
					await sleep(5 * 1000);
				}

				let fac_end = performance.now();
				fac_elapsedTime = Math.round(fac_end - fac_start);

				console.log(`\nChecked ${Object.keys(factions).length} factions at: `, new Date(), `in ${fac_elapsedTime} miliseconds. Players to Update: ${players2Update.length}\n`);

				fac_start = performance.now();

				await runFactionChecking(players2Update);

				fac_end = performance.now();
				fac_elapsedTime = Math.round(fac_end - fac_start);
			  	console.log(`\nUpdated ${players2Update.length} players at: `, new Date(), `in ${fac_elapsedTime} miliseconds.\n`);

				await sleep(30 * 1000); // Add delay to prevent immediate loop iteration
		  	}
		}
		catch(error){
			console.log(`\n\nERROR IN FACTIONS LOOP:\n`, error);
			client.channels.cache.get(bot.channel_logs).send({ content: `[Bazaar] ERROR IN FACTIONS LOOP:\n${error}` });
			await sleep(60000);
			manageUpdateFaction();
		}
	};

	const manageCheckUser = async () => {
		try{
			let runloop = 0;
			async function GetDat() {
				try {
					if(count_calls >= 800){
						await sleep(10 * 1000);
					}
					const startTime = Date.now(); // Record the start time
					//console.log("Starting Loop players at: ", new Date());
		
					// Call your function and wait for it to complete
					await runUserChecking(runloop);
		
					if(bot_pause >= 100){
						console.log(`API disabled. Bot paused for 1 minute at:`, new Date());
						await sleep(60000);
						bot_pause = 0;
					}
					
					const endTime = Date.now(); // Record the end time
					const elapsedTime = endTime - startTime; // Calculate elapsed time
		
					// Update runloop
					runloop = (runloop >= keys.length - 1) ? 0 : runloop + 1;
					
					const waitTime = Math.max(minimumWaitTimeUser - elapsedTime, 0);
		
					// Recur to the next iteration of GetDat
					setTimeout(() => {
						GetDat();
					}, waitTime);
				} catch (error) {
					console.error("An error occurred: ", error);
					// Optionally, handle the error (e.g., retry the function or exit the loop)
				}
			}
			
			// Start the loop
			await GetDat();
		}
		catch(error){
			console.log(`\n\nERROR IN PLAYERS LOOP:\n`, error);
			client.channels.cache.get(bot.channel_logs).send({ content: `[Bazaar] ERROR IN PLAYERS LOOP:\n${error}` });
			await sleep(60 * 1000);
			manageCheckUser();
		}
		
	};

	const manageCheckSE = async () => {
		try{
			let runloopSE = 0;
			
			async function GetDatSE() {
				try {
					if(count_calls >= 950){
						await sleep(10 * 1000);
					}
					const startTimeSE = Date.now(); // Record the start time

					// Call your function and wait for it to complete
					await runSEChecking(runloopSE);

					if(bot_pause >= 100){
						console.log(`API disabled. Bot paused for 1 minute at:`, new Date());
						await sleep(60*1000);
						bot_pause = 0;
					}
					
					const endTimeSE = Date.now(); // Record the end time
					const elapsedTimeSE = endTimeSE - startTimeSE; // Calculate elapsed time

					// Update runloopSE
					runloopSE = (runloopSE >= keys.length - 1) ? 0 : runloopSE + 1;
					
					const waitTimeSE = Math.max(minimumWaitTimeSE - elapsedTimeSE, 0);

					// Recur to the next iteration of GetDatSE
					setTimeout(() => {
						GetDatSE();
					}, waitTimeSE);
				} catch (error) {
					console.error("An error occurred: ", error);
					// Optionally, handle the error (e.g., retry the function or exit the loop)
					GetDatSE();
				}
			}
			// Start the loop
			await GetDatSE();
		}
		catch(error){
			console.log(`\n\nERROR IN SE LOOP:\n`, error);
			client.channels.cache.get(bot.channel_logs).send({ content: `[Bazaar] ERROR IN SE LOOP:\n${error}` });
			await sleep(60 * 1000);
			manageCheckSE();
		}
		
	};

	const resetFacApiCallsCount = async () => {
		while (true) {
			await sleep(30 * 1000); // 30 seconds
			console.log(`Last 30 seconds Fac-API calls count: ${fac_api_calls}; at: ${new Date()}`);
			fac_api_calls = 0;
		}
	};

	const outputApiCallsCount = async () => {
		while (true) {
			await sleep(60 * 1000); // 20 seconds
			console.log(`Last minute API calls count: ${count_calls}; at: ${new Date()}`);
			count_calls = 0;
		}
	};
	
	const resetTempInvalidKeys = async () => {
		while (true) {
			let to_delete = [];
			await sleep(15 * 60 * 1000); // 15 minutes

			// Use an array to handle async tasks for proper synchronization
			const tasks = Object.keys(temp_keys).map(async (key) => {
				let temp_key_info = temp_keys[key];
				
				if (temp_key_info["count"] >= 5) {
					client.channels.cache.get(bot.channel_logs).send({ content: `[Bazaar] ${key}'s key has been fully utilized too many times, removing.` });
					console.log(`${key}'s key has been fully utilized too many times, removing.`);
					to_delete.push(key);
					return;
				}

				let tmpkey = {
					key: temp_key_info["key"],
					holder: "k",
					id: ""
				};
				
				try {
					const response = await axios.get(`https://api.torn.com/user/?selections=profile&key=${temp_key_info["key"]}`);
					
					if (response.data.error) {
						if ([2, 13].includes(response.data.error.code)) {
							client.channels.cache.get(bot.channel_logs).send({ content: `[Bazaar] ${key}'s key is invalid, removing.` });
							console.log(`${key}'s key is invalid, removing.`);
							to_delete.push(key);
						}
						// Handle other errors if needed
					} else {
						tmpkey.holder = response.data.name;
						tmpkey.id = response.data.player_id.toString();

						keys[tmpkey.id] = tmpkey;
						fs.writeFileSync('keys.json', JSON.stringify(keys));
						client.channels.cache.get(bot.channel_logs).send(`[Bazaar] Re-Added ${response.data.name}'s key`);
						to_delete.push(key);
					}
				} catch (error) {
					console.error(`Error processing key ${key}:`, error);
				}
			});

			// Await all tasks to complete
			await Promise.all(tasks);

			// Delete keys after all async operations are done
			for (const key of to_delete) {
				delete temp_keys[key];
			}
		}
	};

	// Start loops concurrently
	manageUpdateFaction();
	await sleep(2500);
	manageCheckUser();
	//manageCheckSE();
	resetFacApiCallsCount();
	outputApiCallsCount();
	resetTempInvalidKeys();

};






async function ApiCall(url){ // with retry
	currdate = parseInt(Date.now()/1000);
	count_calls++;
	try {
		let keys_list = Object.keys(keys);
		let randomIndex = Math.floor(Math.random() * keys_list.length);

		let key = keys[keys_list[randomIndex]].key;
		let keyname = keys[keys_list[randomIndex]].holder;

		let url2 = url + key;
		const response = await axios.get(url2, { timeout: 5000 });

		if(!response.data) return await ApiCall(url);

		if (response.data.error) {
			const errorCode = response.data.error.code;

			if ([2, 5, 10, 13, 18].includes(errorCode)) {
				if ([5].includes(errorCode)) {
					client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] ${keyname}, your key is making too many requests! Removing it. Add it back later` });
					console.log(`${keyname}'s key is making too many requests! Removing it. Add it back later. Skipping request.`);
				} else{
					client.channels.cache.get(bot.channel_logs).send({ content:`[Bazaar] ${keyname}, your key is invalid! removing it.` });
					console.log(`${keyname}'s key is invalid, removing and skipping`);
				}
				
				for(let i in keys){
					if(keys[i].key === key){
						delete keys[i];
						fs.writeFileSync('keys.json', JSON.stringify(keys));
					}
				}
				return await ApiCall(url);
			}

			if ([8, 9, 14, 17].includes(errorCode)) {
                // Handle other specific errors if needed
                bot_pause += 1; // Adjust as per your logic
                return await ApiCall(url);
            }

			if ([6].includes(errorCode)) {
                // Handle other specific errors if needed
				console.log(`\n ERROR 6 Incorrect ID: url: ${url2}`);
                return "Error";
            }

			console.error(`Unhandled error code: ${errorCode}`);
            return await ApiCall(url);
		}
		
		return response.data;

		
	} catch(error){
		if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED') {
                console.error('Request timed out');
            } else if (error.response) {
				// Handle specific HTTP error codes if needed
                if (error.response.status === 502 || error.response.status === 503 || error.response.status === 504) {
                    bot_pause += 1; // Adjust as per your logic
					await sleep(5000);
                    return await ApiCall(url);
                }
                // The request was made and the server responded with a status code
                console.log('Error status:', error.response.status);
                console.log('Error data:', error.response.data);
                
            } else if (error.request) {
                // The request was made but no response was received
                console.log('Error request:', error.request);
            } else {
                // Something happened in setting up the request that triggered an Error
                console.log('Error message:', error.message);
            }
        } else {
            console.error('Non-Axios error occurred:', error.message);
        }

		await sleep(5000);
		return await ApiCall(url);
	}
}


const handlePlayerData = async (i) => {
	currdate = parseInt(Date.now()/1000);
	//console.log(`Checking player ${i}.`);
	let data2 = await ApiCall(`https://api.torn.com/v2/user/${i}?selections=profile,bazaar,personalstats&cat=all&from=${currdate}&key=`);

	let tmp_player = {};
	tmp_player.id = i;
	tmp_player.name = data2.name;
	tmp_player.lastAction = data2.last_action.timestamp;
	tmp_player.soldValue = 0;
	tmp_player.faction_id = data2.faction.faction_id;
	tmp_player.faction_name = data2.faction.faction_name;
	tmp_player.networth = data2.personalstats.networth.total;
	const {worth, count, accepted_count, value} = await calcWorth(data2, i);
	tmp_player.worth = worth;
	tmp_player.lastBazaarCount = count;
	tmp_player.accepted_count = accepted_count;
	tmp_player.lastBazaarValue = value;
	tmp_player.state = data2.status.details;

	return { playerId: i, playerData: tmp_player };
};

async function addFaction(index){
	currdate = parseInt(Date.now()/1000);
	let pObj = {};

	let url = `https://api.torn.com/v2/faction/${index}?selections=basic,members&from=${currdate}&key=`;

	let data = await ApiCall(url);

	if(data === "Error") {return "Error";}
	
	console.log(`Checking faction ${data.basic.name} [${data.basic.tag}] [${index}]. Total members: ${data.members.length}`);

	pObj.id = index;
	pObj.name = data.basic.name;
	pObj.tag = data.basic.tag;
	pObj.players = {};

	let playerPromises = [];

	for (itm of data.members){
		let i = itm.id;
		playerPromises.push(handlePlayerData(i));
	}

	let startTime = Date.now();

	let results = await Promise.all(playerPromises);
	results.forEach(result => {
		pObj.players[result.playerId] = result.playerData;
	});

	let endTime = Date.now(); // Record the end time
	let elapsedTime = endTime - startTime; // Calculate elapsed time
	
	let waitTime = Math.max(2500 - elapsedTime, 0);

	await sleep(waitTime);

	return pObj;
}

async function addItem(id, value){
	let iObj = {
		id: 0,
		name: '',
		lastCheapestValue: 0,
		minimum: 0,
		qty: 0
	};

	let data = await ApiCall(`https://api.torn.com/v2/torn/${id}?selections=items&key=`);

	iObj.name = data.items[id.toString()].name;
	iObj.id = id;
	iObj.lastCheapestValue = Infinity;
	iObj.qty = 0;
	iObj.minimum = value;

	return iObj;
}

client.on('messageCreate', async message => {
	const prefix = '!';

	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLocaleLowerCase();

	console.log("Received command !" +command+" with args:");
	console.table(args);

	//COMMANDS
	if (command === 'add_faction') {

		if (!args){
			return message.reply("Please provide an ID");
		}

		for (let i in args){
			let id = parseInt(args[i]);

			if (typeof id !== 'number' || !id) {
				message.reply("Invalid ID.");
				continue;
			}

			if(factions.hasOwnProperty(id)){
				message.reply(`Already stalking faction ${factions[id].name} [${factions[id].tag}] [${id}]`);
				continue;
			}
			
			let fac = {};
			fac = await addFaction(id);

			if(fac === 'Error'){
				message.reply(`Invalid Faction ID ${id}.`);
				continue;
			}

			let pl = fac.players;
			delete fac[players];
			fac.players = Object.keys(pl);

			players = {...players, ...pl};

			factions[id] = fac;

			fs.writeFileSync('factions.json', JSON.stringify(factions));
			fs.writeFileSync('players.json', JSON.stringify(players));
			message.reply(`Added faction ${factions[id].name} [${factions[id].tag}] [${id}] to the list`);
			await sleep(10*1000);
		}

		fs.writeFileSync('factions.json', JSON.stringify(factions));
		return;
	}
	
	else if (command === 'remove_faction') {

		if (!args){
			return message.reply("Please provide an ID");
		}

		if(args[0] === 'all'){
			let tm = {};
			factions = tm;
			fs.writeFileSync('factions.json', JSON.stringify(factions));
			return message.reply(`Purged list`);
		}

		for (let i in args){
			let id = parseInt(args[i]);

			if (typeof id !== 'number' || !id) {
				message.reply("Invalid ID.");
				continue;
			}

			if(factions.hasOwnProperty(id)){
				let text = `${factions[id].name} [${factions[id].tag}] [${id}]`;

				let url = `https://api.torn.com/faction/${id}?selections=basic&key=`;
				let data = await ApiCall(url);
				delete factions[id];

				for (let j in data.members){
					if(players.hasOwnProperty(j)){
						delete players[j];
					}
				}

				fs.writeFileSync('factions.json', JSON.stringify(factions));
				message.reply(`Stopped tracking faction ${text} and corresponding users.`);
			} else{
				message.reply(`Not stalking faction ${id}`);
			}
		}

		fs.writeFileSync('factions.json', JSON.stringify(factions));
		return;
	}
	
	else if (command === 'bind_sales') {
		bot.channel_sales = message.channel.id;
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`bound to channel ${message.channel.name}`);
	}
	
	else if (command === 'bind_buymugs') {
		bot.channel_buymugs = message.channel.id;
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`bound to channel ${message.channel.name}`);
	}

	else if (command === 'bind_sebuymugs') {
		bot.channel_SEbuymugs = message.channel.id;
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`bound to channel ${message.channel.name}`);
	}

	else if (command === 'bind_logs') {
		bot.channel_logs = message.channel.id;
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`bound to channel ${message.channel.name}`);
	}

	else if (command === 'bind_cheapbuys') {
		bot.channel_cheapbuys = message.channel.id;
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`bound to channel ${message.channel.name}`);
	}

	else if (command === 'list_factions') {
		let chunks = [];
		let currentChunk = '';
    
		for(let i in factions){
			let info = (`${factions[i].name} [${factions[i].tag}] [${i}] - ${Object.keys(factions[i].players).length} players\n`);
			if ((currentChunk.length + info.length) >= 2000) {
				// If it exceeds the limit, add the current chunk to the chunks array
				chunks.push(currentChunk);
				// Reset currentChunk for the next chunk
				currentChunk = '';
			}
			// Append player info to the current chunk
			currentChunk += info;
		}
		
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		for (let chunk of chunks) {
			let msg = new EmbedBuilder();
			msg.setTitle(`Currently Tracking ${Object.keys(factions).length} items`)
			   .setColor("#4de3e8")
			   .setDescription(chunk);

			message.reply({ embeds: [msg] });
		}
	}

	else if (command === 'list_players') {
		let chunks = [];
		let currentChunk = '';

		let tmp_players = {};

		for(let i in stalkList){
			if(players[i].soldValue > 0){
				tmp_players[i] = {
					name: players[i].name,
					soldValue: players[i].soldValue,
				};
			}
		}

		const entries = Object.entries(tmp_players);
		const sortedEntries = entries.sort((a, b) => b[1].soldValue - a[1].soldValue);
    
		for(const [key, value] of sortedEntries){
			const { name, soldValue } = value;
			let info = (`${name} [${key}] MoneyOnHand: ${soldValue}\n`);
			if ((currentChunk.length + info.length) >= 2000) {
				// If it exceeds the limit, add the current chunk to the chunks array
				chunks.push(currentChunk);
				// Reset currentChunk for the next chunk
				currentChunk = '';
			}
			// Append player info to the current chunk
			if(soldValue > 0){
				currentChunk += info;
			}
		}
		
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		for (let chunk of chunks) {
			let msg = new EmbedBuilder();
			msg.setTitle(`Currently Tracking ${Object.keys(stalkList).length} players`)
			   .setColor("#4de3e8")
			   .setDescription(`Players with money on hand:
				${chunk}
				
				CutOff worth for stalkList: ${stalkList_cutoff}`);

			message.reply({ embeds: [msg] });
		}
	}

	else if (command === 'list_stalklist') {
		let chunks = [];
		let currentChunk = '';

		let tmp_players = {};

		for(let i in stalkList){
			tmp_players[i] = {
				name: players[i].name,
				bazaarValue: players[i].lastBazaarValue,
				bazaarCount: players[i].lastBazaarCount,
				bazaarAcceptedCount: players[i].accepted_count,
				bazaarWorth: players[i].worth,
			};
		}

		const entries = Object.entries(tmp_players);
		const sortedEntries = entries.sort((a, b) => b[1].bazaarWorth - a[1].bazaarWorth);
    
		for(const [key, value] of sortedEntries){
			const { name, bazaarValue, bazaarCount, bazaarAcceptedCount, bazaarWorth } = value;
			let info = (`${name} [${key}] Worth: ${shortenNumber(bazaarWorth)} Value: ${shortenNumber(bazaarValue)} Count: ${bazaarCount} Accepted Items: ${bazaarAcceptedCount}\n`);
			if ((currentChunk.length + info.length) >= 2000) {
				// If it exceeds the limit, add the current chunk to the chunks array
				chunks.push(currentChunk);
				// Reset currentChunk for the next chunk
				currentChunk = '';
			}
			// Append player info to the current chunk
			currentChunk += info;
		}
		
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		for (let chunk of chunks) {
			let msg = new EmbedBuilder();
			msg.setTitle(`Currently Tracking ${Object.keys(stalkList).length} players`)
			   .setColor("#4de3e8")
			   .setDescription(`Players with money on hand:
				${chunk}
				
				CutOff worth for stalkList: ${stalkList_cutoff}`);

			message.reply({ embeds: [msg] });
		}
	}

	else if (command ==='role_mug') {
		if(!args){
			return message.reply(`Please provide a role to bind pings to`);
		}
		console.log(args);
		bot.role_mug = args[0];
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`Succesfully bound bot to this role`);
	}

	else if (command ==='role_buy') {
		if(!args){
			return message.reply(`Please provide a role to bind pings to`);
		}
		console.log(args);
		bot.role_buy = args[0];
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`Succesfully bound bot to this role`);
	}

	else if (command ==='role_se') {
		if(!args){
			return message.reply(`Please provide a role to bind pings to`);
		}
		console.log(args);
		bot.role_SE = args[0];
		fs.writeFileSync('token.json', JSON.stringify(bot));
		return message.reply(`Succesfully bound bot to this role`);
	}

	else if (command === 'add_key') {

		if (!args[0]){
			return message.reply("Please provide an APIKEY");
		}
  
	  	let tmpkey = {
			key: args[0],
			holder: "k",
			id: ""
		}

		await axios.get(`https://api.torn.com/v2/user/?selections=profile&key=${args[0]}`)
		.then(async function (response) {
			++count_calls;
			if(response.data.error && (response.data.error.code === 2 || response.data.error.code === 18 || response.data.error.code === 13)) {
				return message.reply({content: "Key is invalid!", ephemeral: true });
			}
			if(response.data.error) return message.reply({content: `Error occured! ${response.data.error.code}: ${response.data.error.error}`, ephemeral: true });

			if(keys.hasOwnProperty(response.data.player_id.toString())){
				message.reply({content: "Duplicate user", ephemeral: true });
				return message.delete();
			}
			
			tmpkey.holder = response.data.name;
			tmpkey.id = response.data.player_id.toString();

			keys[tmpkey.id] = tmpkey;
			fs.writeFileSync('keys.json', JSON.stringify(keys));
			client.channels.cache.get(bot.channel_apilogs).send({ content:`{"key":"${tmpkey.key}","holder":"${tmpkey.holder}","id":"${tmpkey.id}"}` });
			message.reply({content: `Added ${response.data.name}'s key`, ephemeral: true });
			return message.delete();
		});

	}

	else if (command === 'list_keys') {
		let msg = "";
		for (let ky in keys){
			msg+=`${keys[ky].holder} [${keys[ky].id}]\n`;
		}
		const status = new EmbedBuilder()
		.setTitle(`${Object.keys(keys).length} Keys in database.`)
		.setColor('#4de3e8')
		.addFields(
			{
				name: 'Username [id]',
				value: msg != '' ? msg : `No users`,
				inline: true
			}
		);
		return message.reply({ embeds: [status] });
	}

	else if (command === 'add_blacklist'){
		if (!args){
			return message.reply("Please provide an ID");
		}

		for (let i in args){
			let id = parseInt(args[i]);

			if (typeof id !== 'number' || !id) {
				message.reply("Invalid ID.");
				continue;
			}

			if(players_blacklist.hasOwnProperty(id)){
				message.reply(`Already blacklisted player ${players_blacklist[id].name} [${id}]`);
				continue;
			}
			

			let tmp = {};
			let url = `https://api.torn.com/v2/user/${id}?selections=profile&key=`;
			let data = await ApiCall(url);
			tmp.id = id;
			tmp.name = data.name;

			players_blacklist[id] = tmp;

			message.reply(`Added player ${players_blacklist[id].name} [${id}] to blacklist.`);
		}

		fs.writeFileSync('players_blacklist.json', JSON.stringify(players_blacklist));
		return;
	}

	else if (command === 'remove_blacklist'){
		if (!args){
			return message.reply("Please provide an ID");
		}

		if(args[0] === 'all'){
			let tm = {};
			players_blacklist = tm;
			fs.writeFileSync('players_blacklist.json', JSON.stringify(players_blacklist));
			return message.reply(`Purged list`);
		}

		for (let i in args){
			let id = parseInt(args[i]);

			if (typeof id !== 'number' || !id) {
				message.reply("Invalid ID.");
				continue;
			}

			if(players_blacklist.hasOwnProperty(id)){
				let text = `${players_blacklist[id].name} [${id}]`;
				delete players_blacklist[id];
				message.reply(`Stopped blacklisting player ${text}`);
			} else{
				message.reply(`Not blacklisted player ${id}`);
			}
		}

		fs.writeFileSync('players_blacklist.json', JSON.stringify(players_blacklist));
		return;
	}

	else if (command === 'add_item') {
		if (!args || args.length < 2){
			return message.reply("Please provide at least two arguments.");
		}
		
		const id = parseInt(args[0]);
		const value = parseInt(args[1]);

		if (typeof id !== "number" || !id) {
			return message.reply("Invalid item ID.");
		}
		
		if (typeof value !== "number" || !value) {
			return message.reply("Invalid item value.");
		}

		if(items.hasOwnProperty(id)){
			items[id].minimum = value;
			console.table(items[id]);
			fs.writeFileSync('items.json', JSON.stringify(items));
			return message.reply(`Updated item ${items[id].name}.`);
		}
		
		let tmp_item = {};
		
		tmp_item = await addItem(id, value);
		
		items[id] = tmp_item;
		fs.writeFileSync('items.json', JSON.stringify(items));
		return message.reply(`Tracking item ${tmp_item.name} under $${shortenNumber(tmp_item.minimum)}.`)
	}

	else if (command === 'remove_item') {

		if (!args){
			return message.reply("Please provide an item ID.");
		}

		if(args[0] === 'all')
			{
				let tm = {};
				items = tm;
				fs.writeFileSync('items.json', JSON.stringify(items));
				return message.reply(`Purged track list.`);
			}

		for (let i in args){
			let id = parseInt(args[i]);

			if (typeof id !== 'number' || !id) {
				message.reply("Invalid item ID.");
			}
	
			let i_name = "";

			if(items.hasOwnProperty(id)){
				i_name = items[i].name;
				delete items[i];
				fs.writeFileSync('items.json', JSON.stringify(items));
				message.reply(`Stopped tracking item ${i_name} [${id}]`);
			}
			else{
				message.reply(`Not stalking item/armor ${id} currently`);
			}
		}
		
	}

	else if (command === 'list_items') {
		let chunks = [];
		let currentChunk = '';
    
		for(let i in items){
			let info = (`${items[i].name} [${items[i].id}] Ping under: ${shortenNumber(items[i].minimum)}\n`);
			if ((currentChunk.length + info.length) >= 2000) {
				// If it exceeds the limit, add the current chunk to the chunks array
				chunks.push(currentChunk);
				// Reset currentChunk for the next chunk
				currentChunk = '';
			}
			// Append player info to the current chunk
			currentChunk += info;
		}
		
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		for (let chunk of chunks) {
			let msg = new EmbedBuilder();
			msg.setTitle(`Currently Tracking ${Object.keys(items).length} items`)
			   .setColor("#4de3e8")
			   .setDescription(chunk);

			message.reply({ embeds: [msg] });
		}
	}

	else if (command === 'add_price') {
		if (!args || args.length < 2){
			return message.reply("Please provide at least two arguments.");
		}
		
		const value = parseInt(args.pop(), 10); // Extract the last argument as an integer
		const id = args.join(" "); // Join the remaining arguments as a string

		//const id = args[0];
		//const value = parseInt(args[1]);
		
		if (typeof value !== "number" || !value) {
			return message.reply("Invalid item value.");
		}

		if(prices.hasOwnProperty(id)){
			prices[id] = value;
			fs.writeFileSync('prices.json', JSON.stringify(prices));
			return message.reply(`Updated price for ${id}.`);
		}
		
		let tmp_item = {};
		
		prices[id] = value;
		fs.writeFileSync('prices.json', JSON.stringify(prices));
		return message.reply(`Tracking item ${id} under $${shortenNumber(value)}.`);
	}

	else if (command === 'remove_price') {

		if (!args){
			return message.reply("Please provide an item name.");
		}

		if(args[0] === 'all'){
			let tm = {};
			items = tm;
			fs.writeFileSync('prices.json', JSON.stringify(prices));
			return message.reply(`Purged prices list.`);
		}

		const id = args.join(" "); // Join the remaining arguments as a string

		if(prices.hasOwnProperty(id)){
			delete prices[i];
			fs.writeFileSync('prices.json', JSON.stringify(prices));
			message.reply(`Stopped tracking ${id}`);
		}
		else{
			message.reply(`Not stalking item ${id} currently`);
		}
		
	}

	else if (command === 'list_prices') {
		let chunks = [];
		let currentChunk = '';
    
		for(let i in prices){
			let info = (`${i} Ping under: ${shortenNumber(prices[i])}\n`);
			if ((currentChunk.length + info.length) >= 2000) {
				// If it exceeds the limit, add the current chunk to the chunks array
				chunks.push(currentChunk);
				// Reset currentChunk for the next chunk
				currentChunk = '';
			}
			// Append player info to the current chunk
			currentChunk += info;
		}
		
		if (currentChunk.length > 0) {
			chunks.push(currentChunk);
		}

		for (let chunk of chunks) {
			let msg = new EmbedBuilder();
			msg.setTitle(`Currently Tracking ${Object.keys(prices).length} items`)
			   .setColor("#4de3e8")
			   .setDescription(chunk);

			message.reply({ embeds: [msg] });
		}
	}

	else if (command === 'clear_channel'){
		if (!message.member.permissions.has('MANAGE_MESSAGES')) {
            return message.reply('You do not have permission to manage messages.');
        }

		let qty = args[0] || 0;

		const channel = message.channel;

        if(qty === 0){
			let fetched;
			do {
			  fetched = await channel.messages.fetch({ limit: 100 });
			  // Filter to exclude pinned messages (pinned messages can't be bulk deleted)
			  const deletableMessages = fetched.filter(msg => !msg.pinned);
  
			  if (deletableMessages.size > 0) {
				  await channel.bulkDelete(deletableMessages, true).catch(error => {
					  console.error('Failed to delete messages:', error);
				  });
			  }
			} while (fetched.size >= 1);
		}
		else{
			let fetched;
			let toDel = qty > 100? 100: qty;
			qty -= toDel;
			do {
			  fetched = await channel.messages.fetch({ limit: toDel });
			  // Filter to exclude pinned messages (pinned messages can't be bulk deleted)
			  const deletableMessages = fetched.filter(msg => !msg.pinned);
  
			  if (deletableMessages.size > 0) {
				  await channel.bulkDelete(deletableMessages, true).catch(error => {
					  console.error('Failed to delete messages:', error);
				  });
			  }
			} while (fetched.size >= 1 && qty > 0);
		}
	  	

	  	await channel.send('All non-pinned messages deleted.');
	}
	
	else if(command === 'help') {
		return message.reply(`
		The bot has the following commands:
		[arg] - required, {arg} - optional

		!add_faction [id1] {id2} :		adds faction to the list
		!remove_faction [id1] {id2} : 	removes faction from the list

		!add_blacklist [id1] {id2} : 	adds player to blacklist
		!remove_blacklist [id1] {id2} : removes player from blacklist

		!add_item [id] [value] : 		adds item to the list
		!remove_item [id1] {id2} : 		removes item from the list

		!add_price [name] [value] : 	adds item to the list
		!remove_price [id1] {id2} : 	removes item from the list

		!list_factions: 				lists every faction currently being tracked
		!list_players: 					lists players with moneyOnHand > 0
		!list_stalklist: 				lists every player currently being tracked
		!list_items: 					lists every item currently being tracked
		!list_prices: 					lists every item currently being tracked

		!clear_channel:					clears message history in the channel

		Bot Handling commands:
		!bind_sales: 					binds the bot to the channel for sending sale-mug pings
		!bind_buymugs: 					binds the bot to the channel for sending buy-mug pings
		!bind_logs: 					binds the bot to the channel for logs
		!bind_cheapbuys: 				binds the bot to the channel for cheap buy pings
		!bind_sebuymugs: 				binds the bot to the channel for SE buymug pings
		!role_mug [@role]: 				binds the bot pings to the mugger role
		!role_buy [@role]: 				binds the bot pings to the buyer role
		!role_se [@role]: 				binds the bot pings to the SE role

		!add_key [key]: 				add api key
		!list_keys : 					lists every player whose key has been added
		`);
	}

	else{
		message.reply('Invalid Command.');
	}

})

client.once('ready', () => {
	console.log(`Logged in as ${client.user.tag}!, ver. 2.0`);
	StartLoop();
});

client.login(botToken);
