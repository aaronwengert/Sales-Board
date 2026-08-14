// TV rotation mode 2 — "split roster".
//
// Two screens only, each showing the ENTIRE roster at once by splitting it into
// two side-by-side columns (ranks 1..n/2 on the left, the remainder on the right):
//
//   S1  TODAY + ACTIVITY & PIPELINE   ranked by total pipeline size (desc)
//   S2  FUNDED PRODUCTION + ON DECK   ranked by funded + CTC+ total (desc)
//
// Because S1 is sorted by pipeline, the pipeline tier colors fall in strict
// bands down the page: dark green (>=$15M), light green (>=$10M), amber
// (>=$7.5M), then red — the whole desk's pipeline health readable at a glance.
//
// The KPI band only shows the two tiles that match the two column groups below,
// and the tile accent colors match the group header bars, so the top of the
// screen and the bottom of the screen always agree.
//
// This is additive. The standard full-width board is untouched and remains the
// default; nothing here runs unless the URL asks for it.
//
// URL options:
//   ?tv=2                 rotate both screens, 30s each
//   ?tv=2&sec=20          override dwell time (seconds)
//   ?tv=2&screen=s1       pin a single screen, no rotation (s1|s2)

export const TV2_CSS = `
.tv2hide{display:none!important}
#tv2host{position:fixed;inset:0;background:var(--bg);overflow:hidden;z-index:50}
#tv2board{width:1920px;height:1080px;transform-origin:top left;position:absolute;top:0;left:0;
  display:flex;flex-direction:column;padding:20px 28px 16px;box-sizing:border-box;font-family:inherit}
.tv2track{position:absolute;top:0;left:0;right:0;height:9px;background:#d9e0ea;z-index:4}
.tv2prog{position:absolute;top:0;left:0;height:9px;background:#2f6f43;width:0;z-index:5;
  box-shadow:0 0 0 1px rgba(0,0,0,.04)}

/* ---- header ---- */
.tv2hdr{display:flex;align-items:center;gap:20px;flex:0 0 auto}
.tv2id{display:flex;align-items:center;gap:16px;background:#fff;border:1px solid var(--line);
  border-radius:14px;padding:10px 20px 10px 14px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.tv2logo{height:54px;width:auto;display:block}
.tv2brand .t1{font-size:30px;font-weight:900;letter-spacing:-.4px;color:var(--ink);line-height:1.05}
.tv2brand .t2{font-size:19px;font-weight:800;color:#2f6f43;margin-top:2px}
.tv2days{display:flex;align-items:center;gap:11px;padding-left:20px;border-left:2px solid var(--line)}
.tv2days .n{font-size:42px;font-weight:900;color:#2f6f43;line-height:1}
.tv2days .dt{font-size:15px;font-weight:800;color:var(--ink)}
.tv2days .ds{font-size:12.5px;font-weight:700;color:var(--muted);margin-top:1px}
.tv2dl{display:flex;align-items:center;gap:20px;padding-left:22px;border-left:2px solid var(--line)}
.tv2dl .d{line-height:1.1}
.tv2dl .k{font-size:11.5px;font-weight:900;letter-spacing:.7px;color:var(--muted)}
.tv2dl .v{font-size:25px;font-weight:900;letter-spacing:-.3px;margin-top:2px}
.tv2dl .s{font-size:11.5px;font-weight:700;color:var(--muted);margin-top:1px}
.tv2dl .cd .v{color:#2a5bbf}
.tv2dl .rs .v{color:#c2740e}
.tv2dl .v.now{color:#fff;padding:1px 10px;border-radius:8px}
.tv2dl .cd .v.now{background:#2a5bbf}
.tv2dl .rs .v.now{background:#c2740e}
.tv2sec{margin-left:auto;text-align:right}
.tv2sec .s1{font-size:24px;font-weight:900;letter-spacing:.6px;color:var(--ink)}
.tv2sec .s2{font-size:13px;font-weight:800;color:var(--muted);margin-top:3px;letter-spacing:.5px}
.tv2dots{display:flex;gap:7px;justify-content:flex-end;margin-top:6px}
.tv2dots i{width:30px;height:5px;border-radius:3px;background:#d7dee8}
.tv2dots i.on{background:#2f6f43}

/* ---- KPI band: exactly two tiles, one per section below ---- */
.tv2band{display:flex;gap:20px;margin-top:12px;flex:0 0 auto}
.tv2band .card{flex:1;height:150px;border-radius:14px;padding:14px 22px;box-sizing:border-box;position:relative;overflow:hidden}
.tv2band .krow{display:flex;align-items:center;justify-content:space-between}
.tv2band .k-amber .pill{background:#fdf0d8;color:#8a6d0a;box-shadow:inset 0 0 0 1px #f0dcae}
.tv2band .k-green .pill.ahead,.tv2band .k-green .pill.behind{}
.tv2band .kl{font-size:16px;font-weight:900;letter-spacing:1px;color:var(--muted)}
.tv2band .kb{font-size:52px;font-weight:900;letter-spacing:-1.4px;line-height:1.04;margin-top:1px;white-space:nowrap}
.tv2band .kn{font-size:15px;font-weight:700;color:var(--muted);margin-top:6px}
.tv2band .sub{font-size:23px;font-weight:800;color:#8b95a6;letter-spacing:0}
/* every tile has the same anatomy: label row, big number, bar, three stats */
.tv2split{display:flex;margin-top:7px}
.tv2split .h{flex:1 1 0}
.tv2split .h.r{text-align:right}
.tv2split .h .k{font-size:12.5px;font-weight:900;letter-spacing:.8px;color:var(--muted)}
.tv2split .h .v{font-size:24px;font-weight:900;line-height:1.15}
.tv2bar{height:7px;border-radius:4px;background:#e6ebf2;margin-top:9px;position:relative;overflow:hidden}
.tv2bar i{display:block;height:100%;border-radius:4px}
.tv2bar .mk{position:absolute;top:-2px;width:3px;height:11px;background:#334;border-radius:2px}

/* ---- the two roster columns ---- */
.tv2grid{flex:1 1 auto;margin-top:12px;min-height:0;display:flex;gap:20px}
.tv2col{flex:1 1 0;min-width:0}
table.tv2t{width:100%;border-collapse:collapse;table-layout:fixed}
table.tv2t th{font-size:11.5px;font-weight:900;letter-spacing:.3px;color:var(--muted);text-align:right;padding:0 4px 7px}
table.tv2t th.l{text-align:left;padding-left:4px}
table.tv2t th.gh{color:#fff;font-size:15px;text-align:center;padding:5px 0;border-radius:7px;letter-spacing:.8px}
table.tv2t th.gh0{background:#6b4fbb}
table.tv2t th.gh1{background:#2a5bbf}
table.tv2t th.gh2{background:#1a8a48}
table.tv2t th.gh3{background:#d98c1a}
table.tv2t td{text-align:right;padding:0 5px;font-variant-numeric:tabular-nums}
table.tv2t td.l{text-align:left;padding-left:4px}
table.tv2t td.sp,table.tv2t th.sp{padding:0}
.tv2row{height:var(--tv2rh,34px)}
.tv2row.alt td{background:#f4f7fb}
table.tv2t td.l{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.tv2rank{display:inline-block;width:28px;font-size:14.5px;font-weight:900;color:#aab4c2}
.tv2name{font-size:19px;font-weight:800;color:var(--ink)}
.tv2team{font-size:11px;font-weight:700;color:var(--muted);margin-left:6px}
.tv2v{font-size:19px;font-weight:800;color:var(--ink)}
.tv2v.z{color:#c3ccd9}
.tv2v.b30{color:#a06a12}
.tv2v.b60{color:#b03a2e}
.tv2hit{color:#127a3c}
.tv2dash{color:#c3ccd9;font-weight:800}
.tv2chk{font-size:20px;font-weight:900;color:#1a9e4e}
.tv2chk.empty{color:#dbe2ea}
.tv2pk{padding:2px 10px;border-radius:8px;display:inline-block;font-weight:900;font-size:19px}
.tv2pk.t1{background:#127a3c;color:#fff}
.tv2pk.t2{background:#d9f2e2;color:#127a3c;box-shadow:inset 0 0 0 1px #b4e2c6}
.tv2pk.t3{background:#faf0c0;color:#8a6d0a;box-shadow:inset 0 0 0 1px #ecdd90}
.tv2pk.t4{background:#fadbd8;color:#a03530;box-shadow:inset 0 0 0 1px #f0bcb8}
.tv2circle{display:inline-block;padding:2px 12px;border-radius:18px;background:#127a3c;color:#fff;font-weight:900;font-size:19px}
.tv2frow{display:inline-flex;align-items:center;gap:7px;justify-content:flex-end}
.tv2g5{width:50px;height:8px;border-radius:5px;background:#e6ebf2;overflow:hidden;flex:0 0 auto}
.tv2g5 i{display:block;height:100%}
.tv2g5p{font-size:12.5px;font-weight:800;color:var(--muted);width:30px;text-align:right}
`;

