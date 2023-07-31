import Denomander from "denomander/mod.ts";
import { Packages } from "./src/Packages.ts";
import { c } from "./src/c.ts";
import { printlnStderr } from "./src/utils.ts";

const program = new Denomander({
  app_version: "1.0.0",
  app_name: "dnpm",
  app_description: "dnpm is a tiny package manager for deno.",
});

program
  .command("add [packages...]", "Add dependency")
  .option("--noLock [bool]", "avoid generating lock file", (x: any) => {
    return x == "true";
  })
  .action(async ({ packages }: { packages: string[] }) => {
    let prevDenoJson;
    try {
      prevDenoJson = JSON.parse(
        new TextDecoder().decode(await Deno.readFile("deno.json"))
      );
    } catch (_) {
      prevDenoJson = {};
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
            c`error: Package type \`${_result.value.value}\` is not supported.`
          );
        } else if (_result.value.type == "version_not_found") {
          await printlnStderr(
            c`error: Could not find version \`${_result.value.value}\`.`
          );
        } else if (_result.value.type == "query_parse_failed") {
          await printlnStderr(c`error: Failed to parse query \`${pkg}\`.`);
        }

        Deno.exit(1);
      }

      const result = _result.value;
      const info = Packages.createPackageInfo(result);
      importMap[info.alias] = info.url;
      cacheUrls.push(info.cacheUrl);
      packageInfos.push({ query: pkg, info });
    }

    if (!program.noLock) {
      const command = new Deno.Command("deno", {
        args: ["cache", ...cacheUrls],
      });
      const proc = await command.spawn();
      const status = await proc.status;

      if (!status.success) {
        await printlnStderr(c`error: Execution of \`deno cache\` failed.`);
        Deno.exit(status.code);
      }
    }

    await Deno.writeFile(
      "deno.json",
      new TextEncoder().encode(
        JSON.stringify(
          {
            ...prevDenoJson,
            imports: {
              ...(prevDenoJson.imports ?? {}),
              ...importMap,
            },
          },
          null,
          "  "
        )
      )
    );

    await printlnStderr(
      c`success: Added ${packageInfos.length} packages to dependencies.\n\n` +
        packageInfos
          .map(({ query, info }) => c`  - \`${query}\` -> \`${info.alias}\``)
          .join("\n")
    );
  });

program.command(
  "remove [names...]",
  "Remove dependencies",
  async ({ names }: { names: string[] }) => {
    let prevDenoJson;
    try {
      prevDenoJson = JSON.parse(
        new TextDecoder().decode(await Deno.readFile("deno.json"))
      );
    } catch (_) {
      prevDenoJson = {};
    }

    const newDenoJson = {
      ...prevDenoJson,
      imports: {
        ...(prevDenoJson.imports ?? {}),
      },
    };

    for (const name of names) {
      let isDeleted = false;
      for (const k in newDenoJson.imports) {
        if (k == name || (k.slice(0, -1) == name && k.at(-1) == "/")) {
          delete newDenoJson.imports[k];
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
      new TextEncoder().encode(JSON.stringify(newDenoJson, null, "  "))
    );

    await printlnStderr(
      c`success: Removed ${names.length} packages to dependencies.\n\n` +
        names.map((name) => c`  - \`${name}\``).join("\n")
    );
  }
);

program.command("task", c`call \`deno task\``);
program.command("test", c`call \`deno test\``);

if (import.meta.main) {
  if (["task", "test"].includes(Deno.args[0])) {
    const command = new Deno.Command("deno", {
      args: [...Deno.args],
    });
    const proc = await command.spawn();
    await proc.status;
  } else {
    program.parse(Deno.args);
  }
}
