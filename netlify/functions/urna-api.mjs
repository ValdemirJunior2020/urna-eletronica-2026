// Same-origin Netlify bridge avoids Apps Script CORS errors on mobile browsers.
// Google Sheets remains the database. The IP is forwarded only server-to-server over HTTPS; Google Apps Script hashes it with a private ScriptProperties secret and stores the hash, not the address.
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbxnk255yBkTrDty5OE0u99kqYWEo6Zf5C3cz5z43kNSBSQmT0-OMo_SDJoIQtBB7Y4hJA/exec';

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
      // O Netlify fornece o IP real da conexão. O Apps Script calcula o HMAC
      // em ScriptProperties e nunca armazena o endereço na planilha.
      if(context?.ip)payload.clientIp=context.ip;
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
