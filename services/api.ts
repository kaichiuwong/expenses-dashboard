import { 
  TransactionResponse, 
  CategoryResponse, 
  CreateTransactionPayload, 
  RegularTransactionResponse,
  BulkCreateTransactionPayload,
  YearlySummaryResponse,
  CreateRegularTransactionPayload
} from '../types';

let envBaseUrl = '';
let envApiKey = '';
let envJwtSecret = '';

try {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    envBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.REACT_APP_API_BASE_URL;
    // @ts-ignore
    envApiKey = import.meta.env.VITE_SUPABASE_KEY || import.meta.env.REACT_APP_SUPABASE_KEY;
    // @ts-ignore
    envJwtSecret = import.meta.env.VITE_JWT_SECRET || import.meta.env.REACT_APP_JWT_SECRET;
  }
} catch (e) {}

try {
  if (typeof process !== 'undefined' && process.env) {
    if (!envBaseUrl) {
        envBaseUrl = process.env.REACT_APP_API_BASE_URL || process.env.VITE_API_BASE_URL || '';
    }
    if (!envApiKey) {
        envApiKey = process.env.REACT_APP_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';
    }
    if (!envJwtSecret) {
        envJwtSecret = process.env.REACT_APP_JWT_SECRET || process.env.VITE_JWT_SECRET || '';
    }
  }
} catch (e) {}

const BASE_URL = envBaseUrl ;
const API_KEY = envApiKey ;
// Fallback secret for demo/dev purposes if env var is missing. 
// In production, this MUST be set via environment variables.
const JWT_SECRET = envJwtSecret || 'my-secret-key'; 

// --- JWT Generation Helpers ---

const textEncoder = new TextEncoder();

const base64UrlEncode = (data: Uint8Array | string): string => {
    let base64 = '';
    if (typeof data === 'string') {
        const bytes = textEncoder.encode(data);
        base64 = btoa(String.fromCharCode(...bytes));
    } else {
        base64 = btoa(String.fromCharCode(...data));
    }
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const generateJWT = async (email: string) => {
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
        email: email,
        apikey: API_KEY,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const tokenData = `${encodedHeader}.${encodedPayload}`;

    // Import the secret key for HMAC
    const key = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // Sign the data
    const signature = await crypto.subtle.sign('HMAC', key, textEncoder.encode(tokenData));
    const encodedSignature = base64UrlEncode(new Uint8Array(signature));

    return `${tokenData}.${encodedSignature}`;
};

const getHeaders = async (emailOverride?: string) => {
  let email = emailOverride;
  
  // If no email provided, try to find the logged-in user in localStorage
  if (!email) {
      try {
          const stored = localStorage.getItem('user');
          if (stored) {
              const u = JSON.parse(stored);
              email = u.email;
          }
      } catch(e) {}
  }
  
  const token = await generateJWT(email || '');

  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

// --- WebAuthn Helpers ---

const base64URLToBuffer = (base64URL: string): ArrayBuffer => {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const bufferToBase64URL = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// --- API Functions ---

export const fetchTransactions = async (month: string): Promise<TransactionResponse> => {
  const url = `${BASE_URL}/transaction?month=${month}`;
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) throw new Error(`Error fetching data: ${response.statusText}`);
  return response.json();
};

export const fetchCategories = async (): Promise<CategoryResponse> => {
  const url = `${BASE_URL}/category`;
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) throw new Error(`Error fetching categories: ${response.statusText}`);
  return response.json();
};

export const fetchRegularTransactions = async (): Promise<RegularTransactionResponse> => {
  const url = `${BASE_URL}/regular`;
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) throw new Error(`Error fetching regular transactions: ${response.statusText}`);
  return response.json();
};

export const fetchYearlySummary = async (year: string): Promise<YearlySummaryResponse> => {
  const url = `${BASE_URL}/summary?year=${year}`;
  const response = await fetch(url, { method: 'GET', headers: await getHeaders() });
  if (!response.ok) throw new Error(`Error fetching yearly summary: ${response.statusText}`);
  return response.json();
};

