import dotenv from 'dotenv';
dotenv.config();

export const META_TOKEN = process.env.META_TOKEN!;
export const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID!;
export const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET!; // verify token (GET)
export const APP_SECRET = process.env.APP_SECRET!;         // HMAC key (POST signatures)

export const GRAPH_API_VERSION = 'v19.0';
export const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;