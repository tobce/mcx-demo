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
/*
function gyldigFødselsnummer(fødselsnummer) {
    if (fødselsnummer.length !== 11) {
        return false;
    }

    const vekter1 = [3, 7, 6, 1, 8, 9, 4, 5, 2, 1];
    const vekter2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2, 1];

    const sum1 = fødselsnummer
        .slice(0, 10)
        .split('')
        .reduce((acc, digit, idx) => acc + digit * vekter1[idx], 0);

    const sum2 = fødselsnummer
        .split('')
        .reduce((acc, digit, idx) => acc + digit * vekter2[idx], 0);

    const kontrollsiffer1 = sum1 % 11 === 0;
    const kontrollsiffer2 = sum2 % 11 === 0;

    return kontrollsiffer1 && kontrollsiffer2;
}
    */