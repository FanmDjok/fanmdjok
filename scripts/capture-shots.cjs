// Régénère les captures du site vitrine à partir de l'application (données d'exemple). Usage : npm run build && npx vite preview --port 4173 & node scripts/capture-shots.cjs site-assets/shots
const {chromium}=require("playwright");
const props=[
 {id:"a1",name:"Appartement Fort-de-France",numero:"14",rue:"Rue Victor Hugo",codePostal:"97200",territoire:"martinique",currency:"EUR",typeLocation:"nue",loyer:850,actif:true,
  finance:{prixAchat:165000,valeurActuelle:182000,capitalRestant:98000,mensualite:610,tauxCredit:3.2,dureeRestanteMois:190,taxeFonciere:780,assurance:220,chargesCopro:540,entretien:300}},
 {id:"a2",name:"Villa Lagon",numero:"3",rue:"Route de la Plage",codePostal:"98714",territoire:"polynesie",currency:"XPF",typeLocation:"tourisme_classe",loyer:12500,tauxOccupation:50,actif:true,
  finance:{prixAchat:32000000,valeurActuelle:35000000,capitalRestant:18000000,mensualite:140000,tauxCredit:2.9,dureeRestanteMois:150,taxeFonciere:120000,assurance:90000,chargesCopro:0,entretien:400000}},
 {id:"a3",name:"Studio Pointe-à-Pitre",numero:"8",rue:"Rue Schoelcher",codePostal:"97110",territoire:"guadeloupe",currency:"EUR",typeLocation:"meublee",loyer:560,actif:true,
  finance:{prixAchat:98000,valeurActuelle:104000,capitalRestant:61000,mensualite:420,tauxCredit:3.6,dureeRestanteMois:170,taxeFonciere:520,assurance:150,chargesCopro:420,entretien:200}},
];
const pay=[["a1","recu",850],["a2","attente",330000],["a3","retard",560]].map(([propertyId,status,amount],i)=>({id:"p"+i,propertyId,month:"2026-11",amount,status}));
const exp=[{id:"e1",propertyId:"a1",month:"2026-11",amount:180,category:"Entretien"},{id:"e2",propertyId:"a3",month:"2026-11",amount:95,category:"Réparations"}];
(async()=>{const b=await chromium.launch();const out=process.argv[2];
const ctx=await b.newContext({viewport:{width:390,height:780},deviceScaleFactor:2});const p=await ctx.newPage();
await p.addInitScript(([a,c,d])=>{localStorage.setItem("kz.properties",a);localStorage.setItem("kz.payments",c);localStorage.setItem("kz.expenses",d)},[JSON.stringify(props),JSON.stringify(pay),JSON.stringify(exp)]);
const errs=[];p.on("pageerror",e=>errs.push(String(e)));
await p.goto(process.env.APP_URL||"http://localhost:4173/app/");await p.waitForTimeout(500);
await p.screenshot({path:out+"/app-accueil.png"});
await p.getByRole("button",{name:"Analyses"}).click();await p.waitForTimeout(300);
const shot=async(text,name,dy=-80)=>{const l=p.getByText(text,{exact:false}).first();await l.scrollIntoViewIfNeeded();await p.evaluate(d=>window.scrollBy(0,d),dy);await p.waitForTimeout(200);await p.screenshot({path:out+"/"+name+".png"});};
await shot("Vue consolidée du portefeuille","app-portefeuille");
await shot("Score de santé patrimoniale","app-score",-140);
await shot("Projection du patrimoine","app-projection",-60);
console.log("errors",errs);await b.close()})();
