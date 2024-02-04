import fc from "fast-check";
import { get, optic, preview, traverse } from ".";

interface Address {
  street: string;
  apartment?: string;
  zip: number;
}

interface Person {
  name: string;
  age: number;
  addr?: Address;
}

describe("properties", () => {
  it("should get element at index", () => {
    const O = optic<number[]>().at(1);
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 2 }), (data) => {
        expect(preview(O, data)).toEqual(data[1]);
      })
    );
  });

  it("should update element at index", () => {
    const O = optic<number[]>().at(1);
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 2 }), (data) => {
        expect(O.update((a) => a + 1)(data)[1]).toEqual(data[1] + 1);
      })
    );
  });

  it("should get property", () => {
    const O = optic<Person>().prop("name");
    fc.assert(
      fc.property(fc.record({ name: fc.string(), age: fc.nat() }), (data) => {
        expect(get(O, data)).toEqual(data.name);
      })
    );
  });

  it("should update property", () => {
    const O = optic<Person>().prop("name");
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
    const O = optic<Person>().prop("addr").opt().prop("street");
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
    const O = optic<Person>().prop("addr").opt().prop("street");
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
});
