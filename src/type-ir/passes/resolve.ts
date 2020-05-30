import { MacroError } from "babel-plugin-macros";
import deepCopy from "fast-copy";
import { Errors, throwUnexpectedError } from "../../macro-assertions";
import { IR, Type } from "../IR";
import {
  isBuiltinType,
  isInterface,
  isObjectPattern,
  isType,
  isTypeAlias,
} from "../IRUtils";
import { applyTypeParameters, traverse } from "./utils";

export interface ResolveState {
  readonly namedTypes: ReadonlyMap<string, IR>;
  readonly visitedTypes: Set<string>;
}

export default function resolveAllTypes(namedTypes: Map<string, IR>) {
  const cloned = deepCopy(namedTypes);
  for (const [typeName, ir] of namedTypes) {
    namedTypes.set(typeName, resolveSingleType(ir, cloned, typeName));
  }
}

export function resolveSingleType(
  ir: IR,
  namedTypes: ReadonlyMap<string, IR>,
  typeName: string
): IR {
  return resolveType(ir, {
    namedTypes,
    visitedTypes: new Set([typeName]),
  });
}

function resolveType(ir: IR, state: ResolveState): IR {
  const { namedTypes, visitedTypes } = state;
  return traverse<Type>(ir, isType, (typeRef: Readonly<Type>) => {
    const { typeName, typeParameters = [] } = typeRef;
    if (visitedTypes.has(typeName)) return typeRef;

    const referencedIR = namedTypes.get(typeName);
    // TODO: Handle Array, Map, Record
    if (referencedIR === undefined) {
      throw new MacroError(Errors.UnregisteredType(typeName));
    }

    if (isTypeAlias(referencedIR)) {
      const instantiatedIR = applyTypeParameters(
        referencedIR,
        typeName,
        typeParameters
      );
      // POTENTIAL CHANGE: type aliases that refer to object patterns are essentially
      // interfaces, so why not treat them as such?
      if (isObjectPattern(referencedIR.value)) {
        return typeRef;
      }
      const newVisited = deepCopy(visitedTypes);
      newVisited.add(typeName);
      return resolveType(instantiatedIR, {
        ...state,
        visitedTypes: newVisited,
      });
    } else if (isInterface(referencedIR) || isBuiltinType(referencedIR)) {
      return typeRef;
    } else {
      throwUnexpectedError(
        `type reference referenced a ${referencedIR.type} instead of an interface or alias`
      );
    }
  });
}
