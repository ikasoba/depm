<h1>
  <p align="center">
    depm 📦
  </p>
</h1>

<p align="center">
  tiny package manager for deno
</p>

# Installation
```sh
deno install -n depm https://deno.land/x/depm/cli.ts --import-map https://deno.land/x/depm/deno.json -A -f
```

# Usage
# Install from deno.land

```sh
depm add hono
depm add std/fs
depm add std/fmt/colors.ts

# or

depm add deno:hono
depm add deno:std/fs
depm add deno:std/fmt/colors.ts
```

# Install from npm

```sh
depm add npm:express
depm add npm:@ikasoba000/daizu
```

# Install from esm.sh

```sh
# Version notation is required
depm add esm:express
depm add esm:chai
```

# Install from nest.land

```sh
# Version notation is required
depm add nest:opine@2.3.4
depm add nest:std@0.127.0/fs
```

# Install from url

```sh
depm add url:react=https://esm.sh/react
```

# Uninstall Package
```sh
depm remove hono
depm remove fs
depm remove fmt/colors.ts
```