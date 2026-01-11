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

// Base64Url encode for JWT parts
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

// Standard Base64 encode for encrypted data (no URL replacements)
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

// Convert string to exact 32 bytes for AES-256
const stringTo32Bytes = (str: string): ArrayBuffer => {
    const data = textEncoder.encode(str);
    const keyData = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        keyData[i] = i < data.length ? data[i] : 0;
    }
    return keyData.buffer;
};

// Encrypt data using AES-GCM
const encryptData = async (data: any, secret: string) => {
    const dataBuffer = textEncoder.encode(JSON.stringify(data));
    
    // Generate random IV (12 bytes for GCM)
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    
    // Convert secret to exactly 32 bytes
    const keyBuffer = stringTo32Bytes(secret);
    
    // Import key
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        keyMaterial,
        dataBuffer
    );
    
    return {
        encrypted: arrayBufferToBase64(encrypted),
        iv: arrayBufferToBase64(iv.buffer)
    };
};

const generateJWT = async (email: string) => {
    // 1. Encrypt the sensitive data
    const dataToEncrypt = {
        email: email,
        apikey: API_KEY
    };

    const { encrypted, iv } = await encryptData(dataToEncrypt, JWT_SECRET);

    // 2. JWT Header
    const header = { alg: "HS256", typ: "JWT" };
    
    // 3. JWT Payload with encrypted data
    const payload = {
        data: encrypted,
        iv: iv,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiration
    };

    // 4. Encode Header & Payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const tokenData = `${encodedHeader}.${encodedPayload}`;

    // 5. Sign (HMAC SHA-256)
    const key = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

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

// --- Category API Functions ---

export const addCategory = async (name: string): Promise<void> => {
  const url = `${BASE_URL}/category`;
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(), body: JSON.stringify({ category: { name } }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const updateCategory = async (id: string, name: string): Promise<void> => {
  const url = `${BASE_URL}/category/${id}`;
  const response = await fetch(url, { method: 'PUT', headers: await getHeaders(), body: JSON.stringify({ category: { name } }) });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const deleteCategory = async (id: string): Promise<void> => {
  const url = `${BASE_URL}/category/${id}`;
  const response = await fetch(url, { method: 'DELETE', headers: await getHeaders() });
  if (!response.ok) throw new Error(await response.text() || response.statusText);
};

export const checkUserEmail = async (email: string): Promise<{ exists: boolean; user?: { id: string; email: string }; message?: string }> => {
  const url = `${BASE_URL}/check-user-email`;
  // Body removed as email is now read from JWT
  const response = await fetch(url, { method: 'POST', headers: await getHeaders(email) });
  if (!response.ok) {
    const text = await response.text();
    let errorMessage = text;
    try {
      // Try to parse JSON error message from backend
      const json = JSON.parse(text);
      if (json && json.message) {
        errorMessage = json.message;
      }
    } catch (e) {
      // If parsing fails, use raw text
    }
    throw new Error(errorMessage || response.statusText);
  }
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