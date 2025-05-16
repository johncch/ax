export function replaceVariables(
  input: string,
  variables: Record<string, any>,
  placeholderStyle: "{}" | "{{}}" = "{{}}",
): string {
  const pattern = placeholderStyle === "{{}}" ? /\{\{(.*?)\}\}/g : /\{(.*?)\}/g;
  input = input.replace(pattern, (match, group) => {
    if (variables[group]) {
      return variables[group];
    }
    return match;
  });
  return input;
}
