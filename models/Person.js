class Person {
    constructor(fødselsnummer, fødselsdato, etternamn, fornamn, mobilnummer) {
        this.fødselsnummer = fødselsnummer;
        this.fødselsdato = fødselsdato;
        this.etternamn = etternamn;
        this.fornamn = fornamn;
        this.mobilnummer = mobilnummer;
    }

    hentNamn() {
        return `${this.fornamn} ${this.etternamn}`;
    }

    hentFødselsnummer() {
        return this.fødselsnummer;
    }

    hentFødselsdato() {
        return this.fødselsdato;
    }

    hentMobilnummer() {
        return this.mobilnummer;
    }
}

module.exports = Person;