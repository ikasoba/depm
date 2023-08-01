import * as semver from "semver/mod.ts";

export class PackageUtil {
  static async getVersions(): Promise<string[]> {
    const tmp = await new Deno.Command("git", { args: ["tag"] }).output();

    const tags = new TextDecoder()
      .decode(tmp.stdout)
      .replace(/\s*$/, "")
      .split("\n")
      .filter((x) => semver.valid(x))
      .sort((x, y) => -semver.gt(x, y));

    return tags;
  }
}
