export const DATE_STRUCTURE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
export const TIME_STRUCTURE_PATTERN = /^(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/iu;
export const DATE_TIME_SPLIT_PATTERN = /^(\d{4}-\d{2}-\d{2})[Tt](.+)$/u;
export const DURATION_STRUCTURE_PATTERN =
  /^P(?:(?:\d+D|\d+M(?:\d+D)?|\d+Y(?:\d+M(?:\d+D)?)?)(?:T(?:\d+H(?:\d+M(?:\d+S)?)?|\d+M(?:\d+S)?|\d+S))?|T(?:\d+H(?:\d+M(?:\d+S)?)?|\d+M(?:\d+S)?|\d+S)|\d+W)$/u;
