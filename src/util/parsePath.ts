// Parses path, expanding environment variables
const parsePath = (path: string): string => path.replace(
  /\$([A-Z_]+[A-Z0-9_]*)|\${([A-Z0-9_]*)}/ig,
  (_original, matched) => process.env[matched] ?? ""
);

export default parsePath;