export const TV2 = `
(function(){
  var Q = new URLSearchParams(location.search);
  if(Q.get('tv')!=='2') return;
  var B = window.__BOARD__ || {};
  var D = (B.rows||[]).slice();
  if(!D.length) return;
  var TODAY=B.today||{}, MTD=B.mtd||{}, K=B.kpi||{}, TIX=B.tix||{};
  var CALLS_PENDING=!!B.callsPending, TIX_PENDING=(B.tixPending===false?false:true);
  var CALLS_GOAL=75, TALK_GOAL=90, SUB_GOAL=1, TIX_GOAL=3;
  var GOAL=B.goal||100e6, PIPE_GOAL=300e6;
  var DASH={}, EXEMPT={};
  (B.dashAEs||[]).forEach(function(n){DASH[n]=1;});
  (B.exemptAEs||[]).forEach(function(n){EXEMPT[n]=1;});
  var DWELL=(parseInt(Q.get('sec')||'30',10)||30)*1000;
  var PIN=(Q.get('screen')||'').toLowerCase();

  function mM(v){ if(!v) return '$0'; return '$'+(v/1e6).toFixed(2)+'M'; }
  function mK(v){ if(!v) return '$0'; return v>=1e6 ? '$'+(v/1e6).toFixed(2)+'M' : '$'+Math.round(v/1000)+'K'; }
  function mixAG(p){ var a=[224,138,23],g=[26,158,78],c=a.map(function(x,i){return Math.round(x+(g[i]-x)*(p/100));}); return 'rgb('+c[0]+','+c[1]+','+c[2]+')'; }
  // Both roster columns sit in half the screen width, so the long team names
  // are shortened here rather than being truncated with an ellipsis.
  var TEAMSHORT={'The Rainmakers':'Rainmakers','Cash Flow Commanders':'CF Commanders','Cash Flow Cowboys':'CF Cowboys','CTC Crusaders':'CTC','Bone Crushers':'Bone Crush'};
  function teamShort(tm){
    var base=(tm||'').replace(/\\s*·.*$/,'').trim(), tail=(tm||'').slice(base.length);
    return (TEAMSHORT[base]||base)+tail;
  }

  var fh=document.getElementById('fithost'); if(fh) fh.classList.add('tv2hide');
  var mr=document.getElementById('mroot'); if(mr) mr.classList.add('tv2hide');

  var host=document.createElement('div'); host.id='tv2host';
  host.innerHTML='<i class="tv2track"></i><i class="tv2prog" id="tv2prog"></i><div id="tv2board"></div>';
  document.body.appendChild(host);
  var board=document.getElementById('tv2board'), prog=document.getElementById('tv2prog');

  // Two independent sort orders — each screen is ranked by the thing it shows.
  var BY_PIPE = D.slice().sort(function(a,b){ return (b[2]-a[2]) || (b[7]-a[7]); });
  var BY_TOTAL= D.slice().sort(function(a,b){ return (b[7]-a[7]) || (b[4]-a[4]); });
  var SPLIT = Math.ceil(D.length/2);   // 40 AEs -> 20 left, 20 right

  // ---- header facts (mirrors the desktop header) ----
  var HOLIDAYS=new Set(['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-12-25','2027-01-01','2027-01-18','2027-02-15','2027-05-31','2027-06-18','2027-07-05','2027-09-06','2027-10-11','2027-11-11','2027-11-25','2027-12-24','2027-12-31']);
  var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function fdays(s,e){var n=0,d=new Date(s);while(d<=e){var w=d.getDay();if(w>=1&&w<=5&&!HOLIDAYS.has(ymd(d)))n++;d.setDate(d.getDate()+1);}return n;}
  var now=new Date(new Date().toLocaleString('en-US',{timeZone:'America/Phoenix'}));
  var y=now.getFullYear(), m=now.getMonth();
  var first=new Date(y,m,1), last=new Date(y,m+1,0), today=new Date(y,m,now.getDate());
  var pastWire=(now.getHours()+now.getMinutes()/60)>=15;
  var total=fdays(first,last), elapsed=fdays(first,today);
  // Days left counts from tomorrow once the wire cutoff has passed, so
  // elapsed + remaining === total on every day of the month.
  var remaining=total-elapsed+(pastWire?0:1);
  if(remaining<0) remaining=0;

  // ---- CD / rescission deadlines (same table and rules as the desktop board) ----
  var DEADLINES={
    '2026-07': { cd:'2026-07-23', resc:'2026-07-27' },
    '2026-08': { cd:'2026-08-22', resc:'2026-08-26' },
    '2026-09': { cd:'2026-09-22', resc:'2026-09-25' },
    '2026-10': { cd:'2026-10-23', resc:'2026-10-27' },
    '2026-11': { cd:'2026-11-20', resc:'2026-11-24' },
    '2026-12': { cd:'2026-12-22', resc:'2026-12-26' }
  };
  var _dl=DEADLINES[y+'-'+String(m+1).padStart(2,'0')]||{};
  function dlDate(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function dlDays(s){ return Math.round((dlDate(s)-today)/86400000); }
  function dlChip(lbl,cls,s){
    if(!s) return '';
    var n=dlDays(s); if(n<0) return '';                       // drops off once it passes
    var when = n===0 ? 'today' : n===1 ? 'tomorrow' : 'in '+n+' days';
    var d=dlDate(s), txt=MONTHS[d.getMonth()].slice(0,3)+' '+d.getDate();
    return '<div class="d '+cls+'"><div class="k">'+lbl+'</div>'
      +'<div class="v tnum'+(n===0?' now':'')+'">'+(n===0?'TODAY':txt)+'</div>'
      +'<div class="s">'+(n===0?txt:when)+'</div></div>';
  }
  var dlBlock=dlChip('CD DEADLINE','cd',_dl.cd)+dlChip('RESCISSION','rs',_dl.resc);
  dlBlock = dlBlock ? '<div class="tv2dl">'+dlBlock+'</div>' : '';

  // ---- goal math (same rules as the desktop board) ----
  var metCount=0, goalDenom=0, subsToday=0;
  D.forEach(function(r){
    var n=r[0], td=TODAY[n]||[0,0,0], tixN=TIX[n]||0;
    var isDash=!!DASH[n], isEx=!!EXEMPT[n];
    if(!isDash) subsToday+=td[2];
    var met=(!isDash)&&((!CALLS_PENDING&&td[0]>=CALLS_GOAL)||(!CALLS_PENDING&&td[1]>=TALK_GOAL)||td[2]>=SUB_GOAL||(!TIX_PENDING&&tixN>=TIX_GOAL));
    if(!isDash&&!isEx){ goalDenom++; if(met) metCount++; }
  });
  var goalPct=Math.round(metCount/(goalDenom||1)*100);
  var pipeActual=(K.pipeline||0)-(K.pipeSoft||0);
  var fundedPct=(K.goalElig||0)/GOAL*100, pacePct=total?elapsed/total*100:0;
  var mtdTotal=D.reduce(function(a,r){return a+(MTD[r[0]]||0);},0);

  // ---- KPI tiles ----
  // Only the two tiles that match the two column groups below are shown, and
  // every tile is built from the same four parts so the band reads as one row:
  //   label + pill  /  one big number  /  progress bar  /  three small stats.
  function tile(cls, label, pill, big, bigColor, barPct, barColor, markPct, stats){
    var h='<div class="card '+cls+'"><div class="krow"><span class="kl">'+label+'</span>'+(pill||'')+'</div>'
      +'<div class="kb tnum" style="color:'+bigColor+'">'+big+'</div>'
      +'<div class="tv2bar"><i style="width:'+Math.max(0,Math.min(100,barPct)).toFixed(1)+'%;background:'+barColor+'"></i>'
      +(markPct==null?'':'<span class="mk" style="left:'+Math.max(0,Math.min(100,markPct)).toFixed(1)+'%"></span>')+'</div>'
      +'<div class="tv2split">';
    stats.forEach(function(s,i){
      h+='<div class="h'+(i===stats.length-1?' r':'')+'"><div class="k">'+s[0]+'</div>'
        +'<div class="v tnum" style="color:'+bigColor+'">'+s[1]+'</div></div>';
    });
    return h+'</div></div>';
  }
  function tileGoal(){
    return tile('k-violet', 'TODAY&rsquo;S GOAL',
      '<span class="pill subs">'+subsToday+' sub'+(subsToday===1?'':'s')+' today</span>',
      goalPct+'%', '#4b2fa8', goalPct, '#6b4fbb', null,
      [['AES HIT', metCount+' / '+goalDenom],
       ['SUBS TODAY', String(subsToday)],
       ['TIX TODAY', TIX_PENDING?'&ndash;':String(B.tixTotal||0)],
       ['STILL TO GO', Math.max(0,goalDenom-metCount)+' AES']]);
  }
  function tilePipe(){
    var pct=pipeActual/PIPE_GOAL*100;
    return tile('k-blue', 'SALES TEAM PIPELINE',
      '<span class="pill mtd">'+mtdTotal+' MTD subs</span>',
      mM(pipeActual)+(K.pipeSoft?' <span class="sub">+ '+mM(K.pipeSoft)+' soft</span>':''), '#1f4fa8',
      pct, '#2a5bbf', null,
      [['LOCKED', mM(K.pipeLocked||0)],
       ['NOT LOCKED', mM(K.pipeUnlocked||0)],
       ['AVG PER AE', mK(pipeActual/(D.length||1))],
       ['OF $300M GOAL', pct.toFixed(1)+'%']]);
  }
  function tileFunded(){
    var behind=fundedPct<pacePct;
    return tile('k-green', 'FUNDED PRODUCTION',
      '<span class="pill '+(behind?'behind':'ahead')+'">'+(behind?'BEHIND PACE':'ON PACE')+'</span>',
      mM(K.funded||0)+' <span class="sub">&middot; '+(K.fundedUnits||0)+' units</span>', '#146c37',
      fundedPct, '#1a9e4e', pacePct,
      [['AVG FUNDED', mK((K.funded||0)/(K.fundedUnits||1))],
       ['OF $'+Math.round(GOAL/1e6)+'M GOAL', fundedPct.toFixed(1)+'%'],
       ['FUNDING DAY', elapsed+' of '+total],
       ['DAYS LEFT', String(remaining)]]);
  }
  function tileDeck(){
    // Headline is CTC+ itself — the loans actually sitting on the runway.
    // The bar runs against the same $100M goal as FUNDED PRODUCTION beside it,
    // so the two tiles are on one scale and each bar matches its own number.
    var ctc=K.ctc||0, combo=K.fundedCtc||0;
    return tile('k-amber', 'ON DECK',
      '<span class="pill mtd">'+((K.fundedUnits||0)+(K.ctcUnits||0))+' units total</span>',
      mM(ctc)+' <span class="sub">&middot; '+(K.ctcUnits||0)+' units</span>', '#b06a00',
      ctc/GOAL*100, '#e0a017', null,
      [['AVG CTC+', mK(ctc/(K.ctcUnits||1))],
       ['FUNDED + CTC+', mM(combo)],
       ['OF $'+Math.round(GOAL/1e6)+'M GOAL', (combo/GOAL*100).toFixed(1)+'%'],
       ['STILL NEEDED', mM(Math.max(0,GOAL-combo))]]);
  }

  // ---- roster columns ----
  // S1 — TODAY + ACTIVITY & PIPELINE, ranked by pipeline size.
  function colS1(rows, startRank){
    var h='<table class="tv2t"><colgroup>'
      +'<col style="width:241px"><col style="width:4px">'
      +'<col style="width:53px"><col style="width:51px"><col style="width:32px"><col style="width:38px"><col style="width:47px"><col style="width:4px">'
      +'<col style="width:41px"><col style="width:124px"><col style="width:105px"><col style="width:91px"><col style="width:91px"></colgroup>';
    h+='<tr><th class="l"></th><th class="sp"></th><th class="gh gh0" colspan="5">TODAY</th><th class="sp"></th><th class="gh gh1" colspan="5">ACTIVITY &amp; PIPELINE</th></tr>';
    h+='<tr><th class="l">AE</th><th class="sp"></th><th>CALLS</th><th>TALK</th><th>TIX</th><th>SUB</th><th>GOAL</th><th class="sp"></th>'
      +'<th>MTD</th><th>PIPELINE</th><th>UNLOCKED</th><th>30-59D</th><th>60D+</th></tr>';
    rows.forEach(function(r,i){
      var rank=startRank+i;
      var n=r[0],tm=r[1],pipe=r[2],pipeUn=r[9]||0,b30=r[10]||0,b60=r[11]||0;
      var td=TODAY[n]||[0,0,0], tixN=TIX[n]||0;
      var isDash=!!DASH[n];
      var cHit=!isDash&&!CALLS_PENDING&&td[0]>=CALLS_GOAL, tHit=!isDash&&!CALLS_PENDING&&td[1]>=TALK_GOAL;
      var sHit=!isDash&&td[2]>=SUB_GOAL, xHit=!isDash&&!TIX_PENDING&&tixN>=TIX_GOAL;
      var met=cHit||tHit||sHit||xHit;
      var dash='<span class="tv2dash">&ndash;</span>';
      var pk=pipe>=15e6?'t1':pipe>=10e6?'t2':pipe>=7.5e6?'t3':'t4';
      h+='<tr class="tv2row'+(i%2?' alt':'')+'">'
        +'<td class="l"><span class="tv2rank">'+rank+'</span><span class="tv2name">'+n+'</span></td><td class="sp"></td>'
        +'<td><span class="tv2v'+(cHit?' tv2hit':'')+'">'+((isDash||CALLS_PENDING)?dash:td[0])+'</span></td>'
        +'<td><span class="tv2v'+(tHit?' tv2hit':'')+'">'+((isDash||CALLS_PENDING)?dash:Math.round(td[1]))+'</span></td>'
        +'<td><span class="tv2v'+(xHit?' tv2hit':'')+'">'+((isDash||TIX_PENDING)?dash:tixN)+'</span></td>'
        +'<td><span class="tv2v'+(sHit?' tv2hit':'')+'">'+(isDash?dash:td[2])+'</span></td>'
        +'<td>'+(isDash?dash:'<span class="tv2chk'+(met?'':' empty')+'">&#10003;</span>')+'</td><td class="sp"></td>'
        +'<td><span class="tv2v">'+(MTD[n]||0)+'</span></td>'
        +'<td><span class="tv2pk '+pk+'">'+mM(pipe)+'</span></td>'
        +'<td><span class="tv2v'+(pipeUn?'':' z')+'">'+mM(pipeUn)+'</span></td>'
        +'<td><span class="tv2v'+(b30?' b30':' z')+'">'+mM(b30)+'</span></td>'
        +'<td><span class="tv2v'+(b60?' b60':' z')+'">'+mM(b60)+'</span></td></tr>';
    });
    return h+'</table>';
  }

  // S2 — FUNDED PRODUCTION + ON DECK, ranked by funded + CTC+ total.
  function colS2(rows, startRank){
    var h='<table class="tv2t"><colgroup>'
      +'<col style="width:240px"><col style="width:10px">'
      +'<col style="width:60px"><col style="width:230px"><col style="width:100px"><col style="width:10px">'
      +'<col style="width:60px"><col style="width:106px"><col style="width:106px"></colgroup>';
    h+='<tr><th class="l"></th><th class="sp"></th><th class="gh gh2" colspan="3">FUNDED PRODUCTION</th><th class="sp"></th><th class="gh gh3" colspan="3">ON DECK</th></tr>';
    h+='<tr><th class="l">AE</th><th class="sp"></th><th>UNITS</th><th>FUNDED / $3M</th><th>AVG</th><th class="sp"></th>'
      +'<th>UNITS</th><th>CTC+</th><th>TOTAL</th></tr>';
    rows.forEach(function(r,i){
      var rank=startRank+i;
      var n=r[0],tm=r[1],u=r[3],f=r[4],avg=r[5],ctc=r[6],tot=r[7],ctcU=r[8];
      var fp=Math.min(100,Math.round(f/3e6*100));
      var fcell = f>=3e6 ? '<span class="tv2circle">'+mM(f)+'</span>'
        : '<span class="tv2frow"><span class="tv2v">'+mM(f)+'</span><span class="tv2g5"><i style="width:'+fp+'%;background:'+mixAG(fp)+'"></i></span><span class="tv2g5p">'+fp+'%</span></span>';
      h+='<tr class="tv2row'+(i%2?' alt':'')+'">'
        +'<td class="l"><span class="tv2rank">'+rank+'</span><span class="tv2name">'+n+'</span></td><td class="sp"></td>'
        +'<td><span class="tv2v">'+u+'</span></td>'
        +'<td>'+fcell+'</td>'
        +'<td><span class="tv2v">'+mK(avg)+'</span></td><td class="sp"></td>'
        +'<td><span class="tv2v'+(ctcU?'':' z')+'">'+ctcU+'</span></td>'
        +'<td><span class="tv2v'+(ctc?'':' z')+'">'+mM(ctc)+'</span></td>'
        +'<td><span class="tv2v" style="color:#0f3d24">'+mM(tot)+'</span></td></tr>';
    });
    return h+'</table>';
  }

  var SCREENS=[
    {id:'s1', name:'TODAY &amp; PIPELINE',   sub:'RANKED BY PIPELINE SIZE',        data:BY_PIPE,  band:function(){return tileGoal()+tilePipe();},   col:colS1},
    {id:'s2', name:'FUNDED &amp; ON DECK',   sub:'RANKED BY FUNDED + CTC+ TOTAL',  data:BY_TOTAL, band:function(){return tileFunded()+tileDeck();}, col:colS2}
  ];
  if(PIN){ var f=SCREENS.filter(function(s){return s.id===PIN;}); if(f.length) SCREENS=f; }

  function draw(idx){
    var s=SCREENS[idx];
    var L=s.data.slice(0,SPLIT), R=s.data.slice(SPLIT);
    var dots=SCREENS.map(function(_,j){return '<i class="'+(j===idx?'on':'')+'"></i>';}).join('');
    var hdr='<div class="tv2hdr">'
      +'<div class="tv2id"><img class="tv2logo" src="/logo.png" alt="Oaktree Funding Corp">'
      +'<div class="tv2brand"><div class="t1">'+(B.title||'Sales Production')+'</div><div class="t2">'+MONTHS[m]+' '+y+'</div></div></div>'
      +'<div class="tv2days"><span class="n tnum">'+remaining+'</span><div><div class="dt">funding days left</div>'
      +'<div class="ds">of '+total+' in '+MONTHS[m]+(pastWire?' &middot; wire cut':'')+' &middot; upd '+(B.updatedLabel||'—')+' &middot; calls '+(B.callsUpdatedLabel||'—')+'</div></div></div>'
      + dlBlock
      +'<div class="tv2sec"><div class="s1">'+s.name+'</div>'
      +'<div class="s2">'+s.sub+' &middot; '+D.length+' AES</div>'
      +'<div class="tv2dots">'+dots+'</div></div></div>';
    board.innerHTML = hdr
      + '<div class="tv2band">'+s.band()+'</div>'
      + '<div class="tv2grid"><div class="tv2col">'+s.col(L,1)+'</div><div class="tv2col">'+s.col(R,SPLIT+1)+'</div></div>';

    // size rows to exactly fill the space left under the tiles
    var grid=board.querySelector('.tv2grid'), tb=grid.querySelector('table.tv2t');
    var hdrH=tb.rows[0].offsetHeight+tb.rows[1].offsetHeight;
    var nRows=Math.max(L.length,R.length);
    if(nRows>0){
      var rh=Math.floor((grid.clientHeight-hdrH-2)/nRows);
      board.style.setProperty('--tv2rh', Math.max(22,Math.min(46,rh))+'px');
    }
    if(SCREENS.length>1){
      prog.style.transition='none'; prog.style.width='0';
      void prog.offsetWidth;
      prog.style.transition='width '+(DWELL/1000)+'s linear'; prog.style.width='100%';
    }
    fit();
  }

  function fit(){
    var sx=window.innerWidth/1920, sy=window.innerHeight/1080, s=Math.min(sx,sy);
    board.style.transform='scale('+s+')';
    board.style.left=Math.max(0,(window.innerWidth-1920*s)/2)+'px';
    board.style.top=Math.max(0,(window.innerHeight-1080*s)/2)+'px';
  }
  window.addEventListener('resize',fit);

  var idx=0; draw(0);
  if(SCREENS.length>1) setInterval(function(){ idx=(idx+1)%SCREENS.length; draw(idx); }, DWELL);
})();
`;
