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

type ComposeKind<
  O1 extends OpticKind,
  O2 extends OpticKind
> = ComposeMap[O1][O2];

export type OpticKind = "One" | "Optional" | "Traversal";

type Elem<A> = A extends Array<infer E> ? E : never;

export type Optic<O extends OpticKind, S, A> = {
  type: O;
  update: (f: (a: A) => A) => (s: S) => S;
};

export type Chain<O extends OpticKind, S, A> = Optic<O, S, A> & {
  prop: <K extends keyof A>(name: K) => Chain<ComposeKind<O, "One">, S, A[K]>;
  filter: (
    pred?: (item: Elem<A>, index: number) => boolean
  ) => Chain<ComposeKind<O, "Traversal">, S, Elem<A>>;
  collect: () => Chain<ComposeKind<O, "Traversal">, S, Elem<A>>;
  at: (index: number) => Chain<ComposeKind<O, "Optional">, S, Elem<A>>;
  opt: () => Chain<ComposeKind<O, "Optional">, S, NonNullable<A>>;
  guard: <B extends A>(
    g: (v: A) => v is B
  ) => Chain<ComposeKind<O, "Optional">, S, B>;
  compose: <Other extends OpticKind, B>(
    other: Optic<Other, A, B>
  ) => Chain<ComposeKind<O, Other>, S, B>;
};

export function _chain<O extends OpticKind, S, A>(
  optic: Optic<O, S, A>
): Chain<O, S, A> {
  const self: Chain<O, S, A> = {
    type: optic.type,

    update: optic.update,

    prop: <K extends keyof A>(name: K): Chain<ComposeKind<O, "One">, S, A[K]> =>
      _chain(prop(self, name)),

    opt: (): Chain<ComposeKind<O, "Optional">, S, NonNullable<A>> =>
      _chain(toOptional(self)),

    filter: (
      pred: (item: Elem<A>, index: number) => boolean = () => true
    ): Chain<ComposeKind<O, "Traversal">, S, Elem<A>> =>
      _chain(filter(self, pred)),

    collect: (): Chain<ComposeKind<O, "Traversal">, S, Elem<A>> =>
      _chain(filter(self, () => true)),

    at: (index: number): Chain<ComposeKind<O, "Optional">, S, Elem<A>> =>
      _chain(at(self, index)),

    guard: <B extends A>(
      g: (v: A) => v is B
    ): Chain<ComposeKind<O, "Optional">, S, B> => _chain(toGuard(self, g)),

    compose: <Other extends OpticKind, B>(
      other: Optic<Other, A, B>
    ): Chain<ComposeKind<O, Other>, S, B> => _chain(compose(self, other)),
  };
  return self;
}

export function compose<O1 extends OpticKind, O2 extends OpticKind, S, A, B>(
  o1: Optic<O1, S, A>,
  o2: Optic<O2, A, B>
): Optic<ComposeKind<O1, O2>, S, B> {
  return {
    type: composeMap[o1.type][o2.type],
    update: (f) => o1.update(o2.update(f)),
  };
}

export function toGuard<O extends OpticKind, S, A, B extends A>(
  o: Optic<O, S, A>,
  g: (a: A) => a is B
) {
  return compose(
    o,
    prismOptic<A, B>(
      (a) => (g(a) ? a : undefined),
      (a) => a
    )
  );
}

export function prop<O extends OpticKind, S, A, K extends keyof A>(
  o: Optic<O, S, A>,
  name: K
) {
  return compose(
    o,
    lensOptic(
      (s) => s[name],
      (a, s) => setProp(s, name, a)
    )
  );
}

export function at<O extends OpticKind, S, A>(
  o: Optic<O, S, A>,
  index: number
) {
  return compose(
    o,
    affineOptic<A, Elem<A>>(
      (a: A) => (Array.isArray(a) ? a[index] : undefined),
      (a, s) => (Array.isArray(s) ? (updateAt(s, index, () => a) as A) : s)
    )
  );
}

export function toOptional<O extends OpticKind, S, A>(o: Optic<O, S, A>) {
  return compose(o, {
    type: "Optional",
    update: (f: (a: NonNullable<A>) => NonNullable<A>) => (a) =>
      a === undefined || a === null ? a : f(a),
  });
}

export function filter<O extends OpticKind, S, A>(
  o: Optic<O, S, A>,
  pred: (a: Elem<A>, index: number) => boolean
): Optic<"Traversal", S, Elem<A>> {
  return compose(o, {
    type: "Traversal",
    update: (f) => (a) => Array.isArray(a) ? (mapArray(a, f, pred) as A) : a,
  });
}

export function chain<T>(): Chain<"One", T, T> {
  return _chain({ type: "One", update: (f) => (s) => f(s) });
}

export function get<S, A>(o: Optic<"One", S, A>, s: S): A {
  let a: A = undefined as A;
  o.update((v) => {
    a = v;
    return v;
  })(s);
  return a;
}

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

export function collect<S, A>(o: Optic<OpticKind, S, A>, s: S): A[] {
  let a: A[] = [];
  o.update((v) => {
    a.push(v);
    return v;
  })(s);
  return a;
}

export function update<S, A>(
  o: Optic<OpticKind, S, A>,
  f: (a: A) => A
): (s: S) => S {
  return o.update(f);
}

export function set<S, A>(o: Optic<OpticKind, S, A>, s: S, a: A): S {
  return update(o, () => a)(s);
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

export const identity = <T>() =>
  adapterOptic(
    (t: T) => t,
    (t) => t
  );

export const adapterOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A) => S
): Optic<"One", S, A> => ({
  type: "One",
  update: _update(get, set),
});

export const lensOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): Optic<"One", S, A> => ({
  type: "One",
  update: _update(get, set),
});

export const prismOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A) => S
): Optic<"Optional", S, A> => ({
  type: "Optional",
  update: _updateOpt(get, set),
});

export const affineOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A, s: S) => S
): Optic<"Optional", S, A> => ({
  type: "Optional",
  update: _updateOpt(get, set),
});

export const traversalOptic = <S, A>(
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

function setProp<T, K extends keyof T>(o: T, n: K, v: T[K]): T {
  return updateProp(o, n, () => v);
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
