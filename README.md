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

```

# Chain

The easiest way to use the optics is through the `Chain`-type. You create
value of `Chain` using the `Z.chain()`-function.

`Chain` provides following functions:

## prop

Creates an optic that focuses on a certain property of an object.

## filter

Creates a traversal optic that focuses all elements of an array
that matches a predicate.

## collect

Converts an optic which focus is an array to a traversal.

## at

Focuses into one element of an array (specified by an index).

## opt

Converts optic that may have `underined` focus to an optional optics. 

## guard

Restricts a type of focus. This may be used for example to 
restrict a tagged union type.

## compose

Helper function to compose current optics with another one.

# Functions for creating different optics manually

## adapter

```typescript
const adapterOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A) => S
): Optic<"One", S, A>
```

Creates an optic that adapts the whole value to the focus value, and viceversa.

## lens

```typescript
const lensOptic = <S, A>(
  get: (s: S) => A,
  set: (a: A, s: S) => S
): Optic<"One", S, A>
```

Lens access a certain focus value from a bigger context. 

To build the bigger context Lens needs the new focus value and the old context.

## prism

```typescript
const prismOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A) => S
): Optic<"Optional", S, A>
```

Prism is similar then Lens that it access a certain focus from a bigger context. Prism have the
possibility that the focus value isn't available. 

With prism you can build the bigger context using only the focus value.

## affine

```typescript
const affineOptic = <S, A>(
  get: (s: S) => A | undefined,
  set: (a: A, s: S) => S
): Optic<"Optional", S, A>
```

Affine may or may not have the focus value.

With affine you must provide the focus and the old context to build the new context.

## traversal

## compose

Composes two optics together.

```typescript 
const PersonAddress = Z.chain<Person>().prop("address");
const AddressStreet = Z.chain<Address>().prop("street");
const O = Z.compose(PersonAddress, AddressStreet);
```