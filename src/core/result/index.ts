import type { Failure } from "./failure";
import type { Success } from "./success";

export type { Failure } from "./failure";
export { failure } from "./failure";
export type { Success } from "./success";
export { success } from "./success";

export type Result<T, E> = Success<T> | Failure<E>;

export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success;
}

export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success;
}