export const fetchExchangeRate = async (currencyCode: string): Promise<number> => {
  if (currencyCode === 'AUD') return 1;
  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${currencyCode}`);
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    const data = await response.json();
    const rate = data.rates?.AUD;
    if (!rate) throw new Error(`Rate for AUD not found in ${currencyCode} response`);
    return rate;
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    return 1;
  }
};

export const addTransaction = async (data: CreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ transaction: data }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const addBulkTransactions = async (data: BulkCreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ transaction: data }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const updateTransaction = async (id: string, data: CreateTransactionPayload['transaction']): Promise<void> => {
  const url = `${BASE_URL}/transaction/${id}`;
  const response = await fetch(url, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ transaction: data }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const url = `${BASE_URL}/transaction/${id}`;
  const response = await fetch(url, { method: 'DELETE', headers: await getHeaders() });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const addRegularTransaction = async (data: CreateRegularTransactionPayload['regularTransaction']): Promise<void> => {
  const url = `${BASE_URL}/regular`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ regularTransaction: data }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const updateRegularTransaction = async (id: string, data: CreateRegularTransactionPayload['regularTransaction']): Promise<void> => {
  const url = `${BASE_URL}/regular/${id}`;
  const response = await fetch(url, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ regularTransaction: data }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const deleteRegularTransaction = async (id: string): Promise<void> => {
  const url = `${BASE_URL}/regular/${id}`;
  const response = await fetch(url, { method: 'DELETE', headers: await getHeaders() });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const checkUserEmail = async (email: string): Promise<{ exists: boolean; user?: { id: string; email: string }; message?: string }> => {
  const url = `${BASE_URL}/check-user-email`;
  // Body removed as email is now read from JWT
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(email) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
  return response.json();
};

export const getPasskeyOptions = async (email: string): Promise<any> => {
  const url = `${BASE_URL}/auth-options`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(email), body: JSON.stringify({ email }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
  return response.json();
};

export const verifyPasskeyLogin = async (email: string, credential: any): Promise<{ user: { id: string; email: string } }> => {
  const url = `${BASE_URL}/auth-verify`;
  
  const assertion = credential as PublicKeyCredential;
  const response = assertion.response as AuthenticatorAssertionResponse;

  const payload = {
    email,
    credential: {
      id: assertion.id,
      rawId: bufferToBase64URL(assertion.rawId),
      response: {
        authenticatorData: bufferToBase64URL(response.authenticatorData),
        clientDataJSON: bufferToBase64URL(response.clientDataJSON),
        signature: bufferToBase64URL(response.signature),
        userHandle: response.userHandle ? bufferToBase64URL(response.userHandle) : null,
      },
      type: assertion.type,
    }
  };

  const verifyRes = await fetch(url, { method: 'POST', headers: await getHeaders(email), body: JSON.stringify(payload) });
  if (!verifyRes.ok) throw new Error(await verifyRes.text() || verifyRes.statusText);
  return verifyRes.json();
};

export const getRegistrationOptions = async (email: string): Promise<any> => {
  const url = `${BASE_URL}/reg-options`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(email), body: JSON.stringify({ email }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
  return response.json();
};

export const verifyPasskeyRegistration = async (email: string, credential: any): Promise<{ user: { id: string; email: string } }> => {
  const url = `${BASE_URL}/reg-verify`;
  
  const attestation = credential as PublicKeyCredential;
  const response = attestation.response as AuthenticatorAttestationResponse;

  const payload = {
    email,
    credential: {
      id: attestation.id,
      rawId: bufferToBase64URL(attestation.rawId),
      response: {
        attestationObject: bufferToBase64URL(response.attestationObject),
        clientDataJSON: bufferToBase64URL(response.clientDataJSON),
      },
      type: attestation.type,
    }
  };

  const verifyRes = await fetch(url, { method: 'POST', headers: await getHeaders(email), body: JSON.stringify(payload) });
  if (!verifyRes.ok) throw new Error(await verifyRes.text() || verifyRes.statusText);
  return verifyRes.json();
};

// Export base64URLToBuffer for component usage if needed (e.g. converting challenge)
export { base64URLToBuffer };