/* eslint-disable import/prefer-default-export */
export class AlreadyAuthenticatedError extends Error {
  constructor (...params: Parameters<ErrorConstructor>) {
    super(...params);

    Object.setPrototypeOf(this, AlreadyAuthenticatedError.prototype);
  }
}
