export function replaceVariables(
  input: string,
  variables: Record<string, any>,
  placeholderStyle: "{}" | "{{}}" = "{{}}",
): string {
  const pattern = placeholderStyle === "{{}}" ? /\{\{(.*?)\}\}/g : /\{(.*?)\}/g;
  input = input.replace(pattern, (match, group) => {
    group = group.trim();
    if (Object.prototype.hasOwnProperty.call(variables, group)) {
      const value = variables[group];
      return value === undefined || value === null ? "" : String(value);
    }
    return match;
  });
  return input;
}
