import { colors } from "./depts.ts";

export function logCheck(msg: string) {
  console.log(colors.bold.italic.cyan(msg + "  ✅"));
}

export function screenshotAlert(msg: string) {
  console.log(colors.bold.italic.red(msg + " ✅"));
}

export function deleteScreenshots() {
  const deleteCommand = Deno.run({
    cmd: [
      "rm",
      "-rf",
      "screenshots/*",
    ],
  });

  deleteCommand.status();
  deleteCommand.close();
}

export interface Domain {
  domain: string;
  id: string;
}

export interface Settings {
  he_username: string;
  he_password: string;
  domains: Domain[];
}

export function getSettings(): Settings {
  return JSON.parse(Deno.readTextFileSync("./settings.json"));
}
