import { Command } from "command/mod.ts";
import { Packages } from "./src/Packages.ts";
import { c, command, exec, modifyJson, printlnStderr } from "./src/utils.ts";
import * as semver from "semver/mod.ts";
import { PackageUtil } from "./src/PackaageUtil.ts";
import depmJson from "./depm.json" assert { type: "json" };

const program = new Command()
  .name("depm")
  .description("depm is a tiny package manager for deno.")
  .version(depmJson.version)
  .action(async () => {
    await program.showHelp();
  });

program
  .command("add [packages...]", "Add dependency")
  .option("--noLock", "avoid generating lock file")
  .action(async ({ noLock }, ...packages) => {
    let prevdepmJson;
    try {
      prevdepmJson = JSON.parse(
        new TextDecoder().decode(await Deno.readFile("deno.json")),
      );
    } catch (_) {
      prevdepmJson = {};
    }

    const importMap: { [k: string]: string } = {};
    const cacheUrls = [];
    const packageInfos = [];

    for (const pkg of packages) {
      const _result = await Packages.resolve(pkg);
      if (_result.isErr()) {
        if (_result.value.type == "package_not_found") {
          await printlnStderr(c`error: Could not find package \`${pkg}\`.`);
        } else if (_result.value.type == "package_type_not_supported") {
          await printlnStderr(
            c`error: Package type \`${_result.value.value}\` is not supported.`,
          );
        } else if (_result.value.type == "version_not_found") {
          await printlnStderr(
            c`error: Could not find version \`${_result.value.value}\`.`,
          );
        } else if (_result.value.type == "query_parse_failed") {
          await printlnStderr(c`error: Failed to parse query \`${pkg}\`.`);
        }

        Deno.exit(1);
      }

      const infos = Packages.createPackageInfo(_result.value);
      packageInfos.push(...infos.map((info) => ({ query: pkg, info: info })));
    }

    for (const { info } of packageInfos) {
      importMap[info.alias] = info.url;

      cacheUrls.push(info.cacheUrl);
    }

    if (noLock) {
      await exec("deno", "cache", ...cacheUrls);
    }

    await Deno.writeFile(
      "deno.json",
      new TextEncoder().encode(
        JSON.stringify(
          {
            ...prevdepmJson,
            imports: {
              ...(prevdepmJson.imports ?? {}),
              ...importMap,
            },
          },
          null,
          "  ",
        ),
      ),
    );

    await printlnStderr(
      c`success: Added ${packageInfos.length} packages to dependencies.\n\n` +
        packageInfos
          .map(({ query, info }) => c`  - \`${query}\` -> \`${info.alias}\``)
          .join("\n"),
    );
  });

program
  .command("remove [names...]", "Remove dependencies")
  .action(async (_, ...names) => {
    let prevdepmJson;
    try {
      prevdepmJson = JSON.parse(
        new TextDecoder().decode(await Deno.readFile("deno.json")),
      );
    } catch (_) {
      prevdepmJson = {};
    }

    const newdepmJson = {
      ...prevdepmJson,
      imports: {
        ...(prevdepmJson.imports ?? {}),
      },
    };

    for (const name of names) {
      let isDeleted = false;
      for (const k in newdepmJson.imports) {
        if (k == name || (k.slice(0, -1) == name && k.at(-1) == "/")) {
          delete newdepmJson.imports[k];
          isDeleted = true;
        }
      }

      if (!isDeleted) {
        await printlnStderr(c`error: \`${name}\` is not a dependency.`);
        Deno.exit(1);
      }
    }

    await Deno.writeFile(
      "deno.json",
      new TextEncoder().encode(JSON.stringify(newdepmJson, null, "  ")),
    );

    await printlnStderr(
      c`success: Removed ${names.length} packages to dependencies.\n\n` +
        names.map((name) => c`  - \`${name}\``).join("\n"),
    );
  });

program.command("task", c`call \`deno task\``);
program.command("test", c`call \`deno test\``);

const incrementVersion = async (mode: "major" | "minor" | "patch") => {
  const defaultVersions = {
    major: "1.0.0",
    minor: "0.1.0",
    patch: "0.0.1",
  };

  const versions = await PackageUtil.getVersions();

  const newVersion = semver.inc(versions[0], mode) ?? defaultVersions[mode];

  await modifyJson("depm.json", { version: newVersion });

  await exec("git", "add", ".");
  await exec("git", "commit", "-m", newVersion);
  await exec("git", "tag", newVersion);

  await printlnStderr(c`success: Created Version \`${newVersion}\`.`);
};

program
  .command("version", "...")
  .example("show all versions", "depm version")
  .example("Increment major version", "depm version --major")
  .example("Increment minor version", "depm version --minor")
  .example("Increment patch version", "depm version --patch")
  .option("--major", "Increment major version.", {
    standalone: true,
    async action(_) {
      await incrementVersion("major");
    },
  })
  .option("--minor", "Increment minor version.", {
    standalone: true,
    async action(_) {
      await incrementVersion("minor");
    },
  })
  .option("--patch", "Increment patch version.", {
    standalone: true,
    async action(_) {
      await incrementVersion("patch");
    },
  })
  .action(async () => {
    const versions = await PackageUtil.getVersions();

    await printlnStderr(versions.join("\n"));
  });

program.command("upgrade", "update to new version").action(async () => {
  const res = await fetch("https://apiland.deno.dev/v2/modules/depm");
  if (!res.ok) {
    await printlnStderr(
      c`error: failed to fetch \`https://apiland.deno.dev/v2/modules/depm\`.`,
    );
    Deno.exit(1);
  }

  const module = await res.json();
  if (depmJson.version == module.latest_version) {
    await printlnStderr(c`success: Already updated to the latest version.`);
    return;
  }

  await exec(
    "deno",
    "install",
    "-n",
    "depm",
    "https://deno.land/x/depm/cli.ts",
    "--import-map",
    "https://deno.land/x/depm/deno.json",
    "-A",
    "-f",
    "--reload",
  );

  await printlnStderr(c`success: Finished updating to the latest version.`);
});

if (import.meta.main) {
  if (["task", "test"].includes(Deno.args[0])) {
    const command = new Deno.Command("deno", {
      args: [...Deno.args],
    });
    const proc = await command.spawn();
    await proc.status;
  } else {
    await program.parse(Deno.args);
  }
}
