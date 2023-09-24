import { Catalogue, Periode } from './model'

export interface CatalogueBuilder {
  of(_0: Periode): CatalogueBuilder1
}
export interface CatalogueBuilder1 {
  build(): Catalogue
  article(_0: string, _1: number, _2: string): CatalogueBuilder1
  article(_0: string): CatalogueBuilder2
}
export interface CatalogueBuilder2 {
  modele(_0: string, _1: number, _2: string): CatalogueBuilder3
}
export interface CatalogueBuilder3 {
  build(): Catalogue
  article(_0: string, _1: number, _2: string): CatalogueBuilder1
  article(_0: string): CatalogueBuilder2
  modele(_0: string, _1: number, _2: string): CatalogueBuilder3
}
