import { Result } from "./Result.ts";
import { Merge, normalizePath, u } from "./utils.ts";

export type PackageFetchError =
  | {
      type: "query_parse_failed";
    }
  | {
      type: "package_not_found";
    }
  | {
      type: "version_not_found";
      value: string;
    }
  | {
      type: "package_type_not_supported";
      value: string;
    };

export type InstallPackageFromQueryError = {
  type: "execution_failure";
  command: string;
};

export type ParsedQuery =
  | {
      type: "url";
      alias: string;
      url: URL;
    }
  | {
      type: "npm";
      alias: string;
      name: string;
      version?: string;
      path: string;
    }
  | {
      type: "esm";
      alias: string;
      name: string;
      version?: string;
      path: string;
    }
  | {
      type: "nest";
      alias: string;
      name: string;
      version: string;
      path: string;
    }
  | {
      type: "deno";
      alias: string;
      name: string;
      version?: string;
      path: string;
    }
  | {
      type: "gh";
      alias: string;
      owner: string;
      name: string;
      tag?: string;
      path: string;
    }
  | {
      type: "other";
      scheme: string;
      alias: string;
      name: string;
      version?: string;
      path: string;
    };

export type ResolvedPackage = {
  type: ParsedQuery["type"];
  name: string;
  url: URL | string;
};

