export const u = <T>(t: TemplateStringsArray, ...values: T[]) => {
  return t.reduce((prev, x, i) => {
    if (i < values.length) {
      return prev + x + encodeURIComponent(`${values[i]}`);
    } else {
      return prev + x;
    }
  }, "");
};

export const c = <T>(t: TemplateStringsArray, ...values: T[]) => {
  const message = t.reduce((p, c, i) => {
    if (i < values.length) {
      return p + c + values[i];
    } else {
      return p + c;
    }
  }, "");

  return message
    .replace(/^(error|success|warn):/g, (_, level) => {
      let color = 90;
      if (level == "error") {
        color = 91;
      } else if (level == "success") {
        color = 92;
      } else if (level == "warn") {
        color = 93;
      }

      return `\x1b[${color}m${level}\x1b[0m:`;
    })
    .replace(/`(?:[^`]|\\`)*`/g, (x) => `\x1b[3m\x1b[1m${x}\x1b[0m`);
};

export const printlnStderr = async (message: string) => {
  await Deno.stderr.write(new TextEncoder().encode(message + "\n"));
};

export const normalizePath = (path: string) => {
  return path
    .replace(/\/+$/, "/")
    .replace(/(?<=\.tsx?|\.jsx?)\/+$/, "")
    .replace(/(?<!\.tsx?|\.jsx?|\/)$/, "/");
};

export type Merge<X, Y> = _Merge<X & Y>;
type _Merge<X> = {
  [K in keyof X]: X[K];
};
