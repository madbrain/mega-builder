import { createBuilder } from './mega-builder';
import { Article, Catalogue, Modele, Periode } from './model'

class BuilderAction {
    periode!: Periode;
    articles: Article[] = [];

    build(): Catalogue {
        return { periode: this.periode, articles: this.articles }
    }

    of(period: Periode) {
        this.periode = period;
    }
    
    simpleArticle(name: string, price: number, model: string) {
        const article = { nom: name, modeles: [ { description: "", prix: price, reference: model } ]};
        this.articles.push(article);
    }

    articleName(name: string) {
        const article = { nom: name, modeles: []}
        this.articles.push(article);
    }

    modele(ref: string, price: number, desc: string) {
        const model: Modele = { reference: ref, prix: price, description: desc };
        this.articles[this.articles.length-1].modeles.push(model)
    }
}

export const catalogueBuilder = createBuilder("of (simpleArticle:article | articleName:article modele+)*", BuilderAction)

const result = catalogueBuilder.of(Periode.PrintempsEte)
    .simpleArticle("Collier pour chien", 5, "CH1")
    .articleName("Antipuce")
        .modele("10ml", 20, "CH2A")
        .modele("20ml", 35, "CH2B")
    .simpleArticle("Nonosse", 5, "CH3")
    .build()

console.log(JSON.stringify(result))