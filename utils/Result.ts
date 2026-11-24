export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };

export const ok = <T>(value: T): Ok<T> => ({
    ok: true,
    value,
});

export const err = <E>(error: E): Err<E> => ({
    ok: false,
    error,
});
