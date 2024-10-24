const fs = require('fs');

function meldingarLogg(meldingsdata) {
    const jsonMeldingar = JSON.stringify(meldingsdata, null, 2);
    const filnamn = 'meldingar.json';
    if (!fs.existsSync(filnamn)) {
        fs.writeFileSync(filnamn, '');
    }
    let fil = fs.readFileSync(filnamn, 'utf8');
    
    if (fil.endsWith(']')) {
        fil = fil.slice(0, -1);
    }

    fil = fil + ',\n' + jsonMeldingar;

    if (fil.startsWith(',')) {
        fil = fil.slice(1);
    }
    
    if (!fil.startsWith('[')) {fil = '[' + fil;}
    
    if (!fil.endsWith(']')) {fil = fil + ']';}
    fs.writeFileSync(filnamn, fil);
}

module.exports = meldingarLogg;