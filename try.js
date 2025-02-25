const fs = require("fs");


let players = require('./players.json');

for (let i in players){
    players[i].lastBazaarCount = 0;
}

//fs.writeFileSync('players.json', JSON.stringify(players));
console.log('Done');