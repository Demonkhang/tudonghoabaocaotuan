import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

function convertSql(sqlStr) {
  let paramIndex = 1;
  let inString = false;
  let res = '';
  for (let i = 0; i < sqlStr.length; i++) {
    const char = sqlStr[i];
    if (char === "'") {
      inString = !inString;
      res += char;
    } else if (char === '?' && !inString) {
      res += `$${paramIndex++}`;
    } else {
      res += char;
    }
  }
  return res;
}

let sqlClient = null;

function getClient() {
  if (!sqlClient && process.env.DATABASE_URL) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  if (!sqlClient) {
    throw new Error('DATABASE_URL is not defined in environment variables');
  }
  return sqlClient;
}

export const db = {
  prepare(query) {
    const converted = convertSql(query);
    return {
      async all(...params) {
        const client = getClient();
        const flattened = params.flat();
        return await client.query(converted, flattened);
      },
      async get(...params) {
        const client = getClient();
        const flattened = params.flat();
        const rows = await client.query(converted, flattened);
        return rows && rows.length > 0 ? rows[0] : null;
      },
      async run(...params) {
        const client = getClient();
        const flattened = params.flat();
        const res = await client.query(converted, flattened);
        return { changes: Array.isArray(res) ? res.length : 1 };
      }
    };
  },
  async exec(query) {
    const client = getClient();
    return await client.query(query);
  }
};
