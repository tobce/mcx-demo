const Person = require('./Person');

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

function generateDummyFolkeregister() {
    const folkeregister = new Folkeregister();
    folkeregister.leggTilPerson(new Person('01010112345', '2001-01-01', 'Hansen', 'Ola', '92345678'));
    folkeregister.leggTilPerson(new Person('02020223456', '2002-02-02', 'Johansen', 'Kari', '93456789'));
    folkeregister.leggTilPerson(new Person('03030334567', '2003-03-03', 'Larsen', 'Nils', '94567890'));
    folkeregister.leggTilPerson(new Person('04040445678', '2004-04-04', 'Nilsen', 'Anne', '95678901'));
    folkeregister.leggTilPerson(new Person('00000000000', '2002-05-05', 'Berg', 'August', '96789012'));
    folkeregister.leggTilPerson(new Person('20070000000', '2000-07-20', 'Eikeland', 'Tobias Christensen', '94894969'));
    folkeregister.leggTilPerson(new Person('00000000001', '2001-05-05', 'Sylte', 'Sofia Larsen', '96789012'));
    return folkeregister;
}

module.exports = { Folkeregister, generateDummyFolkeregister };