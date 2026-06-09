import * as CryptoJS from 'crypto-js';

const encrypt = (data: string) => {
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error('ENCRYPTION_SECRET_KEY missing');
  }
  if (data.length === 0) {
    throw new Error('Data is empty');
  }
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};

const decrypt = (encrypted: string) => {
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error('ENCRYPTION_SECRET_KEY missing');
  }
  if (encrypted.length === 0) {
    throw new Error('Encrypted data is empty');
  }
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export { decrypt, encrypt };
