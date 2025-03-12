const fs = require("fs");


let stalkList = require('./stalkList.json');
let players = require('./players.json');

for (let i in stalkList){
    if(!players.hasOwnProperty(i)){
        console.log('Deleting : ', i);
        delete stalkList[i];
    }
}

fs.writeFileSync('stalkList.json', JSON.stringify(stalkList));
console.log('Done');