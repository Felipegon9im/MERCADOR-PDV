import QRCode from 'qrcode';

// Helper to pad EMV values: ID (2 chars) + Length (2 chars) + Value
function emvField(id, value) {
  const len = String(value).length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// CRC16 CCITT Calculation
function calculateCRC16(str) {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    const b = str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      const bit = ((b >> (7 - j)) & 1) === 1;
      const c15 = ((crc >> 15) & 1) === 1;
      crc <<= 1;
      if (c15 ^ bit) {
        crc ^= polynomial;
      }
    }
  }
  
  crc &= 0xFFFF;
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generates PIX Static Payload
 * @param {string} chave - PIX Key (e.g., CNPJ, CPF, Email, EVP)
 * @param {number} valor - Price (e.g., 45.90)
 * @param {string} beneficiario - Merchant Name
 * @param {string} cidade - Merchant City
 * @param {string} txid - Transaction ID (ID 62 -> sub 05)
 */
export function generatePixPayload({ chave, valor, beneficiario = 'MERCADO LOCAL', cidade = 'SAO PAULO', txid = '***' }) {
  // 00: Payload Format Indicator
  let payload = emvField('00', '01');
  
  // 26: Merchant Account Information
  const merchantGui = emvField('00', 'br.gov.bcb.pix');
  const merchantKey = emvField('01', chave.trim());
  const merchantDescription = emvField('02', 'COMPRA PDV');
  const merchantAccountInfo = emvField('26', `${merchantGui}${merchantKey}${merchantDescription}`);
  payload += merchantAccountInfo;
  
  // 52: Merchant Category Code (5411 = Grocery Stores, Supermarkets)
  payload += emvField('52', '5411');
  
  // 53: Transaction Currency (986 = BRL)
  payload += emvField('53', '986');
  
  // 54: Transaction Amount
  payload += emvField('54', valor.toFixed(2));
  
  // 58: Country Code (BR)
  payload += emvField('58', 'BR');
  
  // 59: Merchant Name
  const cleanName = beneficiario.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 25);
  payload += emvField('59', cleanName);
  
  // 60: Merchant City
  const cleanCity = cidade.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().slice(0, 15);
  payload += emvField('60', cleanCity);
  
  // 62: Additional Data Field (TXID)
  const cleanTxid = txid.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const additionalData = emvField('05', cleanTxid);
  payload += emvField('62', additionalData);
  
  // 63: CRC16 Checksum
  const crcHeader = '6304';
  const fullPayloadForCrc = `${payload}${crcHeader}`;
  const crc = calculateCRC16(fullPayloadForCrc);
  
  return `${payload}${crcHeader}${crc}`;
}

/**
 * Generates PIX QR Code as DataURL (base64)
 * @param {string} payload - BRCode string
 * @returns {Promise<string>} base64 image data url
 */
export async function generatePixQrCode(payload) {
  try {
    const qrDataUrl = await QRCode.toDataURL(payload, {
      margin: 1,
      width: 256,
      color: {
        dark: '#121216', // Slate-900 color for scanner compatibility
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (err) {
    console.error('Error generating PIX QR Code', err);
    throw err;
  }
}
