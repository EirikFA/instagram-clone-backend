import { verify, VerifyCallback } from "jsonwebtoken";

type Params = Parameters<typeof verify>;
// Hacky, but a generic with inference does not work (possible limitation in TypeScript due to
// overloads)
type NoCbParams = [Params[0], Params[1], Params[2]];

const verifyAsync = (...params: NoCbParams):
Promise<Parameters<VerifyCallback>[1]> => new Promise((resolve, reject) => {
  const cb: VerifyCallback = (error, decoded) => {
    if (error) return reject(error);
    return resolve(decoded);
  };

  const newParams: Params = [...params, cb];

  verify(...newParams);
});

export default verifyAsync;
