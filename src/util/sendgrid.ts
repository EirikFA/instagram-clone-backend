import sendgrid from "@sendgrid/mail";

const { SENDGRID_API_KEY } = process.env;

if (!SENDGRID_API_KEY) console.warn("No SendGrid API key");
else sendgrid.setApiKey(SENDGRID_API_KEY);

export default SENDGRID_API_KEY ? sendgrid : undefined;
