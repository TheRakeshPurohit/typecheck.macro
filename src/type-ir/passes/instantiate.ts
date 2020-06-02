// We can collect type stats before merging unions / solving intersections
// because types with identical names in unions will be merged in the flatten stage
import { MacroError } from "babel-plugin-macros";
import { Errors, throwUnexpectedError } from "../../macro-assertions";
import { IR, Type, InstantiatedType } from "../IR";
import { traverse, getTypeKey, applyTypeParameters } from "./utils";
import { isType, assertAcceptsTypeParameters } from "../IRUtils";
import deepCopy from "fast-copy";

type TypeStats = Map<string, number>;

export interface TypeInfo {
  readonly typeStats: TypeStats;
  value: IR;
  circular: boolean;
}

export interface InstantiationStatePartial {
  readonly typeStats: TypeStats;
  readonly instantiatedTypes: Map<string, TypeInfo>;
  readonly namedTypes: ReadonlyMap<string, IR>;
  readonly newInstantiatedTypes: string[];
}

type InstantiationState = InstantiationStatePartial & {
  circularTypes: string[];
};

function addStats(base: TypeStats, toAdd: TypeStats): void {
  for (const [k, v] of toAdd) {
    if (base.has(k)) {
      base.set(k, (toAdd.get(k) as number) + v);
    } else {
      base.set(k, v);
    }
  }
}

function incrementTypeCount(typeInfo: TypeStats, typeName: string): void {
  if (!typeInfo.has(typeName)) {
    typeInfo.set(typeName, 1);
  } else {
    typeInfo.set(typeName, (typeInfo.get(typeName) as number) + 1);
  }
}

export default function (ir: IR, state: InstantiationStatePartial): IR {
  const circularTypes: string[] = [];
  const patchedIr = patchIR(ir, { ...state, circularTypes }, new Set());
  for (const type of circularTypes) {
    const typeInfo = state.instantiatedTypes.get(type);
    if (typeInfo === undefined) {
      throwUnexpectedError(`Type: ${type} was not found in instantiatedTypes`);
    }
    typeInfo.circular = true;
  }
  return patchedIr;
}

function patchIR(
  ir: IR,
  state: InstantiationState,
  callerTypeNames: Set<string>
): IR {
  const {
    namedTypes,
    typeStats,
    instantiatedTypes,
    newInstantiatedTypes,
  } = state;
  return traverse<Type>(ir, isType, (typeRef: Readonly<Type>) => {
    const { typeName, typeParameters: providedTypeParameters = [] } = typeRef;
    const key = getTypeKey(typeRef);

    const partiallyResolvedTypeReference: InstantiatedType = {
      type: "instantiatedType",
      typeName: key,
    };

    incrementTypeCount(typeStats, key);
    if (callerTypeNames.has(key)) {
      state.circularTypes.push(key);
      return partiallyResolvedTypeReference;
    }

    let partiallyResolved = instantiatedTypes.get(key);
    if (partiallyResolved !== undefined) {
      addStats(typeStats, partiallyResolved.typeStats);
      return partiallyResolvedTypeReference;
    }

    const referencedIR = namedTypes.get(typeName);
    if (referencedIR === undefined) {
      throw new MacroError(Errors.UnregisteredType(typeName));
    }

    assertAcceptsTypeParameters(referencedIR, typeName);
    const typeParametersApplied = applyTypeParameters(
      referencedIR,
      typeName,
      providedTypeParameters
    );
    const newState = { ...state, typeStats: new Map() };
    const newCallerTypeNames = deepCopy(callerTypeNames);
    const instantiated = patchIR(
      typeParametersApplied,
      newState,
      newCallerTypeNames.add(key)
    );
    instantiatedTypes.set(key, {
      typeStats: newState.typeStats,
      value: instantiated,
      circular: false,
    });
    newInstantiatedTypes.push(key);
    addStats(typeStats, newState.typeStats);
    return partiallyResolvedTypeReference;
  });
}
