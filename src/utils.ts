export const u = <T>(t: TemplateStringsArray, ...values: T[]) => {
  return t.reduce((prev, x, i) => {
    if (i < values.length) {
      return prev + x + encodeURIComponent(`${values[i]}`);
    } else {
      return prev + x;
    }
  }, "");
};

export const printlnStderr = async (message: string) => {
  await Deno.stderr.write(new TextEncoder().encode(message + "\n"));
};

export const normalizePath = (path: string) => {
  return path
    .replace(/(?<!\.tsx?|\.jsx?)$/, "/")
    .replace(/(?<=\.tsx?|\.jsx?)\/+$/, "");
};
