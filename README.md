typecheck.macro
===
[![Babel Macro](https://img.shields.io/badge/babel--macro-%F0%9F%8E%A3-f5da55.svg?style=flat-square)](https://github.com/kentcdodds/babel-plugin-macros)

> Automatically generate 🔥blazing🔥 fast validators for Typescript types.

*This project is in beta but it has been tested against established libraries, like [ajv](https://github.com/ajv-validator/ajv), to ensure it is reliable and doesn't make mistakes. Support for intersection types + circular types + error messages is coming soon, so keep watch!*

# Example

```typescript
type Cat<T> = {
    breed: "tabby" | "siamese";
    isNice: boolean;
    trinket?: T;
}
registerType('Cat')
const isNumberCat = createValidator<Cat<number>>()
isNumberCat({ breed: "tabby", isNice: false })                 // true
isNumberCat({ breed: "corgi", isNice: true, trinket: "toy" })  // false
```

# Purpose

Because Typescript types are erased at compile time you can't use them to validate data at runtime. For example, you might want to ensure an API is returning data that matches a given type at runtime. This library (macro) generates validation functions for your Typescript types at compile time.

# Why this library/macro?

## Ease of Use
With typecheck.macro you can write normal Typescript types and automatically get validation functions for them. Other validation libraries require you to write your types in a [DSL](https://en.wikipedia.org/wiki/Domain-specific_language). Thus, typecheck.macro naturally integrates into your project without requiring you to change any existing code.

typecheck.macro supports validating interfaces, generics, tuples, unions, index signatures, optional properties, and more so you can validate most of your existing types automatically.

## Performance
typecheck.macro generates specialized validation functions for each type that are pure Javascript. (Almost) every other library generates generic data structures that are plugged into a generic validator function.

typecheck.macro is up to 3x faster than [ajv](https://github.com/ajv-validator/ajv), the fastest JSON schema validator. And anywhere from 6 to 500 times faster than popular libraries, like [runtypes](https://github.com/pelotom/runtypes) or [zod](https://github.com/vriad/zod).

*All comparisons are friendly in nature*

# Installation
If you are using [Gatsby](https://github.com/gatsbyjs/gatsby) or [Create React App](https://github.com/facebook/create-react-app), you can just install the macro. No other steps needed! (*Most likely, I haven't tried it personally, so let me know what happens!*)

Otherwise, you will need to switch over to compiling your Typescript with Babel. This isn't difficult since Babel has good Typescript support. See [the example](example/).

Then install `babel-plugin-macros` and add it to your babel config.

Finally, `npm install typecheck.macro`

*Let me know if you have any installation issues, I **will** respond.*
# Usage
*In addition to reading this, read [the example](example/).*

```typescript
import createValidator, { registerType } from 'typecheck.macro'

type A = {index: number, name: string}
registerType('A')
// named type
const validator = createValidator<A>()
// anonymous type
const validator2 = createValidator<{index: number, name: string}>()
// mix and match (anonymous type that contains a named type)
const validator3 = createValidator<{index: number, value: A}>()
```

### `registerType(typeName: string)`
If you want to validate a named type or an anonymous type that references a named type, you must register the named type.

`typeName` is the name of the type you want to register. The type declaration must be in the same scope of the call to `registerType`.

```typescript
{
    type A = {val: string}
    registerType('A') // registers A
    {
        registerType('A') // does nothing :(
    }
}
registerType('A') // does nothing :(
```

All registered types are stored in a per-file global namespace. This means any types you want to register in the same file should have different names.

registering a type in one file will not allow it to be accessible in another file. This means you cannot generate validators for multi-file types
(a type that references a type imported from another file). If this is a big issue for you, go to the "Caveats" section.

A work-around for supporting multi-file types is to move your multi-file types into one file (so they are no longer multi-file types). Then generate the validation
functions in that file and export to them where you want to use them. This works because validation functions are just normal Javascript!

`registerType` automatically registers **all** types in the same scope as the original type it is registering that are referred to by the original type.

```typescript
type A = {val: string}
type B = {val: A}
type C = {val: A}
// registers A and B, but not C, since B only refers to A.
registerType('B')
```
All instances of the `registerType` macro are evaluated before any instance of `createValidator`. So ordering doesn't matter.

Most of the primitive types (`string`, `number`, etc.) are already registered for you. As are `Array`, `Map`, `Set` and their readonly equivalents.

### `createValidator<T>(): (value: unknown) => value is T`
Creates a validator function for the type `T`.

`T` can be any valid supported Typescript type. This includes any named type, anonymous type, or anonymous type that has references to named types.

At compile time, the call to `createValidator` will be replaced with the generated code.

# Support Tables

*See [the exec tests](tests/exec) to get a good idea of what is supported*

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
| circular references          | Yes     |                                    |
| parenthesis type expressions | Yes     |                                    |
| intersection types           | Yes     | 1 caveat (see caveats section)     |
| Mapped Types                 | WIP     |                                    |
| Multi-file types             | iffy    | Requires CLI tool instead of macro |
| classes                      | No      |                                    |

# Performance Table

The numbers are nanoseconds.

In the interest of fairness, typecheck.macro (currently) does not generate error messages (this is a WIP feature). It returns a boolean value indicating whether the given object matches the type. Thus, typecheck.macro does less work than the other libraries. However, typecheck.macro should still be faster, even if it generates error messages, because it generates efficient Javascript code while the other libraries (except ajv, which is also extremely fast) do not perform code generation.

Furthermore, typecheck.macro has not had any real performance/code generation optimizations yet, so the generated code will become even faster over time.

| Library         | Simple | Complex | Notes                                                                              |
|-----------------|--------|---------|------------------------------------------------------------------------------------|
| typecheck.macro | 46     | 105     |                                                                                    |
| ajv             | 108    | 331     |                                                                                    |
| io-ts           | 235    |         |                                                                                    |
| runtypes        | 357    |         |                                                                                    |
| zod             | 11471  |         | zod throws an exception upon validation error, which resulted in this extreme case |

Generate data with `pnpm run bench:prep -- [simple|complex|complex2]` and run a benchmark with `pnpm run bench -- [macro|ajv|io-ts|runtypes|zod] --test=[simple|complex|complex2]`

# Caveats
- typecheck.macro currently allows extra keys to pass validation. This is consistent with the behavior of type aliases in Typescript, but different from the behavior of interfaces. Disallowing extra keys is a WIP feature.
- typecheck.macro does not handle multi-file types. E.g if `Foo` imports `Bar` from another file, typecheck cannot generate a validator for it. registerType is *file scoped*.
    - If this is a significant problem, file a Github issue so I increase the priority of creating a CLI tool that can handle multi-file types.

# Contributing
Read the [contributor docs](CONTRIBUTING.md). Contributions are welcome and encouraged!