export class Packages {
  static parse(query: string): ParsedQuery | null {
    let m;

    m = query.match(/^url:([^\s=:]+)=(.+)$/);
    if (m && URL.canParse(m[2])) {
      return {
        type: "url",
        alias: m[1].replace(/(?<!\/)$/, "/"),
        url: new URL(m[2]),
      };
    }

    m = query.match(
      /^(npm|esm):([^/\s@:]+|@[^/\s@:]+\/[^/\s@:]+)(?:@([^/\s:]+))?((?:\/[^/\s:]+)*)$/
    );
    if (m) {
      return {
        type: m[1] as "npm" | "esm",
        alias: m[2].replace(/(?<!\/)$/, "/"),
        name: m[2],
        version: m[3],
        path: normalizePath(m[4]),
      };
    }

    m = query.match(
      /^gh:([^/\s@:]+)\/([^/\s@:]+)(?:@([^/\s:]+))?((?:\/[^/\s:]+)*)$/
    );
    if (m) {
      return {
        type: "gh",
        alias: m[2].replace(/(?<!\/)$/, "/"),
        owner: m[1],
        name: m[2],
        tag: m[3],
        path: normalizePath(m[4]),
      };
    }

    m = query.match(
      /^(?:([^/\s:]+):)?([^/\s@:]+)(?:@([^/\s:]+))?((?:\/[^/\s:]+)*)$/
    );
    if (m == null || m[1] == "url" || m[1] == "npm") return null;
    if (m[1] == "nest" && m[2] == null) return null;

    let res: ParsedQuery;
    if (m[1] == "nest") {
      if (m[3] == "" || m[3] == null) return null;

      res = {
        type: "nest",
        alias: m[4].replace(/^\//, "").split("/").at(-1) || m[2],
        name: m[2],
        version: m[3],
        path: m[4],
      };
    } else if (m[1] == "deno" || m[1] == null) {
      res = {
        type: m[1] ?? "deno",
        alias: m[4].replace(/^\//, "").split("/").at(-1) || m[2],
        name: m[2],
        version: m[3] || undefined,
        path: m[4],
      };
    } else {
      res = {
        type: "other",
        scheme: m[1],
        alias: m[4].replace(/^\//, "").split("/").at(-1) || m[2],
        name: m[2],
        version: m[3] || undefined,
        path: m[4],
      };
    }

    if (/\.(tsx?|jsx?)$/.test(res.path)) {
      res.alias = res.path.replace(/\/+$/, "").split("/").slice(-2).join("/");
    } else {
      res.alias = res.alias.replace(/(?<!\/)$/, "/");
    }

    res.path = normalizePath(res.path);

    return res;
  }

  static async resolve(
    query: string
  ): Promise<Result<ResolvedPackage, PackageFetchError>> {
    const parsedQuery = this.parse(query);
    if (parsedQuery == null) return Result.err({ type: "query_parse_failed" });

    switch (parsedQuery.type) {
      case "deno": {
        const res = await fetch(
          u`https://apiland.deno.dev/v2/modules/${parsedQuery.name}`
        );

        if (!res.ok) {
          return Result.err({ type: "package_not_found" });
        }

        const module = await res.json();

        if (
          parsedQuery.version &&
          !module.versions.includes(parsedQuery.version)
        ) {
          return Result.err({
            type: "version_not_found",
            value: parsedQuery.version,
          });
        }

        const version = parsedQuery.version || module.latest_version;

        if (parsedQuery.name == "std") {
          return Result.ok({
            type: parsedQuery.type,
            name: parsedQuery.alias,
            url: new URL(
              `https://deno.land/${parsedQuery.name}${
                version ? "@" + version : ""
              }${parsedQuery.path}`
            ),
          });
        } else {
          return Result.ok({
            type: parsedQuery.type,
            name: parsedQuery.alias,
            url: new URL(
              `https://deno.land/x/${parsedQuery.name}${
                version ? "@" + version : ""
              }${parsedQuery.path}`
            ),
          });
        }
      }

      case "url": {
        if (parsedQuery.url == null)
          return Result.err({ type: "query_parse_failed" });

        return Result.ok({
          type: parsedQuery.type,
          name: parsedQuery.alias,
          url: new URL(parsedQuery.url),
        });
      }

      case "npm": {
        return Result.ok({
          type: parsedQuery.type,
          name: parsedQuery.alias,
          url: `npm:/${parsedQuery.name}${
            parsedQuery.version ? "@" + parsedQuery.version : ""
          }${parsedQuery.path}`,
        });
      }

      case "esm": {
        let url = `https://esm.sh/${parsedQuery.name}${
          parsedQuery.version ? "@" + parsedQuery.version : ""
        }${parsedQuery.path}`;
        const res = await fetch(url, { redirect: "manual" });
        if (res.status == 302) url = res.headers.get("Location")!;

        return Result.ok({
          type: parsedQuery.type,
          name: parsedQuery.alias,
          url: url,
        });
      }

      case "nest": {
        return Result.ok({
          type: parsedQuery.type,
          name: parsedQuery.alias,
          url: new URL(
            `https://x.nest.land/${parsedQuery.name}@${parsedQuery.version}${parsedQuery.path}`
          ),
        });
      }

      case "gh": {
        const res = await fetch(
          `https://api.github.com/repos/${parsedQuery.owner}/${parsedQuery.name}/tags`
        );
        const tags: { name: string }[] = await res.json();

        if (parsedQuery.tag && tags.every((x) => x.name != parsedQuery.tag)) {
          return Result.err({
            type: "version_not_found",
            value: parsedQuery.tag,
          });
        }

        const tag = parsedQuery.tag ?? tags[0].name;

        return Result.ok({
          type: parsedQuery.type,
          name: parsedQuery.alias,
          url: new URL(
            `https://raw.githubusercontent.com/${parsedQuery.owner}/${parsedQuery.name}/${tag}${parsedQuery.path}`
          ),
        });
      }

      default: {
        return Result.err({
          type: "package_type_not_supported",
          value: parsedQuery.type,
        });
      }
    }
  }

  static createPackageInfo(query: ResolvedPackage): (ResolvedPackage & {
    alias: string;
    url: string;
    cacheUrl: string;
  })[] {
    const alias = query.name;
    const url = normalizePath(
      query.url instanceof URL ? query.url.toString() : query.url
    );
    const cacheUrl =
      ["deno", "nest", "gh"].includes(query.type) && url.endsWith("/")
        ? new URL("./mod.ts", url).toString()
        : url;

    if (query.type == "esm" || query.type == "npm") {
      return [
        {
          ...query,
          alias,
          url,
          cacheUrl,
        },
        {
          ...query,
          alias: alias.replace(/\/$/, ""),
          url,
          cacheUrl,
        },
      ];
    }

    return [
      {
        ...query,
        alias,
        url,
        cacheUrl,
      },
    ];
  }
}
