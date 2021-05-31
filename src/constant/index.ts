export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

export const HASH_ROUNDS: number = 12;

export enum SendgridUnsubscribeGroup {
  Account = 15462
}

export enum SendgridTemplate {
  Button = "d-a890b21b7045446c82629a8a18d95680"
}

export const EMAIL_DATA = {
  FROM: "noreply@arweb.no"
};
