import * as fs from 'fs/promises';

let defaultRoles = null;

export async function parseRole(role) {
  if (!defaultRoles) {
    const file = await fs.readFile("./presets/roles.json");
    defaultRoles = JSON.parse(file);
  }

  const defaultRolesKey = Object.keys(defaultRoles);
  if (defaultRolesKey.includes(role)) {
    return defaultRoles[role];
  }
  return role;
}
