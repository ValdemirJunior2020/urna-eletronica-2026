/** Google Apps Script: cole em Extensões > Apps Script do Google Sheet.
 * Implante como Aplicativo da web, executando COMO VOCÊ e acesso "Qualquer pessoa".
 * AVISO: este endpoint público é adequado apenas a uma SIMULAÇÃO, não a votação auditável.
 */
const SHEET_ID='1Xvu8XsGzHoLZF_3E0JRa8Fe9IGBQC0YwNQ45QSmlhjw';
// Execute setupSheets no editor para preparar/verificar as abas.
function setupSheets() {
  tab('Cadastros', ['DataHora','Nome','Nascimento','TokenHash','Votou']);
  tab('Votos', ['DataHora','Número']);
  tab('IP_Votos', ['DataHora','IPHash']);
  return 'Pronto: abas Cadastros e Votos verificadas. A aba Resumo fica preservada.';
}
function tab(name, headers) {
  // Ao clicar Executar em tab sem argumentos, inicializa em vez de falhar.
  if (name === undefined && headers === undefined) return setupSheets();
  if (typeof name !== 'string' || !name.trim() ||
      !Array.isArray(headers) || headers.length === 0) {
    throw new Error('A funcao auxiliar tab exige um nome e cabecalhos validos.');
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}
function doGet() {
  return json({ok:true,service:'Urna Brasil — Simulacao educativa',status:'ready',version:'ip-cooldown-5m-v2',ipCooldownSeconds:300});
}
function json(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function sha(value){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('')}

const DUPLICATE_MESSAGE = 'Este cadastro já confirmou um voto nesta simulação. Não é possível votar novamente.';
const IP_COOLDOWN_MS = 5 * 60 * 1000;

function getIpWaitSeconds_(sheet, ipHash, nowMs) {
  if (!/^[a-f0-9]{64}$/.test(ipHash)) return 0;
  // Percorre as participações recentes em blocos, sem buscar toda a planilha.
  for (let end=sheet.getLastRow(); end>=2; end-=250) {
    const start=Math.max(2,end-249);
    const rows=sheet.getRange(start,1,end-start+1,2).getValues();
    for (let i=rows.length-1;i>=0;i--) {
      const value=rows[i][0];
      const t=value instanceof Date ? value.getTime() : new Date(value).getTime();
      if (!Number.isFinite(t)) continue;
      const elapsed=nowMs-t;
      if (elapsed >= IP_COOLDOWN_MS) return 0;
      if (elapsed < 0) continue;
      if (String(rows[i][1]) === ipHash) {
        return Math.max(1,Math.ceil((IP_COOLDOWN_MS-elapsed)/1000));
      }
    }
  }
  return 0;
}
// O segredo nunca fica no GitHub nem no navegador: é criado e guardado
// nas Script Properties do próprio Apps Script. O IP bruto não é salvo.
function ipHash_(clientIp) {
  const raw=String(clientIp||'').trim();
  if (!raw || raw.length>64 || !/^[0-9a-f:.]+$/i.test(raw)) return '';
  const props=PropertiesService.getScriptProperties();
  let secret=props.getProperty('URNA_IP_HASH_PEPPER');
  if (!secret) {
    secret=Utilities.getUuid()+Utilities.getUuid()+Utilities.getUuid();
    props.setProperty('URNA_IP_HASH_PEPPER',secret);
  }
  const bytes=Utilities.computeHmacSha256Signature(raw,secret);
  return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
}

function ipCooldownResponse_(seconds) {
  return json({
    ok:false,code:'IP_COOLDOWN',
    retryAfterSeconds:seconds,
    error:'Outra pessoa usou esta conexão recentemente. Aguarde para participar.'
  });
}

// Mesma pessoa = nome normalizado + data de nascimento.
// Nao comprova identidade: para evitar identidades inventadas e preciso verificar externamente.
function normalizeName_(name) {
  return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .trim().replace(/\s+/g,' ').toLocaleLowerCase('pt-BR');
}
function normalizeBirth_(birth) {
  if (birth instanceof Date) {
    return Utilities.formatDate(birth, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = String(birth || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
function isValidBirth_(birth) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return false;
  const d = new Date(birth + 'T12:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0,10) === birth &&
    d <= new Date() && Number(birth.slice(0,4)) >= 1900;
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(25000)) return json({ok:false,error:'Sistema ocupado. Tente novamente.'});
    const x = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const reg = tab('Cadastros', ['DataHora','Nome','Nascimento','TokenHash','Votou']);
    const votes = tab('Votos', ['DataHora','Número']);
    const ipHash = ipHash_(x.clientIp) || (/^[a-f0-9]{64}$/.test(String(x.ipHash||'')) ? String(x.ipHash) : '');
    const ipVotes = (x.action === 'register' || x.action === 'vote')
      ? tab('IP_Votos', ['DataHora','IPHash']) : null;

    if (x.action === 'results') {
      const data = votes.getLastRow() > 1
        ? votes.getRange(2,2,votes.getLastRow()-1,1).getValues().flat()
        : [];
      return json({ok:true,counts:{
        '22': data.filter(v => String(v) === '22').length,
        '13': data.filter(v => String(v) === '13').length
      },blank:data.filter(v => v === 'BLANK').length});
    }

    if (x.action === 'register') {
      const name = String(x.name || '').trim().replace(/\s+/g,' ');
      const birth = String(x.birth || '').trim();
      if (name.length < 3 || name.length > 100 || !/^[\p{L}][\p{L} .'-]{2,99}$/u.test(name) ||
          !isValidBirth_(birth)) {
        return json({ok:false,error:'Nome ou data de nascimento inválidos.'});
      }

      const rows = reg.getLastRow() > 1
        ? reg.getRange(2,2,reg.getLastRow()-1,4).getValues()
        : [];
      const matching = [];
      rows.forEach((row,i) => {
        if (normalizeName_(row[0]) === normalizeName_(name) &&
            normalizeBirth_(row[1]) === birth) matching.push({row,i});
      });

      if (matching.some(item => String(item.row[3]).trim().toUpperCase() === 'SIM')) {
        return json({ok:false,error:DUPLICATE_MESSAGE,code:'ALREADY_VOTED'});
      }

      const waitSeconds = getIpWaitSeconds_(ipVotes, ipHash, Date.now());
      // Se a plataforma não fornecer IP, não bloqueie uma pessoa legítima.
      // A deduplicação por nome+nascimento continua ativa.
      if (waitSeconds > 0) return ipCooldownResponse_(waitSeconds);

      const token = Utilities.getUuid() + Utilities.getUuid();
      if (matching.length > 0) {
        // Retoma cadastro incompleto. O token antigo deixa de funcionar.
        const first = matching[0];
        reg.getRange(first.i+2,4).setValue(sha(token));
        reg.getRange(first.i+2,5).setValue('NÃO');
      } else {
        reg.appendRow([new Date(),name,birth,sha(token),'NÃO']);
      }
      return json({ok:true,token});
    }

    if (x.action === 'vote') {
      const vote = String(x.vote || ''), token = String(x.token || '');
      if (!['22','13','BLANK'].includes(vote) || token.length < 30) {
        return json({ok:false,error:'Voto inválido.'});
      }
      if (reg.getLastRow() < 2) return json({ok:false,error:'Cadastro inexistente.'});
      const rows = reg.getRange(2,4,reg.getLastRow()-1,2).getValues();
      const i = rows.findIndex(row => row[0] === sha(token));
      if (i < 0) return json({ok:false,error:'Cadastro não encontrado. Reinicie o cadastro.'});
      if (String(rows[i][1]).trim().toUpperCase() === 'SIM') {
        return json({ok:false,error:DUPLICATE_MESSAGE,code:'ALREADY_VOTED'});
      }
      const waitSeconds = getIpWaitSeconds_(ipVotes, ipHash, Date.now());
      // Se a plataforma não fornecer IP, não bloqueie uma pessoa legítima.
      // A deduplicação por nome+nascimento continua ativa.
      if (waitSeconds > 0) return ipCooldownResponse_(waitSeconds);

      votes.appendRow([new Date(),vote]);
      reg.getRange(i+2,5).setValue('SIM');
      if (ipHash) ipVotes.appendRow([new Date(),ipHash]);
      return json({ok:true});
    }

    return json({ok:false,error:'Ação inválida.'});
  } catch (err) {
    console.error(err);
    return json({ok:false,error:'Falha no servidor. Tente novamente.'});
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}
