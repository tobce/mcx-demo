const Tilgangsnivå = {
    GJEST: 'gjest',
    BRUKAR: 'brukar',
    ADMINISTRATOR: 'administrator'
};

/**
 * Representerer ein brukar.
 * 
 * @class Brukar
 * @param {string} fødselsnummer - Fødselsnummeret til brukaren.
 * @param {Array} talegrupper - Liste over talegrupper brukaren tilhøyrer.
 * @param {Object} folkeregister - Folkeregisteret for å finne personinformasjon.
 * @throws Error - Kastar ein feil dersom personen ikkje finst i Folkeregisteret.
 */
class Brukar {
    constructor(fødselsnummer, talegrupper, folkeregister, tilgangsnivå) {
        this.person = folkeregister.finnPerson(fødselsnummer);
        if (!this.person) {
            throw new Error('Fann ikkje personen i Folkeregisteret');
        }

        this.talegrupper = talegrupper
        this.fødselsnummer = this.person.hentFødselsnummer();
        this.namn = this.person.hentNamn();
        this.tilgangsnivå;
        this.setTilgangsnivå(tilgangsnivå);
    }

    hentFødselsnummer() {
        return this.fødselsnummer;
    }

    hentNamn() {
        return this.namn;
    }

    hentTilgangsnivå() {
        return this.tilgangsnivå;
    }

    setTilgangsnivå(nyttTilgangsnivå) {
        if (Object.values(Tilgangsnivå).includes(nyttTilgangsnivå)) {
            this.tilgangsnivå = nyttTilgangsnivå;
        } else {
            throw new Error('Ugyldig tilgangsnivå');
        }
    }
}

module.exports = { Brukar, Tilgangsnivå };