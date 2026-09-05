export type Success<T> = {
  success: true;
  data: T;
};

export function success<T>(data: T): Success<T> {
  return { success: true, data };
}
