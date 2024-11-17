# Mega Builder Builder

Grammar oriented builder generator using the power of TypeScript type system.

Mega builder allows to construct strongly typed complex [Builder](https://en.wikipedia.org/wiki/Builder_pattern)
from a regexp like grammar expressed as a simple string.

## Example

```ts
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
    const model: Modele = { reference: ref, prix: price, scription: desc };
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
```

# Usage

The builder is constructed using the following function:

```ts
createBuilder(spec: string, actions: { new(): BuilderAction })
```

where spec uses the following syntax:

* Terms: E ::= Term
* Aliasing: E ::= Term `:` Alias
* Sequence: E ::= E1 E2
* Alternatives: E::= E1 `|` E2
* Grouping: E ::= `(` E1 `)`
* Zero or more: E ::= E1 `*`
* One or more: E ::= E1 `+`
* Optional: E ::= E1 `?`

and the builder actions class does the real job by implementing a function for each terminal
of the grammar and the finishing function `build()` which must return the complete built object.

# TODO

* Finish implement term alias (if possible?)
* Minimify DFA