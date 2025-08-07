import dotenv from 'dotenv';

dotenv.config();

export const META_TOKEN = process.env.META_TOKEN!;
export const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID!;
export const GRAPH_API_VERSION = 'v19.0';
export const GRAPH_API_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;
