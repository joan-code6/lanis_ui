import { Account, Client } from 'appwrite';

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '698337a60017b46df380';

const client = new Client().setEndpoint(endpoint).setProject(projectId);
const account = new Account(client);

export async function exchangeAppwriteToken(userId: string, secret: string): Promise<string> {
  await account.createSession({ userId, secret });
  return createAppwriteJWT();
}

export async function createAppwriteJWT(): Promise<string> {
  const result = await account.createJWT();
  return result.jwt;
}

export async function deleteAppwriteSession(): Promise<void> {
  try {
    await account.deleteSession({ sessionId: 'current' });
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code !== 401 && code !== 404) throw error;
  }
}
