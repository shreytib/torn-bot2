//const fs = require("fs");
const axios = require('axios');

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
      {v: 1E15, s: "Q"},
      {v: 1E18, s: "S"}
      ];
    let index;
    for (index = si.length - 1; index > 0; index--) {
        if (num >= si[index].v) {
            break;
        }
    }
    return prefix+(num / si[index].v).toFixed(2).replace(/\.0+$|(\.[0-9]*[1-9])0+$/, "$1") + si[index].s;
}

async function predictStat(data){
	//
	let age = data.age;
	let activity = data.personalstats.useractivity;

	let attacksstalemated = data.personalstats.attacksdraw ? data.personalstats.attacksdraw : 0;
	let attacksassisted = data.personalstats.attacksassisted ? data.personalstats.attacksassisted : 0;
	let attackswon = data.personalstats.attackswon ? data.personalstats.attackswon : 0;
	let attackslost = data.personalstats.attackslost ? data.personalstats.attackslost : 0;

	let revives = data.personalstats.revives ? data.personalstats.revives : 0;

	let statenhancersused = data.personalstats.statenhancersused ? data.personalstats.statenhancersused : 0;

	///

	console.log(`SEs used: ${statenhancersused}`);

	let xantaken = data.personalstats.xantaken ? data.personalstats.xantaken : 0;
	let refills = data.personalstats.refills ? data.personalstats.refills : 0;
	let energydrinkused = data.personalstats.energydrinkused ? data.personalstats.energydrinkused : 0 ;
	let boostersused = data.personalstats.boostersused ? data.personalstats.boostersused : 0;

	boostersused = boostersused - statenhancersused;

	///

	let attackE = (attackswon + attackslost + attacksstalemated + attacksassisted) * 25;
	let reviveE = revives * 25;
	let dumpE = data.personalstats.dumpsearches ? data.personalstats.dumpsearches * 5 : 0;
	//let bountyE = data.personalstats.bountiescollected ? data.personalstats.bountiescollected * 25 : 0;
	//let huntingE = (data.personalstats.soutravel) ? data.personalstats.soutravel * 2250 : 0;
	//let totalExpenditure = attackE + reviveE + dumpE + bountyE;
	let totalExpenditure = attackE + reviveE + dumpE;

	let energyDrinksE = energydrinkused * 25;
	let lsdE = data.personalstats.lsdtaken ? data.personalstats.lsdtaken * 50 : 0;
	let xanE = xantaken * 250;
	let donatordays = data.personalstats.daysbeendonator ? data.personalstats.daysbeendonator : 0;
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

	console.log(`Pre SE stats:  ~ [${shortenNumber(Math.min(stats,stats2))}] - [${shortenNumber(Math.max(stats,stats2))}]`);

	// let m1 = true;
	// let m2 = true;
	// let m3 = true;
	// let m4 = true;
	// let m5 = true;

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

	/*
	
	for (i = 0; i < statenhancersused; i++){
		if(stats < 10000000000){ // 10b
			stats += 35000000;
		}
		else if(stats < 25000000000){ // 25b
			if(m1){
				console.log(`Reached 10b in ${i} SEs. SEs left: ${statenhancersused - i}`);
				m1 = false;
			}
			stats += (stats - 5000000000) * 0.01;
		}
		else if(stats < 100000000000){ // 100b
			if(m2){
				console.log(`Reached 25b in ${i} SEs. SEs left: ${statenhancersused - i}`);
				m2 = false;
			}
			stats += (stats/1.6) * 0.01;
		}
		else if(stats < 2000000000000){ // 2T
			if(m3){
				console.log(`Reached 100b in ${i} SEs. SEs left: ${statenhancersused - i}`);
				m3 = false;
			}
			stats += (stats/2.2) * 0.01;
		}
		else if(stats < 800000000000000){ // 800T
			if(m4){
				console.log(`Reached 2T in ${i} SEs. SEs left: ${statenhancersused - i}`);
				m4 = false;
			}
			stats += (stats/3.5) * 1.01;
		}
		else {
			if(m5){
				console.log(`Reached 800T in ${i} SEs. SEs left: ${statenhancersused - i}`);
				m5 = false;
			}
			stats += 5000000000000;
		}

		if(stats2 < 10000000000){ // 10b
			stats2 += 40000000;
		}
		else if(stats2 < 25000000000){ // 25b
			stats2 += (stats2 - 5000000000) * 0.01;
		}
		else if(stats2 < 100000000000){ // 100b
			stats2 += (stats2/1.6) * 0.01;
		}
		else if(stats2 < 2000000000000){ // 2T
			stats2 += (stats2/2.2) * 0.01;
		}
		else if(stats2 < 800000000000000){ // 800T
			stats2 += (stats2/3.5) * 1.01;
		}
		else {
			stats2 += 5000000000000;
		}
	}

	*/
	
	//stats += statenhancersused * 40000000;
	//stats2 += statenhancersused * 40000000;

	//console.log(`Post SE stats :  ~ [${numberWithCommas(Math.min(stats,stats2))}] - [${numberWithCommas(Math.max(stats,stats2))}]`);

	stats = Math.ceil(Math.min(stats,stats2));
	stats2 = Math.ceil(Math.max(stats,stats2) / Math.log(Math.max(stats,stats2)) * 12);

	let text = `~ ${shortenNumber(Math.min(stats,stats2))} - ${shortenNumber(Math.max(stats,stats2))}`;

	return text;

}

async function start(){
	let url = 'https://api.torn.com/user/1944994?selections=profile,personalstats,bazaar&key=NQQVBSU3JG7QQ5UC';

	const response = await axios.get(url, { timeout: 15000 });
	
	//console.log(response);
	
	let start = performance.now();
	let text = await predictStat(response.data);
	let end = performance.now()

	console.log(`Estimate: ${text}\nTime taken = ${end-start} milliseconds.`);
}

start();

// console.log(parseInt(Date.now()/1000));
