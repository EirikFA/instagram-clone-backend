import { sign, SignCallback } from "jsonwebtoken";

type Params = Parameters<typeof sign>;
// Hacky, but a generic with inference does not work (possible limitation in TypeScript due to
// overloads)
type NoCbParams = [Params[0], Params[1], Params[2]];

const signAsync = (...params: NoCbParams):
Promise<Parameters<SignCallback>[1]> => new Promise((resolve, reject) => {
  const cb: SignCallback = (error, decoded) => {
    if (error) return reject(error);
    return resolve(decoded);
  };

  const newParams: Params = [...params, cb];

  sign(...newParams);
});

export default signAsync;
