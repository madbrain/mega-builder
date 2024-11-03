
/**
 * UnionToIntersection<{ foo: string } | { bar: string }> =
 *  { foo: string } & { bar: string }.
 */
type UnionToIntersection<U> = (
    U extends unknown ? (arg: U) => 0 : never
  ) extends (arg: infer I) => 0
    ? I
    : never;
  
/**
 * LastInUnion<1 | 2> = 2.
 */
type LastInUnion<U> = UnionToIntersection<
    U extends unknown ? (x: U) => 0 : never
    > extends (x: infer L) => 0
    ? L
    : never;

/**
 * UnionToTuple<1 | 2> = [1, 2].
 */
type UnionToTuple<U, Last = LastInUnion<U>> = [U] extends [never]
    ? []
    : [...UnionToTuple<Exclude<U, Last>>, Last];

// Helper type to convert the keys of an object type to a tuple
type KeysToTuple<T extends object> = UnionToTuple<keyof T>;

// Helper type to compute the length of a tuple
type Length<T extends any[]> = AsNumber<T['length']>;

type AsNumber<T> = T extends number ? T : never;

// Main type to compute the number of properties of an object type
export type NumOfProps<T extends object> = Length<KeysToTuple<T>>;

// bushman technics from :
// https://dev.to/susisu/how-to-create-deep-recursive-types-5fgg
export type _Recurse<T> =
    T extends { __rec: never } ? never
  : T extends { __rec: { __rec: infer U } } ? _Recurse<U>
  : T extends { __rec: infer U } ? U
  : T;

// type _Repeat<T, N extends number, A extends T[]> =
//   A["length"] extends N
//     ? A
//     : {__rec: _Repeat<T, N, [T, ...A]> };
// type Repeat<T, N extends number> = _Recurse<_Repeat<T, N, []>>;


// // XS = ["x", "x", "x", "x", "x"]
// type XS = Repeat<"x", 1000>;

// https://www.hacklewayne.com/typescript-convert-union-to-tuple-array-yes-but-how

type Contra<T> =
 T extends any 
 ? (arg: T) => void 
 : never;

type InferContra<T> = 
 [T] extends [(arg: infer I) => void] 
 ? I 
 : never;

export type PickOne<T> = InferContra<InferContra<Contra<Contra<T>>>>;

export type Union2Tuple<T> =
 PickOne<T> extends infer U ?
     U extends never ? [] :
     Exclude<T, U> extends never
     ? [T]
     : [...Union2Tuple<Exclude<T, U>>, U]
 : never;