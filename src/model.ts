
export enum Periode {
    AutomneHiver,
    PrintempsEte 
}

export interface Catalogue {
    periode: Periode
    articles: Article[]
}

export interface Article {
    nom: string
    modeles: Modele[]
}

export interface Modele {
    reference: string
    description: string
    prix: number
}