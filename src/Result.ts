export type Result<T, E> = ResultImpl<T, never> | ResultImpl<never, E>;
export const Result = class {
  static ok(value: void): Result<void, never>;
  static ok<T>(value: T): Result<T, never>;
  static ok<T>(value: T): Result<T, never> {
    return new ResultImpl(true, value as {}) as Result<T, never>;
  }

  static err(value: void): Result<never, void>;
  static err<E>(value: E): Result<never, E>;
  static err<E>(value: E): Result<never, E> {
    return new ResultImpl(false, value as {}) as Result<never, E>;
  }
};

class ResultImpl<T, E> {
  constructor(ok: [T] extends [never] ? never : true, value: T);
  constructor(ok: [E] extends [never] ? never : false, value: E);
  constructor(private readonly ok: boolean, public readonly value: T | E) {}

  isOk(): this is Result<T, never> {
    return this.ok;
  }

  isErr(): this is Result<never, E> {
    return !this.ok;
  }

  expect(message?: string): T {
    if (this.isOk()) {
      return this.value;
    } else {
      throw new Error(message ?? `${this.value}`);
    }
  }
}
