class Folkeregister {
    constructor() {
        this.personar = [];
    }

    leggTilPerson(person) {
        this.personar.push(person);
    }

    finnPerson(fødselsnummer) {
        return this.personar.find(person => person.hentFødselsnummer() === fødselsnummer);
    }
}

module.exports = Folkeregister;