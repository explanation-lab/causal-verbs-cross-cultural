/* Generate manifests with the established Console converter and freeze its client. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const consoleRoot=process.argv[2];
if(!consoleRoot)throw Error('Pass the Study Console source path.');
const {inspectStudyZip,convertStudyZip}=await import(pathToFileURL(path.join(consoleRoot,'lib/study-converter.ts')));
const {zipSync,unzipSync}=createRequire(path.join(consoleRoot,'package.json'))('fflate');
const client=fs.readFileSync(path.join(consoleRoot,'public/lab-study-client.js'),'utf8');
for(const name of (process.argv.slice(3).length?process.argv.slice(3):['Absences','Factivity','Chains'])) {
  const dir=path.join(root,'Pilots',name,'collection'),files={};
  const walk=(base)=>{for(const item of fs.readdirSync(path.join(dir,base),{withFileTypes:true})) {
    const rel=path.posix.join(base,item.name);
    if(item.isDirectory())walk(rel);
    else if(!rel.endsWith('explanation-lab.config.json')&&!rel.endsWith('explanation-lab-client.js')&&!rel.startsWith('EXPLANATION_'))files[rel]=fs.readFileSync(path.join(dir,rel));
  }};
  walk('');
  const inspection=await inspectStudyZip(new File([zipSync(files)],name+'-console-source.zip'));
  if(inspection.outcome!=='ready'||!inspection.alreadyIntegrated)throw Error(JSON.stringify({name,outcome:inspection.outcome,blockers:inspection.blockers,integration:inspection.integration}));
  const allocation=JSON.parse(files['allocation.json']);
  const version=files['js/study.js'].toString().match(/const EXPERIMENT_VERSION = "([^"]+)"/)[1];
  const result=await convertStudyZip(inspection,{experimentVersion:version,conditionCodes:Object.keys(allocation.cells),demographicFields:allocation.demographic_fields,noDemographics:false,assignmentType:'between_participant'},client);
  const output=unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
  const changed=Object.keys(files).filter(p=>Buffer.compare(files[p],output[p]||new Uint8Array())!==0);
  if(changed.length)throw Error('Converter changed source; inspect '+name+': '+changed.join(', '));
  fs.writeFileSync(path.join(dir,'js/explanation-lab-client.js'),client);
  fs.writeFileSync(path.join(dir,'explanation-lab.config.json'),output['explanation-lab.config.json']);
  fs.writeFileSync(path.join(dir,'EXPLANATION_LAB_README.md'),output['EXPLANATION_LAB_README.md']);
  console.log(JSON.stringify({study:name,groups:result.config.launchConditions.length,version,fingerprint:result.config.packageFingerprint,clientVersion:result.config.clientVersion}));
}
