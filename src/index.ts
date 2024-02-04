const composeMap = {
  One: {
    One: "One",
    Optional: "Optional",
    Traversal: "Traversal",
  },
  Optional: {
    One: "Optional",
    Optional: "Optional",
    Traversal: "Traversal",
  },
  Traversal: {
    One: "Traversal",
    Optional: "Traversal",
    Traversal: "Traversal",
  },
} as const;

type ComposeMap = typeof composeMap;

export type OpticKind = "One" | "Optional" | "Traversal";

type Elem<A> = A extends Array<infer E> ? E : never;

export type Optic<O extends OpticKind, S, A> = {
  type: O;
  update: (f: (a: A) => A) => (s: S) => S;
};

export type Chain<O extends OpticKind, S, A> = Optic<O, S, A> & {
  prop: <K extends keyof A>(name: K) => Chain<ComposeMap[O]["One"], S, A[K]>;
  collect: (
    pred: (item: Elem<A>, index: number) => boolean
  ) => Chain<ComposeMap[O]["Traversal"], S, Elem<A>>;
  at: (index: number) => Chain<ComposeMap[O]["Optional"], S, Elem<A>>;
  opt: () => Chain<ComposeMap[O]["Optional"], S, NonNullable<A>>;
  guard: <B extends A>(
    g: (v: A) => v is B
  ) => Chain<ComposeMap[O]["Optional"], S, B>;
  compose: <Other extends OpticKind, B>(
    other: Optic<Other, A, B>
  ) => Chain<ComposeMap[O][Other], S, B>;
};

function _optic<O extends OpticKind, S, A>(
  base: Optic<O, S, A>
): Chain<O, S, A> {
  const self: Chain<O, S, A> = {
    type: base.type,

    update: base.update,

    prop: <K extends keyof A>(name: K): Chain<ComposeMap[O]["One"], S, A[K]> =>
      _optic(
        compose(self, {
          type: "One",
          update: (f) => (s) => updateProp(s, name, f),
        })
      ),

    opt: (): Chain<ComposeMap[O]["Optional"], S, NonNullable<A>> =>
      _optic(
        compose(self, {
          type: "Optional",
          update: (f) => (a) => a === undefined || a === null ? a : f(a),
        })
      ),

    collect: (
      pred: (item: Elem<A>, index: number) => boolean
    ): Chain<ComposeMap[O]["Traversal"], S, Elem<A>> =>
      _optic(
        compose(self, {
          type: "Traversal",
          update: (f) => (a) =>
            Array.isArray(a) ? (mapArray(a, f, pred) as A) : a,
        })
      ),

    at: (index: number): Chain<ComposeMap[O]["Optional"], S, Elem<A>> =>
      _optic(
        compose(self, {
          type: "Traversal",
          update: (f) => (a) =>
            Array.isArray(a) ? (updateAt(a, index, f) as A) : a,
        })
      ),

    guard: <B extends A>(
      g: (v: A) => v is B
    ): Chain<ComposeMap[O]["Optional"], S, B> =>
      _optic(
        compose(
          self,
          prism<A, B>(
            (a) => (g(a) ? a : undefined),
            (a) => a
          )
        )
      ),

    compose: <Other extends OpticKind, B>(
      other: Optic<Other, A, B>
    ): Chain<ComposeMap[O][Other], S, B> =>
      _optic(compose<O, Other, S, A, B>(self, other)),
  };
  return self;
}

export function compose<O1 extends OpticKind, O2 extends OpticKind, S, A, B>(
  o1: Optic<O1, S, A>,
  o2: Optic<O2, A, B>
): Optic<ComposeMap[O1][O2], S, B> {
  return {
    type: composeMap[o1.type][o2.type],
    update: (f) => o1.update(o2.update(f)),
  };
}

export function optic<T>(): Chain<"One", T, T> {
  return _optic({ type: "One", update: (f) => (s) => f(s) });
}

/**
 * One focus
 *
 * @param o Optic to use
 * @param s Container
 * @returns The focus value
 */
export function get<S, A>(o: Optic<"One", S, A>, s: S): A {
  let a: A = undefined as A;
  o.update((v) => {
    a = v;
    return v;
  })(s);
  return a;
}

/**
 * Optional
 *
 * @param o Optic to use
 * @param s Container
 * @returns The focus value or undefined
 */
export function preview<S, A>(
  o: Optic<"One", S, A> | Optic<"Optional", S, A>,
  s: S
): A | undefined {
  let a: A | undefined = undefined;
  o.update((v) => {
    a = v;
    return v;
  })(s);
  return a;
}

/**
 * Function to return multiple focuses
 *
 * @param o Optic to use
 * @param s Container
 * @returns Multiple focus values
 */

export function traverse<S, A>(o: Optic<OpticKind, S, A>, s: S): A[] {
  let a: A[] = [];
  o.update((v) => {
    a.push(v);
    return v;
  })(s);
  return a;
}

function _updateOpt<S, A>(
  get: (s: S) => A | undefined | null,
  set: (a: A, s: S) => S
): (f: (a: A) => A) => (s: S) => S {
  return (f) => (s) => {
    const a = get(s);
    if (a === undefined || a === null) return s;
    const r = f(a);
    return r === a ? s : set(r, s);
  };
}

function _update<S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): (f: (a: A) => A) => (s: S) => S {
  return (f) => (s) => {
    const a = get(s);
    const r = f(a);
    return r === a ? s : set(r, s);
  };
}

export const adapter = <S, A>(
  get: (s: S) => A,
  set: (a: A) => S
): Optic<"One", S, A> => ({
  type: "One",
  update: _update(get, set),
});

export const lens = <S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): Optic<"One", S, A> => ({
  type: "One",
  update: _update(get, set),
});

export const prism = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A) => S
): Optic<"Optional", S, A> => ({
  type: "Optional",
  update: _updateOpt(get, set),
});

export const affine = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A, s: S) => S
): Optic<"Optional", S, A> => ({
  type: "Optional",
  update: _updateOpt(get, set),
});

export const traversal = <S, A>(
  get: (s: S) => A[],
  set: (a: A[], s: S) => S
): Optic<"Traversal", S, A> => ({
  type: "Traversal",
  update: (f) => (s) => set(get(s).map(f), s),
});

/*

  Utility functions for immutable updates

*/
function mapArray<T>(
  arr: T[],
  f: (item: T, index: number, arr: T[]) => T,
  pred: (t: T, index: number, arr: T[]) => boolean = () => true
): T[] {
  let mutationCount = 0;

  const result = arr.map((item, index) => {
    if (!pred(item, index, arr)) return item;

    const r = f(item, index, arr);
    if (r !== item) mutationCount++;

    return r;
  });
  return mutationCount > 0 ? result : arr;
}

function updateAt<T>(
  arr: T[],
  index: number,
  f: (t: T, index: number, arr: T[]) => T
): T[] {
  if (index < 0 || index >= arr.length) return arr;

  const oldValue = arr[index];
  const newValue = f(oldValue, index, arr);
  if (oldValue === newValue) return arr;

  const result = [...arr];
  result[index] = newValue;

  return result;
}

function updateProp<T, K extends keyof T>(
  o: T,
  n: K,
  f: (v: T[K], o: T) => T[K]
): T {
  const newValue = f(o[n], o);
  if (o[n] === newValue) return o;
  return { ...o, [n]: newValue };
}
