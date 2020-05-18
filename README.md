typecheck.macro
===
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)

> Automatically generate blazing 🔥🔥 fast validators for Typescript types.

# Simple Example

```typescript
type Cat<T> = {
    breed: "tabby" | "siamese";
    isNice: boolean;
    trinket?: T;
}
register('Cat')
const isNumberCat = createValidator<Cat<number>>()
isNumberCat({ breed: "tabby", isNice: false })                 // true
isNumberCat({ breed: "corgi", isNice: true, trinket: "toy" })  // false
```

# Why?

## Ease of Use
With typecheck.macro you can write normal Typescript types and automatically get validation functions for them. Other validation libraries require you to write your types in a [DSL](https://en.wikipedia.org/wiki/Domain-specific_language).

typecheck.macro supports interfaces, generics, tuples, unions, index signatures, optional properties, and more so you can write types naturally.

## Performance
typecheck.macro generates specialized validation functions for each type that are pure Javascript. (Almost) every other library generates generic data structures that are plugged into a generic validator function.

typecheck.macro is up to 3x faster than [ajv](https://github.com/ajv-validator/ajv), the fastest JSON schema validator. And anywhere from 6 to 500 times faster than popular libraries, like [runtypes](https://github.com/pelotom/runtypes) or [zod](https://github.com/vriad/zod).

*All comparisons are friendly in nature*

# Installation
If you are using [Gatsby](https://github.com/gatsbyjs/gatsby) or [Create React App](https://github.com/facebook/create-react-app), you can just install the macro. No other steps needed!

Otherwise, you will need to switch over to compiling your Typescript with Babel. This isn't difficult since Babel has good Typescript support. See [the example](example/).

Then install `babel-plugin-macros` and add it to your babel config.

Finally, `npm install typecheck.macro`

# Usage
*In addition to reading this, read [the example](example/).*

```typescript
import createValidator, { register } from 'typecheck.macro'

type A = {index: number, name: string}
register('A')
// named type
const validator = createValidator<A>()
// anonymous type
const validator2 = createValidator<{index: number, name: string}>()
// mix and match (anonymous type that contains a named type)
const validator3 = createValidator<{index: number, value: A}>()
```

### `register(typeName: string)`
If you want to validate a named type or an anonymous type that references a named type, you must register the named type.

`typeName` is the name of the type you want to register. The type declaration must be in the same scope of the call to `register`.

```typescript
{
    type A = {val: string}
    register('A') // registers A
    {
        register('A') // does nothing :(
    }
}
register('A') // does nothing :(
```

All registered types are stored in a global namespace.

`register` automatically registers **all** types in the same scope as the original type it is registering that are referred to by the original type.

```typescript
type A = {val: string}
type B = {val: A}
type C = {val: A}
// registers A and B, but not C, since B only refers to A.
register('B')
```
All instances of the `register` macro are evaluated before any instance of `createValidator`. So ordering doesn't matter.

*Because `register` stores types in a global namespace for your entire project, make sure all your registered types have different names.*

The default types: `boolean`, `string`, and `number` are registered for you. As are `Array` and `ReadonlyArray`.

### `createValidator<T>(): (value: unknown) => value is T`
Creates a validator function for the type `T`.

`T` can be any valid supported Typescript type. This includes any named type, anonymous type, or anonymous type that has references to named types.

At compile time, the call to register will be replaced with the generated code.

# Support Tables

*See [the tests](tests/fixtures/exec) to get a good idea of what is supported*

## Primitives Types
| Primitives | Support |
|------------|---------|
| number     | Yes     |
| string     | Yes     |
| boolean    | Yes     |
| object     | Yes     |
| any        | Yes     |
| unknown    | Yes     |
| BigInt     | WIP     |
| Symbol     | WIP     |

## Builtin Generic Types
| Type          | Support | Notes                     |
|---------------|---------|---------------------------|
| Array         | Yes     |                           |
| ReadonlyArray | Yes     | Same as Array at runtime. |
| Map           | WIP     |                           |
| ReadonlyMap   | WIP     | Same as Map at runtime.   |
| Record        | WIP     |                           |

## Typescript Concepts
| Language Features            | Support | Notes                              |
|------------------------------|---------|------------------------------------|
| interface                    | Yes     | extending another interface is WIP |
| type alias                   | Yes     |                                    |
| generics                     | Yes     |                                    |
| union types                  | Yes     |                                    |
| tuple types                  | Yes     |                                    |
| arrays                       | Yes     |                                    |
| index signatures             | Yes     |                                    |
| literal types                | Yes     |                                    |
| circular references          | WIP     |                                    |
| parenthesis type expressions | WIP     |                                    |
| Mapped Types                 | WIP     |                                    |
| classes                      | No      |                                    |

# Performance Table

# Caveats