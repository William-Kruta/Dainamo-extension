const PASSPHRASE = "THIS_is_A_strong_passphrase_5616116616166161111";
const SALT = "THIS_is_A_strong_salt_4123654478sdfds54df5s6465df4s65";

async function getCryptoKey() {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(PASSPHRASE),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptAndStoreApiKey(provider, apiKey) {
  const key = await getCryptoKey();
  console.log(`API: ${key}`);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(apiKey);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  // store iv + ciphertext as JSON in localStorage
  localStorage.setItem(
    `${provider}ApiKey`,
    JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(ct)),
    })
  );
}

export async function decryptApiKey(provider) {
  const json = JSON.parse(localStorage.getItem(`${provider}ApiKey`));
  const key = await getCryptoKey();
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(json.iv) },
    key,
    new Uint8Array(json.data)
  );
  const decoded = new TextDecoder().decode(pt);
  console.log(`DECODED API: ${decoded}`);
  return decoded;
}
