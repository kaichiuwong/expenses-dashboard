// Helper functions for ArrayBuffer conversions
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const STORAGE_KEY = 'expenses_credential_id';

export const hasRegisteredPasskey = (): boolean => {
  return !!localStorage.getItem(STORAGE_KEY);
};

export const registerLocalPasskey = async (email: string): Promise<boolean> => {
  try {
    // Generate random challenge (mock server challenge)
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    // Generate user ID based on email (simple buffer creation)
    const encoder = new TextEncoder();
    const userId = encoder.encode(email);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Expenses Dashboard',
        id: window.location.hostname, // Must match current domain
      },
      user: {
        id: userId,
        name: email,
        displayName: email.split('@')[0],
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Forces TouchID/FaceID/Windows Hello
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none'
    };

    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions
    }) as PublicKeyCredential;

    if (credential) {
      // Store the Credential ID locally
      const credentialId = bufferToBase64(credential.rawId);
      localStorage.setItem(STORAGE_KEY, credentialId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
};

export const authenticateLocalPasskey = async (): Promise<boolean> => {
  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) throw new Error('No passkey found');

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: [{
        id: base64ToBuffer(storedId),
        type: 'public-key',
        transports: ['internal'],
      }],
      userVerification: 'required',
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions
    });

    return !!assertion;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};

export const clearPasskey = () => {
  localStorage.removeItem(STORAGE_KEY);
};