
import { Article, Catalogue, Periode } from "./model";
import { CatalogueBuilder, CatalogueBuilder1, CatalogueBuilder2, CatalogueBuilder3 } from "./my.grammar.api";

export function newBuilder(): CatalogueBuilder {
    return new CatalogueBuilderImpl()
}

class CatalogueBuilderImpl implements CatalogueBuilder, CatalogueBuilder1, CatalogueBuilder2, CatalogueBuilder3 {
    private catalogue!: Catalogue
    private currentArticle?: Article

    of(periode: Periode) {
        this.catalogue = { periode, articles: [] }
        return this
    }

    build(): Catalogue {
        return this.catalogue
    }

    article(_0: string): CatalogueBuilder2;
    article(_0: string, _1: number, _2: string): CatalogueBuilder1;
    article(_0: string, _1?: number, _2?: string) {
        if (_1 && _2) {
            this.catalogue.articles.push({ nom: _0, modeles: [ { prix: _1, reference: _2, description: '' }]})
            return this
        }
        this.currentArticle = { nom: _0, modeles: [] }
        this.catalogue.articles.push(this.currentArticle)
        return this
    }

    modele(_0: string, _1: number, _2: string): CatalogueBuilder3 {
        this.currentArticle?.modeles.push({ reference: _2, prix: _1, description: _0 })
        return this
    }
}

const x: Catalogue = newBuilder().of(Periode.PrintempsEte)
    .article("Collier pour chien", 5, "CH1")
    .article("Antipuce")
        .modele("10ml", 20, "CH2A")
        .modele("20ml", 35, "CH2B")
    .article("Nonosse", 5, "CH3")
    .build()
    
console.log(JSON.stringify(x))
