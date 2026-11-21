// Release files may contain project metadata and compiler diagnostics. Inspect only first-party text.
const sourceText=/\.(?:mjs|js|json|map|html|md|txt|css|cmd|command|yml|yaml)$/i;
const machinePath=/(?:[A-Z]:[/\\]+(?:Users|Juegos)[/\\]+[\w.-]+|\/(?:home|Users)\/[\w.-]+\/)/i;
const credential=/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{35,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|discord(?:app)?\.com\/api\/webhooks\/\d+\/)/;
export function validateDistributionPrivacy(name,bytes){
 if(/^(?:node_modules|runtime)\//.test(name)||!sourceText.test(name)&&name!=='LICENSE'&&!name.endsWith('-LICENSE'))return;
 const text=bytes.toString('utf8');
 if(machinePath.test(text)||credential.test(text))throw Error('Private data in distribution file: '+name);
}
// 2026-11-21-1114||codex-clan-editor||clan-creator/scripts/distribution-privacy.mjs||Comprobar rutas de usuario y credenciales accidentales antes de empaquetar
