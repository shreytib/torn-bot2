const fs = require("fs");


let players = require('./players.json');
let factions = require('./factions.json');

let factions_list = Object.keys(factions);

for (let i in players){
    if(!factions_list.includes(players[i].faction_id)){
        delete players[i];
    }
}

fs.writeFileSync('players.json', JSON.stringify(players));
console.log('Done');