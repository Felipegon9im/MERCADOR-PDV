// Pure JS SHA256 & HMAC-SHA256 Implementation for Offline Verification
// (Zero-dependency, synchronous, safe to run in any browser/Node context)

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  var mathPow = Math.pow;
  var maxWord = mathPow(2, 32);
  var lengthProperty = 'length';
  var i, j;
  var words = [];
  var asciiLength = ascii[lengthProperty] * 8;
  
  var hash = sha256.h = sha256.h || [];
  var k = sha256.k = sha256.k || [];
  var primeCounter = k[lengthProperty];

  var isPrime = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isPrime[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isPrime[i] = 1;
      }
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  
  ascii += '\x80';
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return; // ASCII only
    words[i >> 2] |= j << (24 - (i % 4) * 8);
  }
  words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiLength | 0);
  
  var w = [];
  var h0 = hash[0], h1 = hash[1], h2 = hash[2], h3 = hash[3], h4 = hash[4], h5 = hash[5], h6 = hash[6], h7 = hash[7];
  for (i = 0; i < words[lengthProperty]; i += 16) {
    var w_inside = [];
    for (j = 0; j < 16; j++) w_inside[j] = words[i + j] | 0;
    for (j = 16; j < 64; j++) {
      var s0 = rightRotate(w_inside[j - 15], 7) ^ rightRotate(w_inside[j - 15], 18) ^ (w_inside[j - 15] >>> 3);
      var s1 = rightRotate(w_inside[j - 2], 17) ^ rightRotate(w_inside[j - 2], 19) ^ (w_inside[j - 2] >>> 10);
      w_inside[j] = (w_inside[j - 16] + s0 + w_inside[j - 7] + s1) | 0;
    }
    
    var a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (j = 0; j < 64; j++) {
      var S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      var ch = (e & f) ^ ((~e) & g);
      var temp1 = (h + S1 + ch + k[j] + w_inside[j]) | 0;
      var S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = (S0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  
  var binary = '';
  var finalWords = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (i = 0; i < 8; i++) {
    var word = finalWords[i];
    binary += String.fromCharCode(
      (word >>> 24) & 255,
      (word >>> 16) & 255,
      (word >>> 8) & 255,
      word & 255
    );
  }
  return binary;
}

export function hmacSha256(key, message) {
  var blockSize = 64;
  if (key.length > blockSize) {
    key = sha256(key);
  }
  if (key.length < blockSize) {
    while (key.length < blockSize) {
      key += '\x00';
    }
  }
  
  var oKeyPad = '';
  var iKeyPad = '';
  for (var i = 0; i < blockSize; i++) {
    oKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x5c);
    iKeyPad += String.fromCharCode(key.charCodeAt(i) ^ 0x36);
  }
  
  var innerHash = sha256(iKeyPad + message);
  var outerHash = sha256(oKeyPad + innerHash);
  
  var hex = '';
  for (var j = 0; j < outerHash.length; j++) {
    var h = outerHash.charCodeAt(j).toString(16);
    if (h.length === 1) h = '0' + h;
    hex += h;
  }
  return hex;
}

export const SECRETO_LICENCA = "MercadoPDV_Secret_License_Salt_Key_2026_@Secured!";

/**
 * Valida localmente uma chave de licença Base64 utilizando HMAC-SHA256
 * @param {string} licenseStr Chave criptografada Base64
 * @param {string} currentMachineId ID de hardware único da máquina atual
 * @returns {object} { valida, expiraEm, diasRestantes, motivo }
 */
export function validarLicencaLocal(licenseStr, currentMachineId) {
  if (!licenseStr || !licenseStr.trim()) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Chave não encontrada. Por favor, registre o sistema para continuar.'
    };
  }
  
  let decoded = '';
  try {
    decoded = atob(licenseStr.trim());
  } catch (e) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Chave inválida. O formato do código de licença é inválido.'
    };
  }
  
  const parts = decoded.split('|');
  if (parts.length < 3) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Chave corrompida. Formato interno inválido.'
    };
  }
  
  const signature = parts.pop();
  const expDateStr = parts.pop();
  const machineId = parts.join('|');
  
  // Recriar assinatura esperada
  const message = `${machineId}|${expDateStr}`;
  const expectedSignature = hmacSha256(SECRETO_LICENCA, message);
  
  if (signature !== expectedSignature) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Assinatura digital inválida. Esta licença foi violada ou modificada.'
    };
  }
  
  if (machineId !== currentMachineId) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Esta licença foi gerada para outro computador e não pode ser ativada aqui.'
    };
  }
  
  // Validar data de expiração
  // Adiciona a hora T23:59:59 para expirar no fim do dia especificado
  const expDate = new Date(expDateStr + 'T23:59:59');
  if (isNaN(expDate.getTime())) {
    return {
      valida: false,
      expiraEm: null,
      diasRestantes: 0,
      motivo: 'Data de expiração da licença com formato inválido.'
    };
  }
  
  const hoje = new Date();
  
  // Zera as horas para cálculo preciso de dias inteiros restantes
  const expZero = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
  const hojeZero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  
  const diffTime = expZero.getTime() - hojeZero.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      valida: false,
      expiraEm: expDateStr,
      diasRestantes: diffDays,
      motivo: `A licença expirou em ${expDateStr.split('-').reverse().join('/')}.`
    };
  }
  
  return {
    valida: true,
    expiraEm: expDateStr,
    diasRestantes: diffDays,
    motivo: 'Licença válida.'
  };
}

/**
 * Obtém a chave de licença ativa do localStorage
 */
export function obterChaveLicencaAtiva() {
  return localStorage.getItem('MERCADOPDV_LICENSE') || '';
}

/**
 * Grava uma nova licença no localStorage
 * @param {string} licenseStr 
 */
export function salvarChaveLicenca(licenseStr) {
  if (licenseStr) {
    localStorage.setItem('MERCADOPDV_LICENSE', licenseStr.trim());
  }
}

/**
 * Remove a chave do localStorage (forçar bloqueio/logout)
 */
export function removerChaveLicenca() {
  localStorage.removeItem('MERCADOPDV_LICENSE');
}
