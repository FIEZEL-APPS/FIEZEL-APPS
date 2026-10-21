import {generateKeyPairSync,randomBytes} from 'node:crypto';
const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1',publicKeyEncoding:{format:'jwk'},privateKeyEncoding:{format:'jwk'}});
const b64u=s=>Buffer.from(s,'base64url');const pub=Buffer.concat([Buffer.from([4]),b64u(publicKey.x),b64u(publicKey.y)]).toString('base64url');const priv=privateKey.d;const cron=randomBytes(32).toString('base64url');
console.log(JSON.stringify({VAPID_PUBLIC_KEY:pub,VAPID_PRIVATE_KEY:priv,FIEZEL_REMINDER_CRON_TOKEN:cron,VAPID_SUBJECT:'mailto:CHANGE-ME@example.com'},null,2));
