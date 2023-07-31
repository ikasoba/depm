<h1>
  <p align="center">
    dpak 📦
  </p>
</h1>

<p align="center">
  tiny package manager for deno
</p>

# Installation
```sh
deno install -n dpak ./cli.ts --import-map ./deno.json -A -f
```

# Usage
# Install from deno.land

```sh
dpak add hono
dpak add std/fs
dpak add std/fmt/colors.ts

# or

dpak add deno:hono
dpak add deno:std/fs
dpak add deno:std/fmt/colors.ts
```

# Install from npm

```sh
dpak add npm:express
dpak add npm:@ikasoba000/daizu
```

# Install from nest.land

```sh
# Version notation is required
dpak add nest:opine@2.3.4
dpak add nest:std@0.127.0/fs
```

# Install from url

```sh
dpak add url:react=https://esm.sh/react
```

# Uninstall Package
```sh
dpak remove hono
dpak remove fs
dpak remove fmt/colors.ts
```