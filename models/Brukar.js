const Talegruppe = require('./Talegruppe');
const { Folkeregister, generateDummyFolkeregister } = require('./Folkeregister');
const folkeregister = generateDummyFolkeregister();

class Brukar {
    constructor(fødselsnummer, talegrupper) {
        this.person = folkeregister.finnPerson(fødselsnummer);
        if (!this.person) {
            throw new Error('Fann ikkje personen i Folkeregisteret');
        }

        this.talegrupper = talegrupper
        this.id = this.person.hentFødselsnummer();
        this.fødselsnummer = this.person.hentFødselsnummer();
        this.namn = this.person.hentNamn();
    }

    hentFødselsnummer() {
        return this.fødselsnummer;
    }

    hentNamn() {
        return this.namn;
    }
    
    toString() {
        return `Fnr.: ${this.id}. Namn: ${this.namn}. Talegrupper: ${this.talegrupper.map(gruppe => gruppe.talegruppenamn).join(', ')}`;
    }
}

module.exports = Brukar;