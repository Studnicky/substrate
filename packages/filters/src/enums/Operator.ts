/**
 * Comparison operators with direct function access for declarative configuration
 */


import { Frozen } from '#runtime';

import { BinaryOperators } from '../operators/BinaryOperators.js';
import { ObjectOperators } from '../operators/ObjectOperators.js';
import { ArrayOperators } from './operators/ArrayOperators.js';
import { BooleanOperators } from './operators/BooleanOperators.js';
import { CrossOperators } from './operators/CrossOperators.js';
import { DateOperators } from './operators/DateOperators.js';
import { MapOperators } from './operators/MapOperators.js';
import { NumberOperators } from './operators/NumberOperators.js';
import { SetOperators } from './operators/SetOperators.js';
import { StringOperators } from './operators/StringOperators.js';

export const Operator = Frozen.deepFreeze({
  'ARRAY': {
    'EMPTY': ArrayOperators.arrayEmpty,
    'EQUALS': ArrayOperators.arrayEquals,
    'EXCLUDES': ArrayOperators.arrayExcludes,
    'IDENTICAL': ArrayOperators.arrayIdentical,
    'INCLUDES': ArrayOperators.arrayIncludes,
    'LENGTH': ArrayOperators.arrayLength,
    'NOT_EMPTY': ArrayOperators.arrayNotEmpty,
    'NOT_EQUALS': ArrayOperators.arrayNotEquals,
    'NOT_IDENTICAL': ArrayOperators.arrayNotIdentical,
    'SIMILARITY': ArrayOperators.arraySimilarity
  },
  'BINARY': {
    'CONTAINS': BinaryOperators.handleContains,
    'EMPTY': BinaryOperators.handleEmpty,
    'ENDS_WITH': BinaryOperators.handleEndsWith,
    'EQUALS': BinaryOperators.handleEquals,
    'LENGTH': BinaryOperators.handleLength,
    'NOT_EMPTY': BinaryOperators.handleNotEmpty,
    'NOT_EQUALS': BinaryOperators.handleNotEquals,
    'STARTS_WITH': BinaryOperators.handleStartsWith
  },
  'BOOLEAN': {
    'EQUALS': BooleanOperators.booleanEquals,
    'FALSE': BooleanOperators.booleanFalse,
    'FALSY': BooleanOperators.booleanFalsy,
    'NOT_EQUALS': BooleanOperators.booleanNotEquals,
    'SIMILARITY': BooleanOperators.booleanSimilarity,
    'TRUE': BooleanOperators.booleanTrue,
    'TRUTHY': BooleanOperators.booleanTruthy
  },
  'CROSS': {
    'ABSENT': CrossOperators.valueAbsent,
    'DEFINED': CrossOperators.valueDefined,
    'EQUALS': CrossOperators.crossEquals,
    'EXISTS': CrossOperators.valueExists,
    'NOT_EQUALS': CrossOperators.crossNotEquals,
    'NOT_NULL': CrossOperators.valueNotNull,
    'NULL': CrossOperators.valueNull,
    'SIMILARITY': CrossOperators.valueSimilarity,
    'TYPE': CrossOperators.valueType,
    'UNDEFINED': CrossOperators.valueUndefined
  },
  'DATE': {
    'BETWEEN': DateOperators.dateBetween,
    'EQUALS': DateOperators.dateEquals,
    'NOT_EQUALS': DateOperators.dateNotEquals,
    'OUTSIDE': DateOperators.dateOutside
  },
  'MAP': {
    'EMPTY': MapOperators.mapEmpty,
    'EQUALS': MapOperators.mapEquals,
    'HAS': MapOperators.mapHas,
    'IDENTICAL': MapOperators.mapIdentical,
    'MISSING': MapOperators.mapMissing,
    'NOT_EMPTY': MapOperators.mapNotEmpty,
    'NOT_EQUALS': MapOperators.mapNotEquals,
    'NOT_IDENTICAL': MapOperators.mapNotIdentical,
    'SIZE': MapOperators.mapSize
  },
  'NUMBER': {
    'BETWEEN': NumberOperators.numberBetween,
    'EQUALS': NumberOperators.numberEquals,
    'GREATER': NumberOperators.numberGreater,
    'GREATER_EQUAL': NumberOperators.numberGreaterEqual,
    'LESS': NumberOperators.numberLess,
    'LESS_EQUAL': NumberOperators.numberLessEqual,
    'MODULO': NumberOperators.numberModulo,
    'NOT_EQUALS': NumberOperators.numberNotEquals,
    'OUTSIDE': NumberOperators.numberOutside,
    'SIMILARITY': NumberOperators.numberSimilarity
  },
  'OBJECT': {
    'DEEP_INCLUDES': ObjectOperators.handleDeepIncludes,
    'EMPTY': ObjectOperators.handleEmpty,
    'EQUALS': ObjectOperators.handleEquals,
    'HAS_PROPERTY': ObjectOperators.handleHasProperty,
    'IDENTICAL': ObjectOperators.handleEquals,
    'MISSING_PROPERTY': ObjectOperators.handleMissingProperty,
    'NOT_EMPTY': ObjectOperators.handleNotEmpty,
    'NOT_EQUALS': ObjectOperators.handleNotEquals,
    'NOT_IDENTICAL': ObjectOperators.handleNotIdentical,
    'PROPERTY_COUNT': ObjectOperators.handlePropertyCount,
    'SIMILARITY': ObjectOperators.handleSimilarity
  },
  'SET': {
    'EMPTY': SetOperators.setEmpty,
    'EQUALS': SetOperators.setEquals,
    'HAS': SetOperators.setHas,
    'IDENTICAL': SetOperators.setIdentical,
    'MISSING': SetOperators.setMissing,
    'NOT_EMPTY': SetOperators.setNotEmpty,
    'NOT_EQUALS': SetOperators.setNotEquals,
    'NOT_IDENTICAL': SetOperators.setNotIdentical,
    'SIZE': SetOperators.setSize
  },
  'STRING': {
    'CONTAINS': StringOperators.stringContains,
    'EMPTY': StringOperators.stringEmpty,
    'ENDS_WITH': StringOperators.stringEndsWith,
    'EQUALS': StringOperators.stringEquals,
    'EXCLUDES': StringOperators.stringExcludes,
    'LENGTH': StringOperators.stringLength,
    'NOT_EMPTY': StringOperators.stringNotEmpty,
    'NOT_EQUALS': StringOperators.stringNotEquals,
    'REGEX': StringOperators.stringRegex,
    'SIMILARITY': StringOperators.stringSimilarity,
    'STARTS_WITH': StringOperators.stringStartsWith,
    'WORD_COUNT': StringOperators.stringWordCount
  }
});
