export type Failure<E> = {
  success: false;
  error: E;
};

export function failure<E>(error: E): Failure<E> {
  return { success: false, error };
}
