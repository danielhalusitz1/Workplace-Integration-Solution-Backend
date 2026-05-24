import * as CryptoJS from 'crypto-js';

const encrypt = (data: string) => {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY missing');
  }
  return CryptoJS.AES.encrypt(data, secretKey).toString();
};

const decrypt = (encrypted: string) => {
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY missing');
  }
  const bytes = CryptoJS.AES.decrypt(encrypted, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export { decrypt, encrypt };
