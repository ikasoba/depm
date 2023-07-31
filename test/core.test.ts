import { Packages, ParsedQuery } from "../src/Packages.ts";

const eq = (x: any, y: any) => {
  if (typeof x != typeof y) return false;

  switch (typeof x) {
    case "bigint":
    case "boolean":
    case "number":
    case "string":
    case "symbol":
    case "undefined":
      return x == y;

    case "function":
    case "object":
      if (x == null) return x == y;
      for (const k in x) {
        if (!eq(x[k], y[k])) return false;
      }
      return true;
  }
};

Deno.test("parse query", () => {
  const queries: [string, ParsedQuery][] = [
    [
      "hono",
      {
        type: "deno",
        alias: "hono/",
        name: "hono",
        path: "/",
      },
    ],
    [
      "std/fs",
      {
        type: "deno",
        alias: "fs/",
        name: "std",
        path: "/fs/",
      },
    ],
    [
      "std/fmt/colors.ts",
      {
        type: "deno",
        alias: "fmt/colors.ts",
        name: "std",
        path: "/fmt/colors.ts",
      },
    ],
    [
      "deno:hono",
      {
        type: "deno",
        alias: "hono/",
        name: "hono",
        path: "/",
      },
    ],
    [
      "deno:std/fs",
      {
        type: "deno",
        alias: "fs/",
        name: "std",
        path: "/fs/",
      },
    ],
    [
      "deno:std/fmt/colors.ts",
      {
        type: "deno",
        alias: "fmt/colors.ts",
        name: "std",
        path: "/fmt/colors.ts",
      },
    ],
    [
      "nest:hoge@v1.0.0",
      {
        type: "nest",
        alias: "hoge/",
        name: "hoge",
        path: "/",
        version: "v1.0.0",
      },
    ],
    [
      "npm:express",
      {
        type: "npm",
        alias: "express/",
        name: "express",
        path: "/",
      },
    ],
    [
      "npm:@ikasoba000/daizu",
      {
        type: "npm",
        alias: "@ikasoba000/daizu/",
        name: "@ikasoba000/daizu",
        path: "/",
      },
    ],
    [
      "url:react=https://esm.sh/react",
      {
        type: "url",
        alias: "react/",
        url: new URL("https://esm.sh/react"),
      },
    ],
  ];

  let isSafe = true;

  for (const query of queries) {
    const parsed = Packages.parse(query[0]);
    if (!eq(parsed, query[1])) {
      console.error(parsed, "is not", query[1]);
      isSafe = false;
    }
  }

  if (!isSafe) {
    throw new Error();
  }
});
