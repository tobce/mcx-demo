class Talegruppe {
    constructor(id, talegruppenamn) {
        this.id = id;
        this.namn = talegruppenamn;
    }

    toString() {
        return `Talegruppe - ID: ${this.id}, namn: ${this.talegruppenamn}`;
    }
}

module.exports = Talegruppe;