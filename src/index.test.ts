import fc from "fast-check";
import { get, chain, preview } from ".";

interface Address {
  street: string;
  apartment?: string;
  zip: number;
}

interface Person {
  name: string;
  age: number;
  addr?: Address;
  codes?: number[];
}

interface A {
  value: string;
}

interface B {
  value: string;
  a?: A;
}

interface C {
  value: string;
  b: B;
}

describe("properties", () => {
  it("should get element at index", () => {
    const O = chain<number[]>().at(1);
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 2 }), (data) => {
        expect(preview(O, data)).toEqual(data[1]);
      })
    );
  });

  it("should update correct item with filter", () => {
    const pred = (n: number) => n > 10;
    const modify = (n: number) => n * 13;
    const O = chain<number[]>().filter(pred);
    fc.assert(
      fc.property(fc.array(fc.integer()), (data) => {
        expect(O.update(modify)(data)).toEqual(
          data.map((i) => (pred(i) ? modify(i) : i))
        );
      })
    );
  });

  it("should update correct deep items with filter", () => {
    const pred = (n: number) => n > 10;
    const modify = (n: number) => n + 1;
    const O = chain<Person[]>().collect().prop("codes").filter(pred);

    const personArb = fc
      .array(fc.integer())
      .map((codes): Person => ({ name: "John", age: 40, codes }));
    const personsArb = fc.array(personArb);

    fc.assert(
      fc.property(personsArb, (data) => {
        expect(O.update(modify)(data)).toEqual(
          data.map((person) => ({
            ...person,
            codes: person.codes?.map((code) =>
              pred(code) ? modify(code) : code
            ),
          }))
        );
      })
    );
  });

  it("should update element at index", () => {
    const O = chain<number[]>().at(1);
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 2 }), (data) => {
        expect(O.update((a) => a + 1)(data)[1]).toEqual(data[1] + 1);
      })
    );
  });

  it("should get property", () => {
    const O = chain<Person>().prop("name");
    fc.assert(
      fc.property(fc.record({ name: fc.string(), age: fc.nat() }), (data) => {
        expect(get(O, data)).toEqual(data.name);
      })
    );
  });

  it("should update property", () => {
    const O = chain<Person>().prop("name");
    fc.assert(
      fc.property(fc.record({ name: fc.string(), age: fc.nat() }), (data) => {
        expect(O.update((a) => a + "x")(data)).toEqual({
          name: data.name + "x",
          age: data.age,
        });
      })
    );
  });

  it("should get deep property", () => {
    const O = chain<Person>().prop("addr").opt().prop("street");
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant("John"),
          age: fc.constant(40),
          addr: fc.record({ street: fc.string(), zip: fc.constant(1000) }),
        }),
        (data) => {
          expect(preview(O, data)).toEqual(data.addr.street);
        }
      )
    );
  });

  it("should update deep property", () => {
    const O = chain<Person>().prop("addr").opt().prop("street");
    fc.assert(
      fc.property(
        fc.record({
          name: fc.constant("John"),
          age: fc.constant(40),
          addr: fc.record({ street: fc.string(), zip: fc.constant(1000) }),
        }),
        (data) => {
          const result = O.update((s) => s + "x")(data);
          expect(result.addr?.street).toEqual(data.addr.street + "x");
          expect(result.addr?.zip).toEqual(1000);
        }
      )
    );
  });

  it("should update a deep property", () => {
    const O = chain<C>().prop("b").prop("a").opt().prop("value");
    const cArb = fc.tuple(fc.string(), fc.string(), fc.string()).map(
      ([a, b, c]): C => ({
        value: c,
        b: {
          value: b,
          a: {
            value: a,
          },
        },
      })
    );
    fc.assert(
      fc.property(cArb, (c) => {
        const result = O.update((s) => s + "x")(c);
        expect(result).toEqual({
          ...c,
          b: {
            ...c.b,
            a: {
              value: c.b.a!.value + "x",
            },
          },
        });
      })
    );
  });

  it("should not update if an optional item at path is missing", () => {
    const O = chain<C>().prop("b").prop("a").opt().prop("value");
    const cArb = fc.tuple(fc.string(), fc.string()).map(
      ([b, c]): C => ({
        value: c,
        b: {
          value: b,
          a: undefined,
        },
      })
    );
    fc.assert(
      fc.property(cArb, (c) => {
        const result = O.update((s) => s + "x")(c);
        expect(result).toEqual(c);
      })
    );
  });
});
