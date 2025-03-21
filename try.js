const fs = require("fs");


let players = require('./players.json');

currDate = parseInt(Date.now()/1000);

for (let index in players){
    if(currDate - players[index].lastAction <= 600){
        console.log(`Player ${players[index].name} [${index}] - Last Action ${currDate - players[index].lastAction} seconds ago`);
    }
}



//console.log(Object.keys(players).length);