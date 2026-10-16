/** Google Apps Script: cole em Extensões > Apps Script do Google Sheet.
 * Implante como Aplicativo da web, executando COMO VOCÊ e acesso "Qualquer pessoa".
 * AVISO: este endpoint público é adequado apenas a uma SIMULAÇÃO, não a votação auditável.
 */
const SHEET_ID='1Xvu8XsGzHoLZF_3E0JRa8Fe9IGBQC0YwNQ45QSmlhjw';
function tab(name, headers) {
  // Esta função é auxiliar e nunca deve ser executada diretamente no editor.
  // Validar PRIMEIRO evita criar uma aba vazia e chamar appendRow(undefined).
  if (typeof name !== 'string' || !name.trim() ||
      !Array.isArray(headers) || headers.length === 0) {
    throw new Error('Nao execute tab() diretamente. No menu Executar, selecione setupSheets.');
  }
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  // setValues requer explicitamente uma linha de cabecalhos nao vazia.
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}
function setupSheets() {
  tab('Cadastros', ['DataHora','Nome','Nascimento','TokenHash','Votou']);
  tab('Votos', ['DataHora','Número']);
  return 'Pronto: abas Cadastros e Votos verificadas. A aba Resumo fica preservada.';
}
function doGet() {
  return json({ok:true,service:'Urna Brasil — Simulacao educativa',status:'ready'});
}
function json(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
function sha(value){const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value);return bytes.map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('')}
function doPost(e){const lock=LockService.getScriptLock();lock.waitLock(15000);try{
const x=JSON.parse(e.postData.contents),reg=tab('Cadastros',['DataHora','Nome','Nascimento','TokenHash','Votou']),votes=tab('Votos',['DataHora','Número']);
if(x.action==='results'){const data=votes.getLastRow()>1?votes.getRange(2,2,votes.getLastRow()-1,1).getValues().flat():[];return json({ok:true,counts:{'22':data.filter(v=>String(v)==='22').length,'13':data.filter(v=>String(v)==='13').length},blank:data.filter(v=>v==='BLANK').length})}
if(x.action==='register'){const name=String(x.name||'').trim(),birth=String(x.birth||'');if(name.length<3||name.length>100||!/^\d{4}-\d{2}-\d{2}$/.test(birth)||new Date(birth)>new Date())return json({ok:false,error:'Dados inválidos'});const token=Utilities.getUuid()+Utilities.getUuid();reg.appendRow([new Date(),name,birth,sha(token),'NÃO']);return json({ok:true,token})}
if(x.action==='vote'){const vote=String(x.vote||''),token=String(x.token||'');if(!['22','13','BLANK'].includes(vote)||token.length<30)return json({ok:false,error:'Voto inválido'});const hash=sha(token);if(reg.getLastRow()<2)return json({ok:false,error:'Cadastro inexistente'});const records=reg.getRange(2,4,reg.getLastRow()-1,2).getValues();const i=records.findIndex(row=>row[0]===hash);if(i<0)return json({ok:false,error:'Cadastro não encontrado'});if(records[i][1]==='SIM')return json({ok:false,error:'Token já utilizado'});votes.appendRow([new Date(),vote]);reg.getRange(i+2,5).setValue('SIM');return json({ok:true})}
return json({ok:false,error:'Ação inválida'});
}catch(err){return json({ok:false,error:'Falha de processamento'})}finally{lock.releaseLock()}}
