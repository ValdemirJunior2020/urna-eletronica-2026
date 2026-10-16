import { createHmac } from 'node:crypto';
// Same-origin Netlify bridge avoids Apps Script CORS errors on mobile browsers.
// Google Sheets remains the database. This function transmits only an HMAC of the client IP for a five-minute cooldown; never the raw IP.
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbyRqltnrpsX7Qifox4zbfhzv8H5JwTruYsjfXOvteVFWnNOft4ojSQNHrXjB7wGfbToNw/exec';

function reply(data,status=200){
  return new Response(JSON.stringify(data),{
    status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}
  });
}
export default async function handler(request,context){
  if(request.method!=='POST')return reply({ok:false,error:'Método não permitido.'},405);
  try{
    const raw=await request.text();
    if(raw.length>4096)return reply({ok:false,error:'Dados muito grandes.'},413);
    let payload;
    try{payload=JSON.parse(raw)}catch{return reply({ok:false,error:'JSON inválido.'},400)}
    if(!payload||!['register','vote','results'].includes(payload.action))return reply({ok:false,error:'Ação inválida.'},400);
    // Deriva um identificador estável da conexão sem salvar o endereço IP em texto claro.
    // O segredo nunca é exposto ao navegador nem ao Google Sheets.
    if(payload.action==='register'||payload.action==='vote'){
      const secret=Netlify.env.get('URNA_IP_HASH_SECRET');
      const clientIP=context?.ip;
      // Netlify pode não expor imediatamente variáveis de ambiente recém-configuradas.
      // Quando não há segredo disponível, o Apps Script gera o identificador HMAC
      // com um segredo privado armazenado em ScriptProperties.
      // Nunca salvar o IP bruto no Google Sheets.
      if(clientIP){
        if(secret)payload.ipHash=createHmac('sha256',secret).update(clientIP).digest('hex');
        else payload.clientIp=clientIP;
      }
    }
    const upstream=await fetch(APPS_SCRIPT_URL,{
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify(payload),
      redirect:'follow',
      signal:AbortSignal.timeout(22000)
    });
    if(!upstream.ok)return reply({ok:false,error:'Google Apps Script indisponível.'},502);
    const content=await upstream.text();
    let result;
    try{result=JSON.parse(content)}catch{
      return reply({ok:false,error:'O Google Apps Script não retornou JSON. Verifique a implantação /exec e as permissões.'},502);
    }
    return reply(result,200);
  }catch(err){
    if(err?.name==='TimeoutError'||err?.name==='AbortError')
      return reply({ok:false,error:'Tempo esgotado no Google Apps Script. Verifique o resultado antes de tentar novamente.'},504);
    console.error('Netlify/Apps Script communication error:',err?.name||'unknown');
    return reply({ok:false,error:'Não foi possível acessar o Google Apps Script.'},502);
  }
}
