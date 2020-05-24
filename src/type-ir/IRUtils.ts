import { MacroError } from "babel-plugin-macros";
import {
  Union as U,
  Intersection as I,
  IR,
  Literal as L,
  PrimitiveTypeName,
  PrimitiveType as P,
  Type as T,
  TypeAlias as TA,
  GenericType as G,
  Interface as IF,
  ArrayType as AT,
  BuiltinType as BT,
  BuiltinTypeName,
  InstantiatedType as IT,
  Tuple as TT,
  FailedIntersection as FI,
} from "./IR";
import { primitiveTypes } from "./IR";
import { throwUnexpectedError, Errors } from "../macro-assertions";
import { hasAtLeast1Element } from "../utils/checks";

// These MUST be kept in sync with IR.ts
export const isType = (x: IR): x is T => x.type === "type";
export const isPrimitive = (x: IR): x is P => x.type === "primitiveType";
export const isInterface = (x: IR): x is IF => x.type === "interface";
export const isTypeAlias = (x: IR): x is TA => x.type === "alias";
export const isGenericType = (x: IR): x is G => x.type === "genericType";
export const isUnion = (x: IR): x is U => x.type === "union";
export const isIntersection = (x: IR): x is I => x.type === "intersection";
// Is this sound/enough?
export const isBuiltinType = (x: IR): x is BT<BuiltinTypeName> =>
  x.type === "builtinType";
export const isInstantiatedType = (x: IR): x is IT =>
  x.type === "instantiatedType";
export const isTuple = (x: IR): x is TT => x.type === "tuple";
export const isLiteral = (x: IR): x is L => x.type === "literal";
export const isFailedIntersection = (x: IR): x is FI =>
  x.type === "failedIntersection";

export const isIntersectionOrUnion = (x: IR): x is I | U =>
  isIntersection(x) || isUnion(x);
export const isArrayType = (x: IR): x is AT =>
  isType(x) && (x.typeName === "Array" || x.typeName === "ReadonlyArray");

export function assertArray(x: IR): asserts x is AT {
  if (!isArrayType(x))
    throwUnexpectedError(`expected array but recieved: ${x.type}`);
}

export function assertPrimitiveType(x: IR): asserts x is P {
  if (!isPrimitive(x)) {
    throwUnexpectedError(
      `expected ${JSON.stringify(x)} to be a primitive type`
    );
  }
}

export function assertPrimitiveTypeName(
  type: string
): asserts type is PrimitiveTypeName {
  if (!primitiveTypes.includes(type as PrimitiveTypeName)) {
    throwUnexpectedError(`${type} is not a primitive type`);
  }
}

export function assertLiteral(x: IR): asserts x is L {
  if (!isLiteral(x)) {
    throwUnexpectedError(`Expected ${JSON.stringify(x)} to be a literal type`);
  }
}

export function assertAcceptsTypeParameters(
  ir: IR,
  typeName: string
): asserts ir is IF | TA | BT<BuiltinTypeName> {
  if (!isInterface(ir) && !isTypeAlias(ir) && !isBuiltinType(ir)) {
    throw new MacroError(
      Errors.TypeDoesNotAcceptGenericParameters(typeName, ir.type)
    );
  }
}

export function assertBuiltinType<T extends BuiltinTypeName>(
  ir: IR,
  typeName: T
): asserts ir is BT<T> {
  if (isBuiltinType(ir)) {
    if (ir.typeName === typeName) return;
  }
  throwUnexpectedError(
    `Expected ${JSON.stringify(ir)} to be a builtin ${typeName}`
  );
}

export function Union(...childTypes: [IR, IR, ...IR[]]): U {
  const union: U = {
    type: "union",
    childTypes,
  };
  return union;
}

export function Tuple({
  childTypes,
  restType,
  firstOptionalIndex,
}: {
  restType?: IR;
  childTypes: IR[];
  firstOptionalIndex: number;
}): TT {
  const tuple: TT = {
    type: "tuple",
    childTypes,
    restType,
    firstOptionalIndex,
  };
  return tuple;
}

export function Intersection(...childTypes: [IR, IR, ...IR[]]): I {
  const intersection: I = {
    type: "intersection",
    childTypes,
  };
  return intersection;
}

export function Literal(value: string | number | boolean): L {
  const literal: L = {
    type: "literal",
    value,
  };
  return literal;
}

export function PrimitiveType(typeName: string): P {
  assertPrimitiveTypeName(typeName);
  const primitive: P = {
    type: "primitiveType",
    typeName,
  };
  return primitive;
}

export function GenericType(typeParameterIndex: number): G {
  const genericType: G = {
    type: "genericType",
    typeParameterIndex,
  };
  return genericType;
}

export function Type(typeName: string, ...typeParameters: IR[]): T {
  if (hasAtLeast1Element(typeParameters)) {
    const type: T = { type: "type", typeName, typeParameters };
    return type;
  }
  const type: T = { type: "type", typeName };
  return type;
}

export function BuiltinType<T extends BuiltinTypeName>(
  typeName: T,
  elementType1: IR,
  elementType2: T extends "Map" ? IR : undefined
): BT<T> {
  if (typeName === "Map") {
    const builtinType: BT<"Map"> = {
      type: "builtinType",
      typeName: "Map",
      elementTypes: [elementType1, elementType2 as IR],
      typeParametersLength: 2,
      typeParameterDefaults: [],
    };
    return builtinType as BT<T>;
  } else {
    const builtinType: BT<"Array" | "Set"> = {
      type: "builtinType",
      typeName: typeName as "Array" | "Set",
      elementTypes: [elementType1],
      typeParametersLength: 1,
      typeParameterDefaults: [],
    };
    return builtinType as BT<T>;
  }
}

export function FailedIntersection(): FI {
  return { type: "failedIntersection" };
}
