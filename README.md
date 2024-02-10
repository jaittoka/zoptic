# zoptic
Simple optics library for Typescript

# Example

```typescript

import * as Z from 'zoptic'

interface Address {
  street: string;
  apartment?: string;
  zip: number;
}

interface Person {
  name: string;
  age: number;
  address: Address;
}

const person: Person = {
  name: "John",
  age: 30,
  address: {
    street: "Test street",
    apartment: "A310",
    zip: "52900",
  },
};

// Create an optic that focuses on the street of persons address

const o1 = Z.chain<Person>().prop("address").prop("street");

// Read the street using the optics

Z.get(o1, person);

// Update the street using the optics

Z.set(o1, person, "Test street 2");

// Or you can use the update method

Z.update(o1, (s) => s + " suffix")(person);

// Create an optional optics for `apartment`

const o2 = Z.chain<Person>().prop("address").prop("apartment").opt();


```

# Three kinds of optics

This library defines three kinds of optics:
* Optic with one focus (`Optic<"One", ...>`)
* Optic with optional focus (`Optic<"Optional", ...>`)
* Optic with zero to many focus values (`Optic<"Traversal", ...>`)

When you compose two optics together (with `compose`), the resulting optic
type is the more general of those two. For example if you compose
`One` optic with `Optional` one, the resulting object is `Optional`.

# Reading focus values from data

There are three functions to read data using optics: `get`, `preview` and `collect`.

* `get` is used for optics that always have one focus.
* `preview` is used for optics that have optional focus.
* `collect` is used for optics that can have zero to many focus values.

# Chain

The easiest way to use the optics is through the `Chain`-type. You create
value of `Chain` using the `Z.chain()`-function.

`Chain` provides following functions:

## prop

Creates an optic that focuses on a certain property of an object.

## filter

Creates a `Traversal` optic that focuses all elements of an array
that matches a predicate. The current focus must be an array value.

## collect

Converts an optic which focus is an array to a `Traversal` optic. The
current focus must be an array value.

## at

Focuses into one element of an array (specified by an index).
The current focus must be an array value. The resulting optic 
is `Optional`. 

## opt

Converts optic that may have `undefined` focus to an `Optional` optic. 

## guard

Restricts a type of focus. This may be used for example to 
restrict a tagged union type.

## compose

Helper function to compose current optics with another one.

# Functions for creating different optics manually

If the `Chain` doesn't have a method to create an optic that you need, 
you can create an optic manually with following functions and
then use `.compose` on the `Chain` to compose that optic with
the current one. 

## adapter

```typescript
const adapterOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A) => S
): Optic<"One", S, A>
```

Creates an optic that adapts the whole value to the focus value, and viceversa.

## lensOptic

```typescript
const lensOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): Optic<"One", S, A>
```

Lens access a certain focus value from a bigger context. 

To build the bigger context Lens needs the new focus value and the old context.

## prismOptic

```typescript
const prismOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A) => S
): Optic<"Optional", S, A>
```

Prism is similar then Lens that it access a certain focus from a bigger context. Prism have the
possibility that the focus value isn't available. 

With prism you can build the bigger context using only the focus value.

## affineOptic

```typescript
const affineOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A, s: S) => S
): Optic<"Optional", S, A>
```

Affine may or may not have the focus value.

With affine you must provide the focus and the old context to build the new context.

## traversalOptic

## compose

Composes two optics together.

```typescript 
const PersonAddress = Z.chain<Person>().prop("address");
const AddressStreet = Z.chain<Address>().prop("street");
const O = Z.compose(PersonAddress, AddressStreet);
```