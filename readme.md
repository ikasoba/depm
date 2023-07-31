<h1>
  <p align="center">
    dnpm 📦
  </p>
</h1>

<p align="center">
  tiny package manager for deno
</p>

# Installation
```sh
deno install -n dnpm ./cli.ts --import-map ./deno.json -A -f
```

# Usage
# Install from deno.land

```sh
dnpm add hono
dnpm add std/fs
dnpm add std/fmt/colors.ts

# or

dnpm add deno:hono
dnpm add deno:std/fs
dnpm add deno:std/fmt/colors.ts
```

# Install from npm

```sh
dnpm add npm:express
dnpm add npm:@ikasoba000/daizu
```

# Install from nest.land

```sh
# Version notation is required
dnpm add nest:opine@2.3.4
dnpm add nest:std@0.127.0/fs
```

# Install from url

```sh
dnpm add url:react=https://esm.sh/react
```

# Uninstall Package
```sh
dnpm remove hono
dnpm remove fs
dnpm remove fmt/colors.ts
```